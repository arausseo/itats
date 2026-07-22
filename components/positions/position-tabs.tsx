"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PipelineView } from "@/components/positions/pipeline-view";
import { AiSearchView } from "@/components/positions/ai-search-view";
import { PipelineStats } from "@/components/positions/pipeline-stats";
import { PositionQuestionsManager } from "@/components/positions/position-questions-manager";
import { PublicLinkCard } from "@/components/positions/public-link-card";
import type { Position, PositionCandidateWithCandidate } from "@/src/types/position";
import type { PositionQuestion } from "@/src/types/position-question";

type TabValue = "pipeline" | "search" | "questions";

interface PositionTabsProps {
  position: Position;
  positionCandidates: PositionCandidateWithCandidate[];
  seniorityOptions: string[];
  questions: PositionQuestion[];
  orgSlug: string | null;
  defaultTab?: TabValue;
}

export function PositionTabs({
  position,
  positionCandidates,
  seniorityOptions,
  questions,
  orgSlug,
  defaultTab = "pipeline",
}: PositionTabsProps) {
  const t = useTranslations("positions");
  const [tab, setTab] = useState<TabValue>(defaultTab);

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline Stats - always visible */}
      <PipelineStats candidates={positionCandidates} />

      {/* Tabs */}
      <div className="rtabs">
        <button type="button" onClick={() => setTab("pipeline")} className={tab === "pipeline" ? "on" : ""}>
          {t("tabPipeline")} ({positionCandidates.length})
        </button>
        <button type="button" onClick={() => setTab("search")} className={tab === "search" ? "on" : ""}>
          {t("tabSearch")}
        </button>
        <button type="button" onClick={() => setTab("questions")} className={tab === "questions" ? "on" : ""}>
          {t("tabQuestions")} ({questions.length})
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
        ) : tab === "search" ? (
          <AiSearchView
            positionId={position.id}
            position={position}
            seniorityOptions={seniorityOptions}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <PublicLinkCard
              orgSlug={orgSlug}
              positionId={position.id}
              positionStatus={position.status}
            />
            <PositionQuestionsManager
              positionId={position.id}
              initialQuestions={questions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
