"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CandidateDetailSheet } from "@/components/candidate-detail-sheet";
import { addCandidateToPosition, getCandidateById } from "@/src/lib/positions-actions";
import type { CandidateSearchResult } from "@/src/types/position";
import type { Candidate } from "@/src/types/candidate";

interface CandidateSearchCardProps {
  result: CandidateSearchResult;
  positionId: string;
  onAdded: (candidateId: string) => void;
}

export function CandidateSearchCard({
  result,
  positionId,
  onAdded,
}: CandidateSearchCardProps) {
  const t = useTranslations("positions");
  const [isPending, startTransition] = useTransition();
  const [fetchPending, startFetchTransition] = useTransition();
  const [added, setAdded] = useOptimistic(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [fullCandidate, setFullCandidate] = useState<Candidate | null>(null);

  const matchPct = Math.round(result.similarity * 100);
  const matchColor =
    matchPct >= 75
      ? "text-green-600"
      : matchPct >= 55
        ? "text-amber-500"
        : "text-muted-foreground";

  function handleAdd() {
    startTransition(async () => {
      setAdded(true);
      const res = await addCandidateToPosition(positionId, result.id);
      if (res.ok) {
        onAdded(result.id);
      }
    });
  }

  function handleOpenDetail() {
    startFetchTransition(async () => {
      const res = await getCandidateById(result.id);
      if (res.ok) {
        setFullCandidate(res.candidate);
        setSheetOpen(true);
      }
    });
  }

  return (
    <>
      <div
        className={`flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-opacity ${added ? "opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{result.nombre}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {result.rol_principal}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-bold tabular-nums ${matchColor}`}>
            {matchPct}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {result.seniority_estimado}
          </Badge>
        </div>

        <div className="mt-1 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleOpenDetail}
            disabled={fetchPending}
          >
            {fetchPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="h-3 w-3" />
                {t("viewProfile")}
              </span>
            ) : (
              t("viewProfile")
            )}
          </Button>
          <Button
            size="sm"
            variant={added ? "secondary" : "default"}
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={isPending || added}
          >
            {added ? t("addedToPipeline") : t("addToPipeline")}
          </Button>
        </div>
      </div>

      <CandidateDetailSheet
        candidate={fullCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
