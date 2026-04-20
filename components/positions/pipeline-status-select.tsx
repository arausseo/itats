"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePipelineStatus } from "@/src/lib/positions-actions";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/src/types/position";

interface PipelineStatusSelectProps {
  positionCandidateId: string;
  currentStatus: PipelineStatus;
}

export function PipelineStatusSelect({
  positionCandidateId,
  currentStatus,
}: PipelineStatusSelectProps) {
  const t = useTranslations("positions");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);

  function handleChange(value: string) {
    if (!PIPELINE_STATUSES.includes(value as PipelineStatus)) return;
    const next = value as PipelineStatus;
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await updatePipelineStatus(positionCandidateId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  const statusColorMap: Record<PipelineStatus, string> = {
    Sourced: "text-slate-500",
    "To Contact": "text-blue-500",
    Screening: "text-indigo-500",
    "Tech Assessment": "text-violet-500",
    Interview: "text-amber-500",
    Offer: "text-emerald-500",
    Hired: "text-green-600",
    Rejected: "text-red-500",
  };

  return (
    <Select value={optimisticStatus} onValueChange={handleChange}>
      <SelectTrigger className={`h-7 w-40 text-xs ${statusColorMap[optimisticStatus]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PIPELINE_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className={`text-xs ${statusColorMap[s]}`}>
            {t(`pipelineStatus.${s.replace(/ /g, "_")}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
