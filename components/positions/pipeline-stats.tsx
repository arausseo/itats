"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PositionCandidateWithCandidate, PipelineStatus } from "@/src/types/position";

const STATUS_ORDER: PipelineStatus[] = [
  "Sourced",
  "To_Contact",
  "Screening",
  "Tech_Assessment",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const STATUS_COLORS: Record<PipelineStatus, string> = {
  Sourced: "bg-slate-400",
  To_Contact: "bg-amber-400",
  Screening: "bg-sky-400",
  Tech_Assessment: "bg-indigo-400",
  Interview: "bg-purple-400",
  Offer: "bg-emerald-400",
  Hired: "bg-green-500",
  Rejected: "bg-red-400",
};

interface PipelineStatsProps {
  candidates: PositionCandidateWithCandidate[];
  className?: string;
}

export function PipelineStats({ candidates, className }: PipelineStatsProps) {
  const t = useTranslations("positions");

  // Count candidates per status
  const counts = candidates.reduce(
    (acc, pc) => {
      acc[pc.pipeline_status] = (acc[pc.pipeline_status] || 0) + 1;
      return acc;
    },
    {} as Record<PipelineStatus, number>,
  );

  const total = candidates.length;

  // Filter to only show statuses that have candidates
  const activeStatuses = STATUS_ORDER.filter((s) => counts[s] > 0);

  if (total === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Summary bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {activeStatuses.map((status) => {
          const count = counts[status] || 0;
          const pct = (count / total) * 100;
          return (
            <div
              key={status}
              className={cn("transition-all", STATUS_COLORS[status])}
              style={{ width: `${pct}%` }}
              title={`${t(`pipelineStatus.${status}`)}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {activeStatuses.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLORS[status])} />
            <span className="text-xs text-muted-foreground">
              {t(`pipelineStatus.${status}`)} ({counts[status]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
