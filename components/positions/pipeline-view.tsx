"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PipelineStatusSelect } from "@/components/positions/pipeline-status-select";
import { CandidateDetailSheet } from "@/components/candidate-detail-sheet";
import type { PositionCandidateWithCandidate } from "@/src/types/position";
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

const ALL = "__all__";

interface PipelineViewProps {
  positionCandidates: PositionCandidateWithCandidate[];
  positionId: string;
}

export function PipelineView({ positionCandidates }: PipelineViewProps) {
  const t = useTranslations("positions");

  const [seniority, setSeniority] = useState<string>(ALL);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const seniorityOptions = Array.from(
    new Set(
      positionCandidates
        .map((pc) => pc.candidate.seniority_estimado?.trim())
        .filter(Boolean),
    ),
  ).sort();

  const filtered =
    seniority === ALL
      ? positionCandidates
      : positionCandidates.filter(
          (pc) => pc.candidate.seniority_estimado === seniority,
        );

  function openDetail(candidate: Candidate) {
    setSelectedCandidate(candidate);
    setSheetOpen(true);
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
        {seniorityOptions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("filterSeniority")}</span>
            <Select value={seniority} onValueChange={setSeniority}>
              <SelectTrigger className="h-8 w-44 text-xs">
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
            {seniority !== ALL && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => setSeniority(ALL)}
              >
                {t("filterClear")}
              </Button>
            )}
          </div>
        )}

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
                        onClick={() => openDetail(pc.candidate)}
                      >
                        {t("viewProfile")}
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
      />
    </>
  );
}
