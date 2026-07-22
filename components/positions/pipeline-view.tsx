"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { PipelineStatusSelect } from "@/components/positions/pipeline-status-select";
import { CandidateProfilePanel } from "@/components/features/candidate-profile-panel";
import { Icon } from "@/components/app/icon";
import {
  getCandidateById,
  generatePositionRanking,
  generateRankingReport,
  removeFromPipeline,
} from "@/src/lib/positions-actions";
import type { PositionCandidateWithCandidate } from "@/src/types/position";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/src/types/position";
import { STAGE_COLOR } from "@/src/lib/pipeline-stage-colors";
import type { Candidate } from "@/src/types/candidate";
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
  const [stageFilter, setStageFilter] = useState<PipelineStatus | null>(null);
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null);
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
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemovePending, startRemoveTransition] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

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

  // Conteo por stage para el funnel (sobre el total, no el filtrado).
  const stageCounts = useMemo(() => {
    const counts = {} as Record<PipelineStatus, number>;
    for (const s of PIPELINE_STATUSES) counts[s] = 0;
    for (const pc of positionCandidates) counts[pc.pipeline_status]++;
    return counts;
  }, [positionCandidates]);

  const activeStages = PIPELINE_STATUSES.filter((s) => stageCounts[s] > 0);

  const filtered = useMemo(() => {
    const base = positionCandidates.filter((pc) => {
      const matchSeniority = seniority === ALL || pc.candidate.seniority_estimado === seniority;
      const matchStage = stageFilter === null || pc.pipeline_status === stageFilter;
      return matchSeniority && matchStage;
    });
    if (hasRanking) {
      return [...base].sort((a, b) => {
        if (a.ranking_score === null && b.ranking_score === null) return 0;
        if (a.ranking_score === null) return 1;
        if (b.ranking_score === null) return -1;
        return a.ranking_score - b.ranking_score;
      });
    }
    return base;
  }, [positionCandidates, seniority, stageFilter, hasRanking]);

  const selectedPc = selectedPcId
    ? positionCandidates.find((pc) => pc.id === selectedPcId) ?? null
    : null;
  const panelIdx = selectedPcId ? filtered.findIndex((pc) => pc.id === selectedPcId) : -1;
  const panelOpen = selectedCandidate !== null && selectedPcId !== null;

  function openDetail(pc: PositionCandidateWithCandidate) {
    setSelectedPcId(pc.id);
    setFetchingId(pc.candidate_id);
    startFetchTransition(async () => {
      const res = await getCandidateById(pc.candidate_id);
      setFetchingId(null);
      if (res.ok) setSelectedCandidate(res.candidate);
    });
  }

  function closePanel() {
    setSelectedPcId(null);
    setSelectedCandidate(null);
  }

  function navPanel(dir: -1 | 1) {
    if (panelIdx < 0) return;
    const target = filtered[panelIdx + dir];
    if (target) openDetail(target);
  }

  function handleGenerateRanking() {
    setRankingError(null);
    startRankingTransition(async () => {
      const res = await generatePositionRanking(positionId);
      if (!res.ok) setRankingError(res.error);
      else router.refresh();
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

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoveError(null);
    startRemoveTransition(async () => {
      const res = await removeFromPipeline(removeTarget.id);
      if (!res.ok) setRemoveError(res.error);
      else {
        setRemoveTarget(null);
        router.refresh();
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
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }} className="flex flex-col gap-4">
          {/* Funnel interactivo */}
          <div className="funnel">
            <div className="fbar">
              {activeStages.map((s) => (
                <div
                  key={s}
                  className={cn("seg", stageFilter && stageFilter !== s && "dim")}
                  style={{ flex: stageCounts[s], background: STAGE_COLOR[s] }}
                  title={t(`pipelineStatus.${s.replace(/ /g, "_")}`)}
                />
              ))}
            </div>
            <div className="flegend">
              {activeStages.map((s) => (
                <button
                  key={s}
                  className={cn("lg", stageFilter === s && "on")}
                  onClick={() => setStageFilter(stageFilter === s ? null : s)}
                >
                  <span className="d" style={{ background: STAGE_COLOR[s] }} />
                  {t(`pipelineStatus.${s.replace(/ /g, "_")}`)} <b>({stageCounts[s]})</b>
                </button>
              ))}
              {stageFilter && (
                <button className="lg clear" onClick={() => setStageFilter(null)}>
                  <Icon name="x" size={12} />
                  {t("filterClear")}
                </button>
              )}
            </div>
          </div>

          {/* Ranking actions */}
          <div
            className="card"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px" }}
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-foreground">
                {hasRanking ? t("colRanking") : t("generateRanking")}
              </p>
              {!canGenerateRanking && (
                <p className="text-xs text-muted-foreground">{t("rankingMinCandidates")}</p>
              )}
              {rankingError && <p className="text-xs text-destructive">{rankingError}</p>}
              {reportError && <p className="text-xs text-destructive">{reportError}</p>}
            </div>
            <div className="flex items-center gap-2">
              {hasRanking && (
                <Button variant="outline" size="sm" onClick={handleOpenPreview} disabled={isReportPending}>
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
              <Button size="sm" onClick={handleGenerateRanking} disabled={isRankingPending || !canGenerateRanking}>
                {isRankingPending ? (
                  <>
                    <Spinner className="mr-1.5 h-3.5 w-3.5" />
                    {t("generatingRanking")}
                  </>
                ) : (
                  <>
                    <span aria-hidden className="mr-1">✨</span>
                    {t("generateRanking")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filtro seniority */}
          {seniorityOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <select className="mini-sel" value={seniority} onChange={(e) => setSeniority(e.target.value)} aria-label={t("filterSeniority")}>
                <option value={ALL}>{t("filterSeniority")}: {t("filterAll")}</option>
                {seniorityOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(seniority !== ALL || stageFilter !== null) && (
                <span className="text-xs text-muted-foreground">
                  {t("filterResults", { count: filtered.length, total: positionCandidates.length })}
                </span>
              )}
            </div>
          )}

          {/* Tabla ranking */}
          <div className="card" style={{ padding: "6px 8px" }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {hasRanking && <th style={{ width: 64 }}>{t("colRanking")}</th>}
                    <th>{t("colCandidate")}</th>
                    {!panelOpen && <th>{t("colRole")}</th>}
                    {!panelOpen && <th>{t("colSeniority")}</th>}
                    <th>{t("colStatus")}</th>
                    {!panelOpen && <th>{t("colAdded")}</th>}
                    <th aria-label="acciones" style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ height: 80, textAlign: "center", color: "var(--faint)", cursor: "default" }}>
                        {t("filterNoResults")}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((pc) => (
                      <tr
                        key={pc.id}
                        className={selectedPcId === pc.id ? "active" : undefined}
                        onClick={() => openDetail(pc)}
                      >
                        {hasRanking && (
                          <td>
                            {pc.ranking_score !== null ? (
                              <span className={cn("rankbadge", pc.ranking_score <= 3 && "top")}>{pc.ranking_score}</span>
                            ) : (
                              <span style={{ color: "var(--faint)" }}>—</span>
                            )}
                          </td>
                        )}
                        <td>
                          <div className="cname">{pc.candidate.nombre}</div>
                          <div className="cemail">{pc.candidate.email}</div>
                          {pc.ranking_phrase && !panelOpen && (
                            <div className="cnote" title={pc.ranking_phrase} style={{ maxWidth: "24rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {pc.ranking_phrase}
                            </div>
                          )}
                        </td>
                        {!panelOpen && (
                          <td style={{ color: "var(--faint)" }}>
                            <div>{pc.candidate.rol_principal}</div>
                            {pc.candidate.pais_residencia && (
                              <div style={{ fontSize: 12, opacity: 0.8 }}>{pc.candidate.pais_residencia}</div>
                            )}
                          </td>
                        )}
                        {!panelOpen && <td style={{ color: "var(--faint)" }}>{pc.candidate.seniority_estimado}</td>}
                        <td>
                          <PipelineStatusSelect positionCandidateId={pc.id} currentStatus={pc.pipeline_status} />
                        </td>
                        {!panelOpen && (
                          <td style={{ fontSize: 12.5, color: "var(--faint)" }}>
                            {new Date(pc.created_at).toLocaleDateString()}
                          </td>
                        )}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                            <button className="icon-btn sm" title={t("viewProfile")} onClick={() => openDetail(pc)} disabled={fetchingId === pc.candidate_id && fetchTransition}>
                              {fetchingId === pc.candidate_id && fetchTransition ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="chevRight" size={16} />}
                            </button>
                            <button
                              className="icon-btn sm"
                              title={t("removeFromPipeline")}
                              style={{ color: "var(--faint)" }}
                              onClick={() => setRemoveTarget({ id: pc.id, name: pc.candidate.nombre })}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {panelOpen && selectedCandidate && (
          <CandidateProfilePanel
            candidate={selectedCandidate}
            mode="split"
            idx={panelIdx}
            total={filtered.length}
            onNav={navPanel}
            onClose={closePanel}
            statusSlot={
              selectedPc && (
                <PipelineStatusSelect positionCandidateId={selectedPc.id} currentStatus={selectedPc.pipeline_status} />
              )
            }
          />
        )}
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

      {/* Confirm remove */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
            setRemoveError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("removeConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("removeConfirmDescription", { name: removeTarget?.name ?? "" })}
          </p>
          {removeError && <p className="text-xs text-destructive">{removeError}</p>}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setRemoveTarget(null); setRemoveError(null); }} disabled={isRemovePending}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveConfirm} disabled={isRemovePending}>
              {isRemovePending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner className="h-3.5 w-3.5" />
                  {t("removing")}
                </span>
              ) : (
                t("removeConfirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
