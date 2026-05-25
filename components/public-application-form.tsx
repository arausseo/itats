"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_FILE_SIZE_BYTES } from "@/src/lib/upload-config";
import { submitPublicApplication } from "@/src/lib/public-application-actions";
import type { PositionQuestion } from "@/src/types/position-question";

interface Props {
  orgSlug: string;
  positionId: string;
  questions: PositionQuestion[];
}

type Phase = "idle" | "submitting" | "done";

export function PublicApplicationForm({ orgSlug, positionId, questions }: Props) {
  const t = useTranslations("publicApply");
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "submitting") return;

    setPhase("submitting");
    setGlobalError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await submitPublicApplication(orgSlug, positionId, formData);

    if (result.ok) {
      setPhase("done");
      formRef.current?.reset();
      setFileName(null);
      return;
    }

    setGlobalError(result.error);
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    setPhase("idle");
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center shadow-sm dark:border-green-900 dark:bg-green-950">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
          {t("successTitle")}
        </h2>
        <p className="mt-2 text-sm text-green-800 dark:text-green-200">
          {t("successBody")}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        {t("formTitle")}
      </h2>

      {/* CV upload */}
      <div className="mb-5">
        <label className="mb-1 block text-xs font-medium text-foreground">
          {t("cvLabel")} <span className="text-destructive">*</span>
        </label>
        <Input
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="h-9 cursor-pointer py-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("cvHint", { sizeMb: Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024)) })}
        </p>
        {fileName && (
          <p className="mt-1 text-xs text-foreground">{fileName}</p>
        )}
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <div className="mb-5 flex flex-col gap-4 border-t border-border/60 pt-5">
          {questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              error={fieldErrors[q.id]}
            />
          ))}
        </div>
      )}

      {globalError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {globalError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={phase === "submitting"}
      >
        {phase === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function QuestionField({
  question,
  error,
}: {
  question: PositionQuestion;
  error?: string;
}) {
  const t = useTranslations("publicApply");
  const name = `q:${question.id}`;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground">
        {question.question_text}{" "}
        {question.required && <span className="text-destructive">*</span>}
      </label>

      {question.question_type === "boolean" ? (
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value="true"
              required={question.required}
              className="size-3.5"
            />
            {t("yes")}
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value="false"
              required={question.required}
              className="size-3.5"
            />
            {t("no")}
          </label>
        </div>
      ) : question.question_type === "numeric" ? (
        <Input
          name={name}
          type="number"
          inputMode="decimal"
          step="any"
          required={question.required}
          aria-invalid={error ? "true" : undefined}
        />
      ) : (
        <textarea
          name={name}
          required={question.required}
          rows={3}
          aria-invalid={error ? "true" : undefined}
          className="w-full rounded-md border border-input bg-input/20 px-2 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30"
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
