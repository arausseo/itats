"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/src/utils/supabase/server";

const SIGNED_URL_TTL_SECONDS = 600;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Variables de entorno de Supabase faltantes");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type CvDownloadSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function getCvDownloadSignedUrl(
  candidateId: string,
): Promise<CvDownloadSignedUrlResult> {
  const id = candidateId.trim();
  if (!id) {
    return { ok: false, error: "ID de candidato requerido" };
  }

  try {
    const ssr = await createSsrClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user) {
      return { ok: false, error: "No autorizado" };
    }

    const { data, error } = await ssr
      .from("candidates")
      .select("cv_storage_path")
      .eq("id", id)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: "No se pudo obtener el CV o no tienes acceso.",
      };
    }

    const path = data.cv_storage_path;
    if (typeof path !== "string" || !path.trim()) {
      return {
        ok: false,
        error: "Este candidato no tiene CV almacenado",
      };
    }

    const svc = getServiceClient();
    const { data: signed, error: signError } = await svc.storage
      .from("resumes")
      .createSignedUrl(path.trim(), SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      return {
        ok: false,
        error: signError?.message ?? "No se pudo generar el enlace de descarga",
      };
    }

    return { ok: true, url: signed.signedUrl };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error inesperado al generar el enlace";
    return { ok: false, error: message };
  }
}
