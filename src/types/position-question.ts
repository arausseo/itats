export const POSITION_QUESTION_TYPES = ["boolean", "numeric", "text"] as const;
export type PositionQuestionType = (typeof POSITION_QUESTION_TYPES)[number];

export interface PositionQuestion {
  id: string;
  position_id: string;
  question_text: string;
  question_type: PositionQuestionType;
  required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export function isPositionQuestionType(v: unknown): v is PositionQuestionType {
  return (
    typeof v === "string" &&
    (POSITION_QUESTION_TYPES as readonly string[]).includes(v)
  );
}

export function parsePositionQuestionRow(row: unknown): PositionQuestion {
  if (!row || typeof row !== "object") {
    throw new Error("Invalid position_question row");
  }
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    position_id: String(r.position_id ?? ""),
    question_text: String(r.question_text ?? ""),
    question_type: isPositionQuestionType(r.question_type)
      ? r.question_type
      : "text",
    required: Boolean(r.required),
    order_index: typeof r.order_index === "number" ? r.order_index : 0,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function parsePositionQuestionRows(rows: unknown): PositionQuestion[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(parsePositionQuestionRow);
}
