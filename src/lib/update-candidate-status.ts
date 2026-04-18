"use server";

import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import {
  CANDIDATE_STATUSES,
  type CandidateStatus,
} from "@/src/types/candidate";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function updateCandidateStatus(
  id: string,
  status: CandidateStatus,
): Promise<{ ok: true; status: CandidateStatus } | { ok: false; error: string }> {
  const te = await getTranslations("errors");

  if (!id) {
    return { ok: false, error: te("candidateIdRequired") };
  }
  if (!CANDIDATE_STATUSES.includes(status)) {
    return { ok: false, error: te("invalidStatus") };
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("candidates")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }
    if (!data) {
      return { ok: false, error: te("candidateNotFound") };
    }

    return { ok: true, status: data.status as CandidateStatus };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}
