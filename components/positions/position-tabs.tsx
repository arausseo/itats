"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PipelineView } from "@/components/positions/pipeline-view";
import { AiSearchView } from "@/components/positions/ai-search-view";
import { PipelineStats } from "@/components/positions/pipeline-stats";
import type { Position, PositionCandidateWithCandidate } from "@/src/types/position";

type TabValue = "pipeline" | "search";

interface PositionTabsProps {
  position: Position;
  positionCandidates: PositionCandidateWithCandidate[];
  seniorityOptions: string[];
  defaultTab?: TabValue;
}

export function PositionTabs({
  position,
  positionCandidates,
  seniorityOptions,
  defaultTab = "pipeline",
}: PositionTabsProps) {
  const t = useTranslations("positions");
  const [tab, setTab] = useState<TabValue>(defaultTab);

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline Stats - always visible */}
      <PipelineStats candidates={positionCandidates} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("pipeline")}
          className={cn(
            "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "pipeline"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("tabPipeline")} ({positionCandidates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={cn(
            "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "search"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("tabSearch")}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {tab === "pipeline" ? (
          <PipelineView
            positionCandidates={positionCandidates}
            positionId={position.id}
            positionTitle={position.title}
          />
        ) : (
          <AiSearchView
            positionId={position.id}
            position={position}
            seniorityOptions={seniorityOptions}
          />
        )}
      </div>
    </div>
  );
}
