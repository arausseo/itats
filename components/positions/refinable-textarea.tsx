"use client";

import { useState, useTransition, useId } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { refinePositionField } from "@/src/lib/positions-actions";
import { POSITION_FIELD_LIMITS } from "@/src/lib/position-config";

interface RefinableTextareaProps {
  name: string;
  field: "description" | "requirements";
  label: string;
  placeholder?: string;
  defaultValue?: string | null;
  rows?: number;
  positionTitle: string;
}

export function RefinableTextarea({
  name,
  field,
  label,
  placeholder,
  defaultValue,
  rows = 6,
  positionTitle,
}: RefinableTextareaProps) {
  const t = useTranslations("positions");
  const id = useId();
  const limits = POSITION_FIELD_LIMITS[field];

  const [value, setValue] = useState(defaultValue ?? "");
  const [refineError, setRefineError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Validation
  const length = value.trim().length;
  const tooShort = length > 0 && length < limits.min;
  const tooLong = length > limits.max;

  const minKey = field === "description" ? "fieldDescriptionMin" : "fieldRequirementsMin";
  const maxKey = field === "description" ? "fieldDescriptionMax" : "fieldRequirementsMax";

  function handleRefine() {
    if (!value.trim()) return;
    setRefineError(null);
    startTransition(async () => {
      const result = await refinePositionField(field, value, positionTitle || "Sin título");
      if (result.ok) {
        setValue(result.text);
      } else {
        setRefineError(result.error);
      }
    });
  }

  return (
    <div>
      {/* Label + botón AI */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-medium text-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={handleRefine}
          disabled={isPending || !value.trim()}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {isPending ? (
            <>
              <Spinner className="h-3 w-3" />
              {t("refining")}
            </>
          ) : (
            <>
              <span aria-hidden>✨</span>
              {t("refineWithAI")}
            </>
          )}
        </button>
      </div>

      {/* Textarea */}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setRefineError(null);
        }}
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-md border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          tooShort || tooLong
            ? "border-destructive focus:ring-destructive/40"
            : "border-input",
          isPending && "opacity-60",
        )}
        disabled={isPending}
      />

      {/* Contador de caracteres + errores de validación */}
      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="text-xs">
          {tooShort && (
            <p className="text-destructive">{t(minKey)}</p>
          )}
          {tooLong && (
            <p className="text-destructive">{t(maxKey)}</p>
          )}
          {refineError && (
            <p className="text-destructive">{refineError}</p>
          )}
        </div>
        <p
          className={cn(
            "shrink-0 tabular-nums text-xs text-muted-foreground",
            tooLong && "text-destructive font-medium",
          )}
        >
          {length} / {limits.max}
        </p>
      </div>
    </div>
  );
}
