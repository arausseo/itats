"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  CANDIDATE_STATUSES,
  type CandidateStatus,
} from "@/src/types/candidate";
import { updateCandidateStatus } from "@/src/lib/update-candidate-status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  nuevo: "text-sky-700 dark:text-sky-300",
  en_proceso: "text-amber-700 dark:text-amber-300",
  en_espera: "text-violet-700 dark:text-violet-300",
  rechazado: "text-rose-700 dark:text-rose-300",
  contratado: "text-emerald-700 dark:text-emerald-300",
};

type Props = {
  candidateId: string;
  currentStatus: CandidateStatus;
};

export function CandidateStatusSelect({ candidateId, currentStatus }: Props) {
  const t = useTranslations("candidateStatus");
  const [status, setStatus] = useState<CandidateStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    if (!CANDIDATE_STATUSES.includes(value as CandidateStatus)) return;
    const next = value as CandidateStatus;
    const prev = status;
    setStatus(next);
    setError(null);

    startTransition(async () => {
      const result = await updateCandidateStatus(candidateId, next);
      if (!result.ok) {
        setStatus(prev);
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Select value={status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className={cn(
            "h-7 w-auto min-w-[9rem] border-dashed text-xs font-medium",
            STATUS_STYLES[status],
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CANDIDATE_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {t(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-[0.625rem] text-destructive">{error}</p> : null}
    </div>
  );
}
