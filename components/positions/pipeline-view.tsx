"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { PipelineStatusSelect } from "@/components/positions/pipeline-status-select";
import { CandidateDetailSheet } from "@/components/candidate-detail-sheet";
import {
  getCandidateById,
  generatePositionRanking,
  generateRankingReport,
} from "@/src/lib/positions-actions";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CvMarkdownPreview } from "@/components/cv-markdown-preview";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const MIN_CANDIDATES_FOR_RANKING = 3;

// Medal colors for top 3
function RankBadge({ score }: { score: number }) {
  const medal =
    score === 1
      ? "bg-yellow-400/20 text-yellow-700 border-yellow-400/50 dark:text-yellow-300"
      : score === 2
        ? "bg-slate-300/20 text-slate-600 border-slate-400/50 dark:text-slate-300"
        : score === 3
          ? "bg-amber-600/20 text-amber-700 border-amber-500/50 dark:text-amber-400"
          : "bg-muted/60 text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
        medal,
      )}
    >
      {score}
    </span>
  );
}

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
  const router = useRouter();

  const [seniority, setSeniority] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchTransition, startFetchTransition] = useTransition();
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isRankingPending, startRankingTransition] = useTransition();
  const [isReportPending, startReportTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("ranking.md");

  const hasRanking = positionCandidates.some((pc) => pc.ranking_score !== null);
  const canGenerateRanking = positionCandidates.length >= MIN_CANDIDATES_FOR_RANKING;

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

  const statusOptions = useMemo(() => {
    const used = new Set(positionCandidates.map((pc) => pc.pipeline_status));
    return PIPELINE_STATUSES.filter((s) => used.has(s));
  }, [positionCandidates]);

  const filtered = useMemo(() => {
    const base = positionCandidates.filter((pc) => {
      const matchSeniority =
        seniority === ALL || pc.candidate.seniority_estimado === seniority;
      const matchStatus = status === ALL || pc.pipeline_status === status;
      return matchSeniority && matchStatus;
    });
    // Si hay ranking, ordenar por ranking_score (nulls al final)
    if (hasRanking) {
      return [...base].sort((a, b) => {
        if (a.ranking_score === null && b.ranking_score === null) return 0;
        if (a.ranking_score === null) return 1;
        if (b.ranking_score === null) return -1;
        return a.ranking_score - b.ranking_score;
      });
    }
    return base;
  }, [positionCandidates, seniority, status, hasRanking]);

  const hasActiveFilters = seniority !== ALL || status !== ALL;

  const sheetNavigationCandidates = useMemo(
    () =>
      filtered.map(
        (pc) =>
          ({
            id: pc.candidate_id,
            ...pc.candidate,
          }) as unknown as Candidate,
      ),
    [filtered],
  );

  function clearFilters() {
    setSeniority(ALL);
    setStatus(ALL);
  }

  function loadCandidateById(candidateId: string, openSheet: boolean) {
    setFetchingId(candidateId);
    startFetchTransition(async () => {
      const res = await getCandidateById(candidateId);
      setFetchingId(null);
      if (res.ok) {
        setSelectedCandidate(res.candidate);
        if (openSheet) setSheetOpen(true);
      }
    });
  }

  function openDetail(candidateId: string) {
    loadCandidateById(candidateId, true);
  }

  function handleGenerateRanking() {
    setRankingError(null);
    startRankingTransition(async () => {
      const res = await generatePositionRanking(positionId);
      if (!res.ok) {
        setRankingError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleOpenPreview() {
    setReportError(null);
    startReportTransition(async () => {
      const res = await generateRankingReport(positionId);
      if (!res.ok) {
        setReportError(res.error);
        return;
      }
      setPreviewMarkdown(res.markdown);
      setPreviewFilename(res.filename);
      setPreviewOpen(true);
    });
  }

  function handleDownload() {
    if (!previewMarkdown) return;
    const blob = new Blob([previewMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = previewFilename;
    a.click();
    URL.revokeObjectURL(url);
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
        {/* Ranking actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-foreground">
              {hasRanking ? t("colRanking") : t("generateRanking")}
            </p>
            {!canGenerateRanking && (
              <p className="text-xs text-muted-foreground">
                {t("rankingMinCandidates")}
              </p>
            )}
            {rankingError && (
              <p className="text-xs text-destructive">{rankingError}</p>
            )}
            {reportError && (
              <p className="text-xs text-destructive">{reportError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasRanking && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPreview}
                disabled={isReportPending}
              >
                {isReportPending ? (
                  <>
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                    {t("downloadingReport")}
                  </>
                ) : (
                  t("downloadReport")
                )}
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleGenerateRanking}
                      disabled={isRankingPending || !canGenerateRanking}
                    >
                      {isRankingPending ? (
                        <>
                          <Spinner className="mr-1.5 h-3.5 w-3.5" />
                          {t("generatingRanking")}
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="mr-1">✨</span>
                          {hasRanking ? t("generateRanking") : t("generateRanking")}
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canGenerateRanking && (
                  <TooltipContent>
                    <p className="text-xs">{t("rankingMinCandidates")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
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
                {hasRanking && (
                  <TableHead className="w-16 text-xs">{t("colRanking")}</TableHead>
                )}
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
                    colSpan={hasRanking ? 7 : 6}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    {t("filterNoResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((pc) => (
                  <TableRow key={pc.id}>
                    {hasRanking && (
                      <TableCell>
                        {pc.ranking_score !== null ? (
                          <RankBadge score={pc.ranking_score} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div>
                        <p className="text-sm">{pc.candidate.nombre}</p>
                        <p className="text-xs text-muted-foreground">{pc.candidate.email}</p>
                        {pc.ranking_phrase && (
                          <p
                            className="mt-0.5 truncate text-xs italic text-muted-foreground"
                            title={pc.ranking_phrase}
                          >
                            {pc.ranking_phrase}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <p>{pc.candidate.rol_principal}</p>
                      {pc.candidate.pais_residencia && (
                        <p className="text-xs text-muted-foreground/70">
                          {pc.candidate.pais_residencia}
                        </p>
                      )}
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

      {/* Dialog de previsualización del reporte */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[92vh] w-full max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{t("downloadReport")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {previewMarkdown && <CvMarkdownPreview markdown={previewMarkdown} />}
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleDownload}>
              {t("downloadReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CandidateDetailSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addToPosition={{
          mode: "locked",
          positionId,
          positionTitle,
        }}
        candidates={sheetNavigationCandidates}
        onNavigate={(c) => loadCandidateById(c.id, false)}
        isLoadingCandidate={sheetOpen && fetchTransition}
      />
    </>
  );
}
