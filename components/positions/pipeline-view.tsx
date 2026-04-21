"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PipelineStatusSelect } from "@/components/positions/pipeline-status-select";
import { CandidateDetailSheet } from "@/components/candidate-detail-sheet";
import { getCandidateById } from "@/src/lib/positions-actions";
import type { PositionCandidateWithCandidate, PipelineStatus } from "@/src/types/position";
import { PIPELINE_STATUSES } from "@/src/types/position";
import type { Candidate } from "@/src/types/candidate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const ALL = "__all__";

interface PipelineViewProps {
  positionCandidates: PositionCandidateWithCandidate[];
  positionId: string;
  positionTitle: string;
}

export function PipelineView({
  positionCandidates,
  positionId,
  positionTitle,
}: PipelineViewProps) {
  const t = useTranslations("positions");

  const [seniority, setSeniority] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchTransition, startFetchTransition] = useTransition();

  const seniorityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          positionCandidates
            .map((pc) => pc.candidate.seniority_estimado?.trim())
            .filter(Boolean),
        ),
      ).sort(),
    [positionCandidates],
  );

  // Get statuses that actually have candidates
  const statusOptions = useMemo(() => {
    const used = new Set(positionCandidates.map((pc) => pc.pipeline_status));
    return PIPELINE_STATUSES.filter((s) => used.has(s));
  }, [positionCandidates]);

  const filtered = useMemo(() => {
    return positionCandidates.filter((pc) => {
      const matchSeniority =
        seniority === ALL || pc.candidate.seniority_estimado === seniority;
      const matchStatus = status === ALL || pc.pipeline_status === status;
      return matchSeniority && matchStatus;
    });
  }, [positionCandidates, seniority, status]);

  const hasActiveFilters = seniority !== ALL || status !== ALL;

  function clearFilters() {
    setSeniority(ALL);
    setStatus(ALL);
  }

  function openDetail(candidateId: string) {
    setFetchingId(candidateId);
    startFetchTransition(async () => {
      const res = await getCandidateById(candidateId);
      setFetchingId(null);
      if (res.ok) {
        setSelectedCandidate(res.candidate);
        setSheetOpen(true);
      }
    });
  }

  if (positionCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">{t("pipelineEmpty")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("pipelineEmptyHint")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seniority filter */}
          {seniorityOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("filterSeniority")}</span>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className="text-xs">
                    {t("filterAll")}
                  </SelectItem>
                  {seniorityOptions.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status filter */}
          {statusOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("filterStatus")}</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className="text-xs">
                    {t("filterAll")}
                  </SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {t(`pipelineStatus.${s.replace(" ", "_")}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              {t("filterClear")}
            </Button>
          )}

          {/* Results count */}
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground">
              {t("filterResults", { count: filtered.length, total: positionCandidates.length })}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t("colCandidate")}</TableHead>
                <TableHead className="text-xs">{t("colRole")}</TableHead>
                <TableHead className="text-xs">{t("colSeniority")}</TableHead>
                <TableHead className="text-xs">{t("colStatus")}</TableHead>
                <TableHead className="text-xs">{t("colAdded")}</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    {t("filterNoResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((pc) => (
                  <TableRow key={pc.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="text-sm">{pc.candidate.nombre}</p>
                        <p className="text-xs text-muted-foreground">{pc.candidate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pc.candidate.rol_principal}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pc.candidate.seniority_estimado}
                    </TableCell>
                    <TableCell>
                      <PipelineStatusSelect
                        positionCandidateId={pc.id}
                        currentStatus={pc.pipeline_status}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(pc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={fetchingId === pc.candidate_id && fetchTransition}
                        onClick={() => openDetail(pc.candidate_id)}
                      >
                        {fetchingId === pc.candidate_id && fetchTransition ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Spinner className="h-3 w-3" />
                            {t("viewProfile")}
                          </span>
                        ) : (
                          t("viewProfile")
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CandidateDetailSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addToPosition={{
          mode: "locked",
          positionId,
          positionTitle,
        }}
        candidates={filtered.map((pc) => pc.candidate)}
        onNavigate={(c) => setSelectedCandidate(c)}
      />
    </>
  );
}
