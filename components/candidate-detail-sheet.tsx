"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { redFlagsIsClear, type Candidate } from "@/src/types/candidate";
import { CandidateStatusSelect } from "@/components/candidate-status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getCvDownloadSignedUrl } from "@/src/lib/candidate-cv-download";
import { cn } from "@/lib/utils";
import { CvMarkdownPreview } from "@/components/cv-markdown-preview";

export interface CandidateDetailSheetProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailSheet({
  candidate,
  open,
  onOpenChange,
}: CandidateDetailSheetProps) {
  const tSheet = useTranslations("sheet");
  const tCommon = useTranslations("common");
  const dash = tCommon("dash");

  const [cvDownloadPending, setCvDownloadPending] = useState(false);
  const [cvDownloadError, setCvDownloadError] = useState<string | null>(null);
  const [markdownOpen, setMarkdownOpen] = useState(false);

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

  function handleOpenChange(next: boolean) {
    if (!next) setCvDownloadError(null);
    onOpenChange(next);
  }

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:!max-w-2xl lg:!max-w-3xl"
        showCloseButton
      >
        {candidate ? (
          <>
            <SheetHeader className="border-b border-border/60 px-6 py-6 text-left sm:px-8">
              <SheetTitle className="pr-10 font-heading text-lg sm:text-xl">
                {candidate.nombre}
              </SheetTitle>
              <SheetDescription>
                {candidate.rol_principal} · {candidate.email}
              </SheetDescription>
              <CandidateStatusSelect
                candidateId={candidate.id}
                currentStatus={candidate.status}
              />
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={!candidate.cv_storage_path || cvDownloadPending}
                  onClick={() => {
                    void handleDownloadCv();
                  }}
                >
                  {cvDownloadPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="h-3.5 w-3.5" />
                      {tSheet("generatingLink")}
                    </span>
                  ) : (
                    tSheet("downloadCv")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={!candidate.cv_markdown}
                  onClick={() => setMarkdownOpen(true)}
                >
                  {tSheet("viewMarkdown")}
                </Button>
                {!candidate.cv_storage_path ? (
                  <p className="text-xs text-muted-foreground">
                    {tSheet("cvUnavailable")}
                  </p>
                ) : null}
                {cvDownloadError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {cvDownloadError}
                  </p>
                ) : null}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-7 px-6 pb-8 pt-5 sm:px-8">
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
                    <dt className="text-muted-foreground">{tSheet("phone")}</dt>
                    <dd className="font-medium text-foreground">
                      {candidate.telefono?.trim() ? candidate.telefono : dash}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tSheet("executiveSummary")}
                </h3>
                <p className="whitespace-pre-wrap text-xs/relaxed text-foreground">
                  {candidate.resumen_ejecutivo || dash}
                </p>
              </section>

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

              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tSheet("education")}
                </h3>
                <p className="whitespace-pre-wrap text-xs/relaxed text-foreground">
                  {candidate.educacion_formal?.trim() ? candidate.educacion_formal : dash}
                </p>
              </section>

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

              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  {tSheet("close")}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>

    {candidate && (
      <Dialog open={markdownOpen} onOpenChange={setMarkdownOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0",
            "w-[min(96vw,92rem)] max-w-[min(96vw,92rem)] sm:max-w-none",
            "text-base",
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
    </>
  );
}
