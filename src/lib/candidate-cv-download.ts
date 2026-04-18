"use server";

import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
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
  const te = await getTranslations("errors");
  const id = candidateId.trim();
  if (!id) {
    return { ok: false, error: te("candidateIdRequired") };
  }

  try {
    const ssr = await createSsrClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user) {
      return { ok: false, error: te("unauthorized") };
    }

    const { data, error } = await ssr
      .from("candidates")
      .select("cv_storage_path")
      .eq("id", id)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: te("cvAccess"),
      };
    }

    const path = data.cv_storage_path;
    if (typeof path !== "string" || !path.trim()) {
      return {
        ok: false,
        error: te("noCvStored"),
      };
    }

    const svc = getServiceClient();
    const { data: signed, error: signError } = await svc.storage
      .from("resumes")
      .createSignedUrl(path.trim(), SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      return {
        ok: false,
        error: signError?.message ?? te("signUrlFailed"),
      };
    }

    return { ok: true, url: signed.signedUrl };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : te("signLinkUnexpected");
    return { ok: false, error: message };
  }
}
