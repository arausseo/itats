import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { CvProcessingItem, CvProcessingOutcome } from "@/src/types/upload";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PromptConfig {
  content: string;
  api: "gemini" | "openai";
  model: string;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function cvLog(message: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length > 0) {
    console.log(`[cv-processor] ${message}`, meta);
    return;
  }
  console.log(`[cv-processor] ${message}`);
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable de entorno faltante: ${name}`);
  return v;
}

function getServiceClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function getGemini() {
  return new GoogleGenAI({ apiKey: getEnv("GEMINI_API_KEY") });
}

function getOpenAI() {
  return new OpenAI({ apiKey: getEnv("OPENAI_API_KEY") });
}

// ---------------------------------------------------------------------------
// Lectura de prompts desde BD
// ---------------------------------------------------------------------------

async function fetchPromptConfig(name: string): Promise<PromptConfig> {
  cvLog(`Prompt: cargando "${name}"`);
  const { data, error } = await getServiceClient()
    .from("prompts")
    .select("content, api, model")
    .eq("name", name)
    .single<{ content: string; api: string; model: string }>();
  if (error || !data) throw new Error(`Prompt "${name}" no encontrado`);

  const api = data.api === "openai" ? "openai" : "gemini";
  cvLog(`Prompt: listo "${name}"`, {
    api,
    model: data.model,
    contentChars: data.content.length,
  });
  return { content: data.content, api, model: data.model };
}

// ---------------------------------------------------------------------------
// Descarga del PDF desde Storage
// ---------------------------------------------------------------------------

async function downloadPdfBytes(storagePath: string): Promise<Uint8Array> {
  cvLog("Storage: descargando PDF", { storagePath });
  const { data, error } = await getServiceClient()
    .storage.from("resumes")
    .download(storagePath);
  if (error || !data)
    throw new Error(`Error descargando PDF: ${error?.message}`);
  const bytes = new Uint8Array(await data.arrayBuffer());
  cvLog("Storage: PDF descargado", { storagePath, bytes: bytes.length });
  return bytes;
}

// ---------------------------------------------------------------------------
// Extracción PDF → Markdown
// ---------------------------------------------------------------------------

async function extractMarkdownFromPdf(
  pdfBytes: Uint8Array,
  config: PromptConfig,
): Promise<string> {
  const t0 = performance.now();

  if (config.api === "openai") {
    cvLog("OpenAI Responses: extrayendo markdown del PDF", {
      model: config.model,
      pdfBytes: pdfBytes.length,
      promptChars: config.content.length,
    });
    const openai = getOpenAI();
    const base64Pdf = Buffer.from(pdfBytes).toString("base64");
    const response = await openai.responses.create({
      model: config.model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: "resume.pdf",
              file_data: `data:application/pdf;base64,${base64Pdf}`,
            },
            { type: "input_text", text: config.content },
          ],
        },
      ],
    });
    const text = response.output_text?.trim();
    if (!text) throw new Error("OpenAI no devolvió texto para el resumen");
    cvLog("OpenAI Responses: markdown listo", {
      markdownChars: text.length,
      ms: Math.round(performance.now() - t0),
    });
    return text;
  }

  // Gemini (default)
  cvLog("Gemini: extrayendo markdown del PDF", {
    model: config.model,
    pdfBytes: pdfBytes.length,
    promptChars: config.content.length,
  });
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: config.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: Buffer.from(pdfBytes).toString("base64"),
            },
          },
          { text: config.content },
        ],
      },
    ],
  });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió texto para el resumen");
  cvLog("Gemini: markdown listo", {
    markdownChars: text.length,
    ms: Math.round(performance.now() - t0),
  });
  return text;
}

// ---------------------------------------------------------------------------
// Generación JSON estructurado desde Markdown
// ---------------------------------------------------------------------------

async function generateCandidateJson(
  markdown: string,
  config: PromptConfig,
): Promise<unknown> {
  const t0 = performance.now();

  if (config.api === "openai") {
    cvLog("OpenAI: generando JSON de candidato", {
      model: config.model,
      markdownChars: markdown.length,
      promptChars: config.content.length,
    });
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "user", content: `${config.content}${markdown}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI no devolvió JSON para el candidato");
    const parsed: unknown = JSON.parse(raw);
    const topKeys =
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed as Record<string, unknown>)
        : [];
    cvLog("OpenAI: JSON de candidato parseado", {
      rawChars: raw.length,
      topLevelKeys: topKeys,
      ms: Math.round(performance.now() - t0),
    });
    return parsed;
  }

  // Gemini (default)
  cvLog("Gemini: generando JSON de candidato", {
    model: config.model,
    markdownChars: markdown.length,
    promptChars: config.content.length,
  });
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: config.model,
    contents: [
      {
        role: "user",
        parts: [{ text: `${config.content}${markdown}` }],
      },
    ],
    config: { responseMimeType: "application/json" },
  });
  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini no devolvió JSON para el candidato");
  const parsed: unknown = JSON.parse(raw);
  const topKeys =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed as Record<string, unknown>)
      : [];
  cvLog("Gemini: JSON de candidato parseado", {
    rawChars: raw.length,
    topLevelKeys: topKeys,
    ms: Math.round(performance.now() - t0),
  });
  return parsed;
}

