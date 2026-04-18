"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import {
  CANDIDATE_STATUSES,
  type CandidateStatus,
} from "@/src/types/candidate";

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: te("unauthorized") };
    }

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
