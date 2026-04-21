"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";

// --- Types ---
export interface CandidateNote {
  id: string;
  candidate_id: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

// --- Get Notes ---
export async function getCandidateNotes(
  candidateId: string
): Promise<{ ok: true; notes: CandidateNote[] } | { ok: false; error: string }> {
  const te = await getTranslations("errors");

  if (!candidateId) {
    return { ok: false, error: te("candidateIdRequired") };
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
      .from("candidate_notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, notes: (data ?? []) as CandidateNote[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}

// --- Add Note ---
export async function addCandidateNote(
  candidateId: string,
  content: string,
  authorName?: string
): Promise<{ ok: true; note: CandidateNote } | { ok: false; error: string }> {
  const te = await getTranslations("errors");

  if (!candidateId) {
    return { ok: false, error: te("candidateIdRequired") };
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { ok: false, error: te("noteContentRequired") };
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
      .from("candidate_notes")
      .insert({
        candidate_id: candidateId,
        content: trimmedContent,
        author_name: authorName?.trim() || user.email || "Reclutador",
      })
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, note: data as CandidateNote };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}

// --- Delete Note ---
export async function deleteCandidateNote(
  noteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const te = await getTranslations("errors");

  if (!noteId) {
    return { ok: false, error: te("noteIdRequired") };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: te("unauthorized") };
    }

    const { error } = await supabase
      .from("candidate_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}

// --- Delete Candidate ---
export async function deleteCandidate(
  candidateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const te = await getTranslations("errors");

  if (!candidateId) {
    return { ok: false, error: te("candidateIdRequired") };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: te("unauthorized") };
    }

    // First delete from position_candidates (if exists)
    await supabase
      .from("position_candidates")
      .delete()
      .eq("candidate_id", candidateId);

    // Then delete the candidate (notes will cascade)
    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}

// --- Get Candidate Status History (for future use) ---
export async function getCandidateStatusHistory(
  candidateId: string
): Promise<
  | { ok: true; history: { status: string; changed_at: string }[] }
  | { ok: false; error: string }
> {
  const te = await getTranslations("errors");

  if (!candidateId) {
    return { ok: false, error: te("candidateIdRequired") };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: te("unauthorized") };
    }

    // For now, return empty history - can be enhanced with a status_history table
    return { ok: true, history: [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : te("unexpected") };
  }
}
