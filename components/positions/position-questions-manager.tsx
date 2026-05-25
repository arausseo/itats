"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createPositionQuestion,
  deletePositionQuestion,
  updatePositionQuestion,
} from "@/src/lib/position-questions-actions";
import {
  POSITION_QUESTION_TYPES,
  type PositionQuestion,
  type PositionQuestionType,
} from "@/src/types/position-question";

interface Props {
  positionId: string;
  initialQuestions: PositionQuestion[];
}

export function PositionQuestionsManager({ positionId, initialQuestions }: Props) {
  const t = useTranslations("positionQuestions");
  const [questions, setQuestions] = useState<PositionQuestion[]>(initialQuestions);
  const [isPending, startTransition] = useTransition();

  // Borrador del nuevo
  const [draftText, setDraftText] = useState("");
  const [draftType, setDraftType] = useState<PositionQuestionType>("text");
  const [draftRequired, setDraftRequired] = useState(false);

  function typeLabel(type: PositionQuestionType): string {
    return t(`type.${type}`);
  }

  function handleAdd() {
    const text = draftText.trim();
    if (!text) {
      toast.error(t("emptyTextError"));
      return;
    }

    startTransition(async () => {
      const result = await createPositionQuestion(positionId, {
        question_text: text,
        question_type: draftType,
        required: draftRequired,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Optimistic: appending a synthetic question; el revalidatePath del server
      // refrescará el estado real en la próxima navegación.
      const optimistic: PositionQuestion = {
        id: crypto.randomUUID(),
        position_id: positionId,
        question_text: text,
        question_type: draftType,
        required: draftRequired,
        order_index: questions.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setQuestions((q) => [...q, optimistic]);
      setDraftText("");
      setDraftType("text");
      setDraftRequired(false);
      toast.success(t("addedSuccess"));
    });
  }

  function handleUpdate(questionId: string, patch: Partial<PositionQuestion>) {
    startTransition(async () => {
      const result = await updatePositionQuestion(questionId, positionId, {
        question_text: patch.question_text,
        question_type: patch.question_type,
        required: patch.required,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQuestions((qs) =>
        qs.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      );
    });
  }

  function handleDelete(questionId: string) {
    startTransition(async () => {
      const result = await deletePositionQuestion(questionId, positionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQuestions((qs) => qs.filter((q) => q.id !== questionId));
      toast.success(t("deletedSuccess"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Lista de preguntas existentes */}
      {questions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-start"
            >
              <div className="flex-1">
                <Input
                  defaultValue={q.question_text}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== q.question_text) {
                      handleUpdate(q.id, { question_text: v });
                    }
                  }}
                  className="font-medium"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Select
                    value={q.question_type}
                    onValueChange={(v) =>
                      handleUpdate(q.id, { question_type: v as PositionQuestionType })
                    }
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_QUESTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {typeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <Checkbox
                      checked={q.required}
                      onCheckedChange={(checked) =>
                        handleUpdate(q.id, { required: checked === true })
                      }
                    />
                    {t("required")}
                  </label>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(q.id)}
                disabled={isPending}
              >
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario para agregar nueva */}
      <div className="rounded-lg border border-dashed border-border/70 p-3">
        <p className="mb-2 text-xs font-medium text-foreground">{t("addNew")}</p>
        <div className="flex flex-col gap-2">
          <Input
            placeholder={t("textPlaceholder")}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={draftType}
              onValueChange={(v) => setDraftType(v as PositionQuestionType)}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_QUESTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <Checkbox
                checked={draftRequired}
                onCheckedChange={(checked) => setDraftRequired(checked === true)}
              />
              {t("required")}
            </label>
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={handleAdd}
              disabled={isPending}
            >
              {t("add")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
