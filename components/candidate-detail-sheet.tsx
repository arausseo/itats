"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { redFlagsIsClear, type Candidate } from "@/src/types/candidate";
import { CandidateStatusSelect } from "@/components/candidate-status-select";
import { CandidateNotes } from "@/components/candidate-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { getCvDownloadSignedUrl } from "@/src/lib/candidate-cv-download";
import { deleteCandidate } from "@/src/lib/candidate-actions";
import { cn } from "@/lib/utils";
import { CvMarkdownPreview } from "@/components/cv-markdown-preview";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addCandidateToPosition } from "@/src/lib/positions-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Download04Icon,
  FileViewIcon,
  Mail01Icon,
  Call02Icon,
  MoreHorizontalIcon,
  Link01Icon,
  Delete02Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

export type AddToPositionContext =
  | { mode: "select"; positions: { id: string; title: string }[] }
  | { mode: "locked"; positionId: string; positionTitle: string };

export interface CandidateDetailSheetProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addToPosition?: AddToPositionContext;
  /** For navigation between candidates */
  candidates?: Candidate[];
  onNavigate?: (candidate: Candidate) => void;
  /** Cargando candidato completo (p. ej. navegación en pipeline) */
  isLoadingCandidate?: boolean;
}

export function CandidateDetailSheet({
  candidate,
  open,
  onOpenChange,
  addToPosition,
  candidates,
  onNavigate,
  isLoadingCandidate = false,
}: CandidateDetailSheetProps) {
  const tSheet = useTranslations("sheet");
  const tCommon = useTranslations("common");
  const dash = tCommon("dash");

  const router = useRouter();
  const [cvDownloadPending, setCvDownloadPending] = useState(false);
  const [cvDownloadError, setCvDownloadError] = useState<string | null>(null);
  const [markdownOpen, setMarkdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [addPipelinePending, startAddPipeline] = useTransition();
  const [selectedPositionId, setSelectedPositionId] = useState("");

  // Navigation state
  const currentIndex = useMemo(() => {
    if (!candidates || !candidate) return -1;
    return candidates.findIndex((c) => c.id === candidate.id);
  }, [candidates, candidate]);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = candidates && currentIndex < candidates.length - 1;

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!candidates || !onNavigate || isLoadingCandidate) return;
      const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < candidates.length) {
        onNavigate(candidates[newIndex]);
      }
    },
    [candidates, currentIndex, onNavigate, isLoadingCandidate],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open || !candidates || !onNavigate || isLoadingCandidate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canNavigatePrev) {
        e.preventDefault();
        handleNavigate("prev");
      } else if (e.key === "ArrowRight" && canNavigateNext) {
        e.preventDefault();
        handleNavigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    candidates,
    onNavigate,
    canNavigatePrev,
    canNavigateNext,
    handleNavigate,
    isLoadingCandidate,
  ]);

  const effectiveSelectPositionId = useMemo(() => {
    if (addToPosition?.mode !== "select") return "";
    const { positions } = addToPosition;
    if (positions.length === 0) return "";
    if (
      selectedPositionId &&
      positions.some((p) => p.id === selectedPositionId)
    ) {
      return selectedPositionId;
    }
    return positions[0]?.id ?? "";
  }, [addToPosition, selectedPositionId]);

  const handleDownloadCv = useCallback(async () => {
    if (!candidate?.cv_storage_path) return;
    setCvDownloadError(null);
    setCvDownloadPending(true);
    try {
      const res = await getCvDownloadSignedUrl(candidate.id);
      if (res.ok) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setCvDownloadError(res.error);
      }
    } finally {
      setCvDownloadPending(false);
    }
  }, [candidate]);

  const handleCopyLink = useCallback(() => {
    if (!candidate) return;
    const url = `${window.location.origin}/candidates/${candidate.id}`;
    navigator.clipboard.writeText(url);
    toast.success(tSheet("linkCopied"));
  }, [candidate, tSheet]);

  const handleEmailClick = useCallback(() => {
    if (!candidate?.email) return;
    window.location.href = `mailto:${candidate.email}`;
  }, [candidate]);

  const handlePhoneClick = useCallback(() => {
    if (!candidate?.telefono) return;
    window.location.href = `tel:${candidate.telefono}`;
  }, [candidate]);

  const handleDelete = useCallback(() => {
    if (!candidate) return;
    startDelete(async () => {
      const result = await deleteCandidate(candidate.id);
      if (result.ok) {
        toast.success(tSheet("candidateDeleted"));
        setDeleteDialogOpen(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }, [candidate, onOpenChange, router, tSheet]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCvDownloadError(null);
    }
    onOpenChange(next);
  }

  const runAddToPipeline = useCallback(
    (positionId: string) => {
      if (!candidate?.id || !positionId) return;
      startAddPipeline(async () => {
        const res = await addCandidateToPosition(positionId, candidate.id);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(tSheet("addToPipelineSuccess"));
        router.refresh();
      });
    },
    [candidate?.id, router, tSheet]
  );

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:!max-w-2xl lg:!max-w-3xl"
          showCloseButton
        >
          {candidate ? (
            <div className="relative flex min-h-0 w-full flex-1 flex-col">
              {isLoadingCandidate ? (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-background/75 px-4 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-5 text-center shadow-lg">
                    <Spinner className="h-9 w-9 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {tSheet("loadingCandidate")}
                    </p>
                  </div>
                </div>
              ) : null}
              <div
                className={cn(
                  "flex min-h-0 w-full flex-col",
                  isLoadingCandidate &&
                    "pointer-events-none select-none opacity-40",
                )}
              >
              {/* Enhanced Header with Actions Bar */}
              <SheetHeader className="border-b border-border/60 px-6 py-5 text-left sm:px-8">
                {/* Navigation Row */}
                {candidates && candidates.length > 1 && onNavigate && (
                  <div
                    className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-2 sm:px-3"
                    aria-busy={isLoadingCandidate}
                  >
                    <div className="flex justify-start gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={!canNavigatePrev || isLoadingCandidate}
                        onClick={() => handleNavigate("prev")}
                        aria-label={tSheet("prevCandidate")}
                      >
                        <HugeiconsIcon
                          icon={ArrowLeft02Icon}
                          className="h-4 w-4"
                          strokeWidth={2}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={!canNavigateNext || isLoadingCandidate}
                        onClick={() => handleNavigate("next")}
                        aria-label={tSheet("nextCandidate")}
                      >
                        <HugeiconsIcon
                          icon={ArrowRight02Icon}
                          className="h-4 w-4"
                          strokeWidth={2}
                        />
                      </Button>
                    </div>
                    <div className="flex min-w-[5.5rem] items-center justify-center">
                      <span className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                        {currentIndex >= 0
                          ? `${currentIndex + 1} / ${candidates.length}`
                          : `— / ${candidates.length}`}
                      </span>
                    </div>
                    <div className="min-w-0" aria-hidden />
                  </div>
                )}

                {/* Title Row with Status */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="pr-6 font-heading text-lg sm:text-xl">
                      {candidate.nombre}
                    </SheetTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {candidate.rol_principal}
                    </p>
                  </div>
                  <CandidateStatusSelect
                    candidateId={candidate.id}
                    currentStatus={candidate.status}
                    compact
                  />
                </div>

                {/* Quick Actions Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <TooltipProvider>
                    {/* Download CV */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!candidate.cv_storage_path || cvDownloadPending}
                          onClick={() => void handleDownloadCv()}
                          className="gap-1.5"
                        >
                          {cvDownloadPending ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <HugeiconsIcon icon={Download04Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                          )}
                          <span className="hidden sm:inline">{tSheet("downloadCv")}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{tSheet("downloadCv")}</TooltipContent>
                    </Tooltip>

                    {/* View Details */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!candidate.cv_markdown}
                          onClick={() => setMarkdownOpen(true)}
                          className="gap-1.5"
                        >
                          <HugeiconsIcon icon={FileViewIcon} className="h-3.5 w-3.5" strokeWidth={2} />
                          <span className="hidden sm:inline">{tSheet("viewMarkdown")}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{tSheet("viewMarkdown")}</TooltipContent>
                    </Tooltip>

                    {/* Email */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          disabled={!candidate.email}
                          onClick={handleEmailClick}
                        >
                          <HugeiconsIcon icon={Mail01Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{candidate.email}</TooltipContent>
                    </Tooltip>

                    {/* Phone */}
                    {candidate.telefono?.trim() && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={handlePhoneClick}
                          >
                            <HugeiconsIcon icon={Call02Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{candidate.telefono}</TooltipContent>
                      </Tooltip>
                    )}

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon-sm">
                          <HugeiconsIcon icon={MoreHorizontalIcon} className="h-3.5 w-3.5" strokeWidth={2} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCopyLink}>
                          <HugeiconsIcon icon={Link01Icon} className="mr-2 h-4 w-4" strokeWidth={2} />
                          {tSheet("copyLink")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" strokeWidth={2} />
                          {tSheet("deleteCandidate")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipProvider>
                </div>

                {/* CV Error */}
                {!candidate.cv_storage_path && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tSheet("cvUnavailable")}
                  </p>
                )}
                {cvDownloadError && (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    {cvDownloadError}
                  </p>
                )}
              </SheetHeader>

              <div className="flex flex-col gap-7 px-6 pb-8 pt-5 sm:px-8">
                {/* Add to Position Section */}
                {addToPosition ? (
                  <section className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {tSheet("addToPositionSection")}
                    </h3>
                    {addToPosition.mode === "select" ? (
                      addToPosition.positions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {tSheet("noOpenPositions")}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Select
                              value={effectiveSelectPositionId}
                              onValueChange={setSelectedPositionId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={tSheet("selectPositionPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {addToPosition.positions.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="shrink-0 gap-1.5 sm:w-auto"
                            disabled={
                              addPipelinePending || !effectiveSelectPositionId
                            }
                            onClick={() =>
                              runAddToPipeline(effectiveSelectPositionId)
                            }
                          >
                            {addPipelinePending ? (
                              <Spinner className="h-3.5 w-3.5" />
                            ) : (
                              <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                            )}
                            {tSheet("addToPipeline")}
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-foreground">
                          <span className="text-muted-foreground">
                            {tSheet("lockedPositionHint")}
                            {": "}
                          </span>
                          <span className="font-medium">
                            {addToPosition.positionTitle}
                          </span>
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          disabled={addPipelinePending}
                          onClick={() =>
                            runAddToPipeline(addToPosition.positionId)
                          }
                        >
                          {addPipelinePending ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5" strokeWidth={2} />
                          )}
                          {tSheet("addToPipeline")}
                        </Button>
                      </div>
                    )}
                  </section>
                ) : null}

                {/* Contact Info */}
                <section className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("locationContact")}
                  </h3>
                  <dl className="grid gap-2 text-xs/relaxed sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">{tSheet("countryResidence")}</dt>
                      <dd className="font-medium text-foreground">
                        {candidate.pais_residencia?.trim() ? candidate.pais_residencia : dash}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{tSheet("email")}</dt>
                      <dd className="mt-0.5 flex items-start gap-0.5 font-medium text-foreground">
                        <span className="min-w-0 flex-1 break-all">{candidate.email}</span>
                        <CopyToClipboardButton
                          value={candidate.email}
                          aria-label={tSheet("copyEmail")}
                        />
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">{tSheet("phone")}</dt>
                      <dd className="mt-0.5 flex items-start gap-0.5 font-medium text-foreground">
                        <span className="min-w-0 flex-1 break-words">
                          {candidate.telefono?.trim() ? candidate.telefono : dash}
                        </span>
                        {candidate.telefono?.trim() ? (
                          <CopyToClipboardButton
                            value={candidate.telefono.trim()}
                            aria-label={tSheet("copyPhone")}
                          />
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Executive Summary */}
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("executiveSummary")}
                  </h3>
                  <p className="whitespace-pre-wrap text-xs/relaxed text-foreground">
                    {candidate.resumen_ejecutivo || dash}
                  </p>
                </section>

                {/* Red Flags */}
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("redFlags")}
                  </h3>
                  {redFlagsIsClear(candidate.red_flags) ? (
                    <p className="text-xs/relaxed text-emerald-800 dark:text-emerald-100/90">
                      {tSheet("redFlagsClear")}
                    </p>
                  ) : (
                    <p className="max-w-full whitespace-pre-wrap text-xs/relaxed text-destructive">
                      {candidate.red_flags}
                    </p>
                  )}
                </section>

                {/* Tech Stack */}
                <section className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("techStack")}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      {tSheet("languages")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.lenguajes.length ? (
                        candidate.lenguajes.map((x) => (
                          <Badge key={x} variant="secondary">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">{dash}</span>
                      )}
                    </div>
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      {tSheet("frameworks")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.frameworks.length ? (
                        candidate.frameworks.map((x) => (
                          <Badge key={x} variant="outline">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">{dash}</span>
                      )}
                    </div>
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      {tSheet("patterns")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.patrones.length ? (
                        candidate.patrones.map((x) => (
                          <Badge key={x} variant="outline">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">{dash}</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Education */}
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("education")}
                  </h3>
                  <p className="whitespace-pre-wrap text-xs/relaxed text-foreground">
                    {candidate.educacion_formal?.trim() ? candidate.educacion_formal : dash}
                  </p>
                </section>

                {/* Certifications */}
                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tSheet("certifications")}
                  </h3>
                  {candidate.certificaciones.length ? (
                    <ul className="list-inside list-disc space-y-1.5 text-xs/relaxed text-foreground">
                      {candidate.certificaciones.map((c, i) => (
                        <li key={`${c}-${i}`}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">{dash}</p>
                  )}
                </section>

                {/* Notes Section */}
                <CandidateNotes candidateId={candidate.id} />

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    {tSheet("close")}
                  </Button>
                  {candidates && candidates.length > 1 && onNavigate && (
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      <span className="w-full text-center text-sm font-semibold tabular-nums text-muted-foreground sm:w-auto sm:min-w-[4.5rem] sm:text-right">
                        {currentIndex >= 0
                          ? `${currentIndex + 1} / ${candidates.length}`
                          : `— / ${candidates.length}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 min-w-9 gap-1.5 px-2.5"
                          disabled={!canNavigatePrev || isLoadingCandidate}
                          onClick={() => handleNavigate("prev")}
                        >
                          <HugeiconsIcon
                            icon={ArrowLeft02Icon}
                            className="h-4 w-4 shrink-0"
                            strokeWidth={2}
                          />
                          <span className="hidden sm:inline">
                            {tSheet("prevCandidate")}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 min-w-9 gap-1.5 px-2.5"
                          disabled={!canNavigateNext || isLoadingCandidate}
                          onClick={() => handleNavigate("next")}
                        >
                          <span className="hidden sm:inline">
                            {tSheet("nextCandidate")}
                          </span>
                          <HugeiconsIcon
                            icon={ArrowRight02Icon}
                            className="h-4 w-4 shrink-0"
                            strokeWidth={2}
                          />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Markdown Preview Dialog */}
      {candidate && (
        <Dialog open={markdownOpen} onOpenChange={setMarkdownOpen}>
          <DialogContent
            className={cn(
              "flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0",
              "w-[min(96vw,92rem)] max-w-[min(96vw,92rem)] sm:max-w-none",
              "text-base"
            )}
          >
            <DialogHeader className="border-b border-border/60 px-5 py-4 sm:px-8">
              <DialogTitle className="text-sm font-semibold">
                {candidate.nombre} — {tSheet("viewMarkdown")}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-6">
              <CvMarkdownPreview markdown={candidate.cv_markdown} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {candidate && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tSheet("deleteConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {tSheet("deleteConfirmDescription", { name: candidate.nombre })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                {tSheet("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-3.5 w-3.5" />
                    {tSheet("deleting")}
                  </span>
                ) : (
                  tSheet("deleteCandidate")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