// ---------------------------------------------------------------------------
// Generación de embedding
// ---------------------------------------------------------------------------

async function generateEmbedding(
  text: string,
  config: PromptConfig,
): Promise<number[]> {
  const t0 = performance.now();

  if (config.api === "gemini") {
    cvLog("Gemini: generando embedding", {
      inputChars: text.length,
      model: config.model,
    });
    const ai = getGemini();
    const response = await ai.models.embedContent({
      model: config.model,
      contents: text,
    });
    const values = response.embeddings?.[0]?.values;
    if (!values?.length)
      throw new Error("Gemini no devolvió embedding");
    cvLog("Gemini: embedding listo", {
      dimensions: values.length,
      ms: Math.round(performance.now() - t0),
    });
    return values;
  }

  // OpenAI (default)
  cvLog("OpenAI: generando embedding", {
    inputChars: text.length,
    model: config.model,
  });
  const openai = getOpenAI();
  const result = await openai.embeddings.create({
    model: config.model,
    input: text,
  });
  const values = result.data[0].embedding;
  cvLog("OpenAI: embedding listo", {
    dimensions: values.length,
    ms: Math.round(performance.now() - t0),
  });
  return values;
}

// ---------------------------------------------------------------------------
// Llamada a la Edge Function process-candidate
// ---------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function callProcessCandidateEdgeFunction(
  payload: unknown,
  storagePath: string,
  embedding: number[],
  organizationId: string,
): Promise<{ kind: "inserted" } | { kind: "duplicate"; message: string }> {
  if (!UUID_RE.test(organizationId)) {
    throw new Error(
      `organizationId no es un UUID válido (¿perfil sin organization_id?): ${organizationId}`,
    );
  }
  const url = `${getEnv("NEXT_PUBLIC_SUPABASE_URL")}/functions/v1/process-candidate`;
  cvLog("Edge: llamando process-candidate", {
    storagePath,
    organizationId,
    embeddingDimensions: embedding.length,
    payloadKeys:
      payload !== null && typeof payload === "object" && !Array.isArray(payload)
        ? Object.keys(payload as Record<string, unknown>)
        : [],
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      "x-organization-id": organizationId,
    },
    body: JSON.stringify({
      ...(payload as Record<string, unknown>),
      cv_storage_path: storagePath,
      embedding,
      organization_id: organizationId,
    }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string };
  cvLog("Edge: respuesta process-candidate", {
    status: res.status,
    ok: json.ok,
    error: json.error,
  });
  if (res.status === 409) {
    const message =
      json.error?.trim() || "Ya existe un candidato con los mismos datos.";
    cvLog("Edge: duplicado (409), no se insertó fila", {
      storagePath,
      message,
    });
    return { kind: "duplicate", message };
  }
  if (!json.ok) {
    throw new Error(json.error ?? `Edge Function error: ${res.status}`);
  }
  return { kind: "inserted" };
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export async function runCvPipeline({
  storagePath,
  organizationId,
}: CvProcessingItem & { organizationId: string }): Promise<CvProcessingOutcome> {
  const pipelineT0 = performance.now();
  try {
    cvLog("Pipeline: inicio", { storagePath, organizationId });

    const [pdfBytes, summaryConfig, jsonConfig, embConfig] = await Promise.all([
      downloadPdfBytes(storagePath),
      fetchPromptConfig("cv_summary"),
      fetchPromptConfig("candidate_json"),
      fetchPromptConfig("embedding_config"),
    ]);

    cvLog("Pipeline: recursos iniciales listos (paralelo)", {
      pdfBytes: pdfBytes.length,
      summaryApi: summaryConfig.api,
      summaryModel: summaryConfig.model,
      jsonApi: jsonConfig.api,
      jsonModel: jsonConfig.model,
      embApi: embConfig.api,
      embModel: embConfig.model,
      ms: Math.round(performance.now() - pipelineT0),
    });

    const markdown = await extractMarkdownFromPdf(pdfBytes, summaryConfig);
    const embedding = await generateEmbedding(markdown, embConfig);
    const candidatePayload = await generateCandidateJson(markdown, jsonConfig);

    const edge = await callProcessCandidateEdgeFunction(
      candidatePayload,
      storagePath,
      embedding,
      organizationId,
    );

    cvLog("Pipeline: completado", {
      storagePath,
      totalMs: Math.round(performance.now() - pipelineT0),
      edge: edge.kind,
    });

    if (edge.kind === "duplicate") {
      return { storagePath, status: "duplicado", message: edge.message };
    }
    return { storagePath, status: "completado" };
  } catch (err) {
    console.error(`[cv-processor] Error procesando ${storagePath}:`, err);
    const message =
      err instanceof Error ? err.message : "Error desconocido al procesar el CV";
    return { storagePath, status: "error", error: message };
  }
}
