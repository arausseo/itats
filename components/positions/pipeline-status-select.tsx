"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { Icon } from "@/components/app/icon";
import { updatePipelineStatus } from "@/src/lib/positions-actions";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/src/types/position";
import { STAGE_COLOR } from "@/src/lib/pipeline-stage-colors";

interface PipelineStatusSelectProps {
  positionCandidateId: string;
  currentStatus: PipelineStatus;
}

/** Pill de status tintada por el color del stage (designV2 `.stsel`). */
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

  const color = STAGE_COLOR[optimisticStatus];

  return (
    <div
      className="stsel"
      style={{
        background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="d" style={{ background: color }} />
      <select
        value={optimisticStatus}
        onChange={(e) => handleChange(e.target.value)}
        style={{ color }}
        aria-label={t("colStatus")}
      >
        {PIPELINE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`pipelineStatus.${s.replace(/ /g, "_")}`)}
          </option>
        ))}
      </select>
      <Icon name="chevDown" size={13} style={{ color }} />
    </div>
  );
}
