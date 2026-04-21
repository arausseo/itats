"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd01Icon,
  Clock01Icon,
  PauseIcon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
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

// Status styles with colors
const STATUS_STYLES: Record<CandidateStatus, string> = {
  nuevo: "text-sky-700 dark:text-sky-300",
  en_proceso: "text-amber-700 dark:text-amber-300",
  en_espera: "text-violet-700 dark:text-violet-300",
  rechazado: "text-rose-700 dark:text-rose-300",
  contratado: "text-emerald-700 dark:text-emerald-300",
};

// Status icons mapping
const STATUS_ICONS: Record<CandidateStatus, React.ComponentType<{ className?: string }>> = {
  nuevo: UserAdd01Icon,
  en_proceso: Clock01Icon,
  en_espera: PauseIcon,
  rechazado: Cancel01Icon,
  contratado: Tick02Icon,
};

type Props = {
  candidateId: string;
  currentStatus: CandidateStatus;
  /** Compact mode for header display */
  compact?: boolean;
};

export function CandidateStatusSelect({ candidateId, currentStatus, compact = false }: Props) {
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

  const StatusIcon = STATUS_ICONS[status];

  return (
    <div className="flex flex-col gap-1">
      <Select value={status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className={cn(
            "border-dashed font-medium",
            compact ? "h-7 w-auto min-w-[8rem] gap-1.5 text-xs" : "h-8 w-auto min-w-[9rem] gap-2 text-xs",
            STATUS_STYLES[status],
          )}
        >
          <HugeiconsIcon
            icon={StatusIcon}
            className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
            strokeWidth={2}
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CANDIDATE_STATUSES.map((s) => {
            const Icon = STATUS_ICONS[s];
            return (
              <SelectItem key={s} value={s} className="text-xs">
                <span className={cn("flex items-center gap-2", STATUS_STYLES[s])}>
                  <HugeiconsIcon icon={Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                  {t(s)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error ? <p className="text-[0.625rem] text-destructive">{error}</p> : null}
    </div>
  );
}

// Export status icon component for use elsewhere
export function CandidateStatusIcon({
  status,
  className,
}: {
  status: CandidateStatus;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  return (
    <HugeiconsIcon
      icon={Icon}
      className={cn("h-4 w-4", STATUS_STYLES[status], className)}
      strokeWidth={2}
    />
  );
}
