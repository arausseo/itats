import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { CvProcessingItem, CvProcessingOutcome } from "@/src/types/upload";

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

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

async function fetchPrompt(name: string): Promise<string> {
  cvLog(`Prompt: cargando "${name}"`);
  const { data, error } = await getServiceClient()
    .from("prompts")
    .select("content")
    .eq("name", name)
    .single<{ content: string }>();
  if (error || !data) throw new Error(`Prompt "${name}" no encontrado`);
  cvLog(`Prompt: listo "${name}"`, {
    contentChars: data.content.length,
  });
  return data.content;
}

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

async function extractMarkdownFromPdf(
  pdfBytes: Uint8Array,
  summaryPrompt: string,
): Promise<string> {
  const t0 = performance.now();
  cvLog("Gemini: extrayendo markdown del PDF", {
    model: GEMINI_TEXT_MODEL,
    pdfBytes: pdfBytes.length,
    summaryPromptChars: summaryPrompt.length,
  });
  const ai = new GoogleGenAI({ apiKey: getEnv("GEMINI_API_KEY") });
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
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
          { text: summaryPrompt },
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

async function generateEmbedding(text: string): Promise<number[]> {
  const t0 = performance.now();
  cvLog("OpenAI: generando embedding", {
    inputChars: text.length,
    model: "text-embedding-3-small",
  });
  const openai = new OpenAI({ apiKey: getEnv("OPENAI_API_KEY") });
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  const dim = result.data[0].embedding.length;
  cvLog("OpenAI: embedding listo", {
    dimensions: dim,
    ms: Math.round(performance.now() - t0),
  });
  return result.data[0].embedding;
}

async function generateCandidateJson(
  markdown: string,
  jsonPrompt: string,
): Promise<unknown> {
  const t0 = performance.now();
  cvLog("Gemini: generando JSON de candidato", {
    model: GEMINI_TEXT_MODEL,
    markdownChars: markdown.length,
    jsonPromptChars: jsonPrompt.length,
  });
  const ai = new GoogleGenAI({ apiKey: getEnv("GEMINI_API_KEY") });
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `${jsonPrompt}${markdown}` }],
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

async function callProcessCandidateEdgeFunction(
  payload: unknown,
  storagePath: string,
  embedding: number[],
): Promise<
  { kind: "inserted" } | { kind: "duplicate"; message: string }
> {
  const url = `${getEnv("NEXT_PUBLIC_SUPABASE_URL")}/functions/v1/process-candidate`;
  cvLog("Edge: llamando process-candidate", {
    storagePath,
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
    },
    body: JSON.stringify({
      ...(payload as Record<string, unknown>),
      cv_storage_path: storagePath,
      embedding,
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

export async function runCvPipeline({
  storagePath,
}: CvProcessingItem): Promise<CvProcessingOutcome> {
  const pipelineT0 = performance.now();
  try {
    cvLog("Pipeline: inicio", { storagePath });
    const [pdfBytes, summaryPrompt, jsonPrompt] = await Promise.all([
      downloadPdfBytes(storagePath),
      fetchPrompt("cv_summary"),
      fetchPrompt("candidate_json"),
    ]);
    cvLog("Pipeline: recursos iniciales listos (paralelo)", {
      pdfBytes: pdfBytes.length,
      summaryPromptChars: summaryPrompt.length,
      jsonPromptChars: jsonPrompt.length,
      ms: Math.round(performance.now() - pipelineT0),
    });

    const markdown = await extractMarkdownFromPdf(pdfBytes, summaryPrompt);
    const embedding = await generateEmbedding(markdown);
    const candidatePayload = await generateCandidateJson(markdown, jsonPrompt);
    const edge = await callProcessCandidateEdgeFunction(
      candidatePayload,
      storagePath,
      embedding,
    );
    cvLog("Pipeline: completado", {
      storagePath,
      totalMs: Math.round(performance.now() - pipelineT0),
      edge: edge.kind,
    });
    if (edge.kind === "duplicate") {
      return {
        storagePath,
        status: "duplicado",
        message: edge.message,
      };
    }
    return { storagePath, status: "completado" };
  } catch (err) {
    console.error(`[cv-processor] Error procesando ${storagePath}:`, err);
    const message =
      err instanceof Error ? err.message : "Error desconocido al procesar el CV";
    return { storagePath, status: "error", error: message };
  }
}
