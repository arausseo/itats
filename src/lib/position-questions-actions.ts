"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/utils/supabase/server";
import {
  parsePositionQuestionRows,
  type PositionQuestion,
  type PositionQuestionType,
  POSITION_QUESTION_TYPES,
} from "@/src/types/position-question";

export type SimpleResult =
  | { ok: true }
  | { ok: false; error: string };

function isQuestionType(v: unknown): v is PositionQuestionType {
  return typeof v === "string" && (POSITION_QUESTION_TYPES as readonly string[]).includes(v);
}

export async function getPositionQuestions(
  positionId: string,
): Promise<PositionQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("position_questions")
    .select("*")
    .eq("position_id", positionId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[position-questions] getPositionQuestions:", error.message);
    return [];
  }
  return parsePositionQuestionRows(data ?? []);
}

export async function createPositionQuestion(
  positionId: string,
  input: {
    question_text: string;
    question_type: string;
    required: boolean;
  },
): Promise<SimpleResult> {
  const text = input.question_text.trim();
  if (!text) return { ok: false, error: "El texto de la pregunta es obligatorio." };
  if (!isQuestionType(input.question_type)) {
    return { ok: false, error: "Tipo de pregunta inválido." };
  }

  const supabase = await createClient();

  // Calcular el siguiente order_index
  const { data: maxRow } = await supabase
    .from("position_questions")
    .select("order_index")
    .eq("position_id", positionId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();

  const nextOrder = (maxRow?.order_index ?? -1) + 1;

  const { error } = await supabase.from("position_questions").insert({
    position_id: positionId,
    question_text: text,
    question_type: input.question_type,
    required: input.required,
    order_index: nextOrder,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/positions/${positionId}`);
  return { ok: true };
}

export async function updatePositionQuestion(
  questionId: string,
  positionId: string,
  patch: {
    question_text?: string;
    question_type?: string;
    required?: boolean;
  },
): Promise<SimpleResult> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.question_text !== undefined) {
    const t = patch.question_text.trim();
    if (!t) return { ok: false, error: "El texto no puede quedar vacío." };
    update.question_text = t;
  }
  if (patch.question_type !== undefined) {
    if (!isQuestionType(patch.question_type)) {
      return { ok: false, error: "Tipo de pregunta inválido." };
    }
    update.question_type = patch.question_type;
  }
  if (patch.required !== undefined) {
    update.required = patch.required;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("position_questions")
    .update(update)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/positions/${positionId}`);
  return { ok: true };
}

export async function deletePositionQuestion(
  questionId: string,
  positionId: string,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("position_questions")
    .delete()
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/positions/${positionId}`);
  return { ok: true };
}
