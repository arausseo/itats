"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { type Candidate } from "@/src/types/candidate";
import {
  formatSectores,
  seniorityBadgeProps,
} from "@/src/lib/candidate-display";
import {
  nextSortClick,
  ROL_TABLE_MAX_LEN,
  type SortColumn,
  type SortDir,
} from "@/src/lib/candidate-list-params";
import { mergeCandidateListUrl } from "@/src/lib/candidate-list-url-client";
import { CandidatesTablePagination } from "@/components/candidates-table-pagination";
import { CandidateDetailSheet } from "@/components/candidate-detail-sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export type CandidatesTableSheetProps = {
  candidates: Candidate[];
  sortColumn: SortColumn;
  sortDir: SortDir;
  totalCount: number;
  page: number;
  pageSize: number;
  openPositions: { id: string; title: string }[];
};

function RolPrincipalCell({ text }: { text: string }) {
  const tCommon = useTranslations("common");
  const dash = tCommon("dash");
  const trimmed = text.trim() || dash;
  if (trimmed === dash || trimmed.length <= ROL_TABLE_MAX_LEN) {
    return <span>{trimmed}</span>;
  }
  const short = `${trimmed.slice(0, ROL_TABLE_MAX_LEN)}…`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{short}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="break-words">{trimmed}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SortableTh({
  label,
  column,
  align = "left",
  sortColumn,
  sortDir,
  startTransition,
}: {
  label: string;
  column: SortColumn;
  align?: "left" | "right";
  sortColumn: SortColumn;
  sortDir: SortDir;
  startTransition: React.TransitionStartFunction;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = sortColumn === column;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th style={{ textAlign: align === "right" ? "right" : "left" }} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => {
          const next = nextSortClick(column, sortColumn, sortDir);
          const p = mergeCandidateListUrl(
            new URLSearchParams(searchParams.toString()),
            { sort: next.sort, dir: next.dir, page: "1" },
          );
          const qs = p.toString();
          startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          });
        }}
        style={{
          font: "inherit",
          color: "inherit",
          letterSpacing: "inherit",
          textTransform: "inherit",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: 0,
          width: align === "right" ? "100%" : undefined,
          justifyContent: align === "right" ? "flex-end" : undefined,
        }}
      >
        <span>{label}</span>
        {active && <span style={{ color: "var(--brand)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

export function CandidatesTableSheet({
  candidates,
  sortColumn,
  sortDir,
  totalCount,
  page,
  pageSize,
  openPositions,
}: CandidatesTableSheetProps) {
  const tTable = useTranslations("table");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const dash = tCommon("dash");

  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const openRow = useCallback((row: Candidate) => {
    setSelected(row);
    setOpen(true);
  }, []);

  return (
    <>
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[18px] bg-background/70 backdrop-blur-[1px]">
            <Spinner className="h-9 w-9 text-primary" />
          </div>
        )}
        <div className="card" style={{ padding: "6px 8px" }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <SortableTh label={tTable("name")} column="nombre" sortColumn={sortColumn} sortDir={sortDir} startTransition={startTransition} />
                  <SortableTh label={tTable("rolPrincipal")} column="rol_principal" sortColumn={sortColumn} sortDir={sortDir} startTransition={startTransition} />
                  <SortableTh label={tTable("seniority")} column="seniority_estimado" sortColumn={sortColumn} sortDir={sortDir} startTransition={startTransition} />
                  <SortableTh label={tTable("yearsExperience")} column="anos_experiencia_total" align="right" sortColumn={sortColumn} sortDir={sortDir} startTransition={startTransition} />
                  <th>{tTable("sectors")}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ height: 96, textAlign: "center", color: "var(--faint)", cursor: "default" }}>
                      {tTable("empty")}
                    </td>
                  </tr>
                ) : (
                  candidates.map((row) => {
                    const badge = seniorityBadgeProps(row.seniority_estimado);
                    return (
                      <tr
                        key={row.id}
                        tabIndex={0}
                        onClick={() => openRow(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openRow(row);
                          }
                        }}
                      >
                        <td style={{ fontWeight: 700 }}>{row.nombre || dash}</td>
                        <td style={{ maxWidth: "14rem" }} className="truncate">
                          <RolPrincipalCell text={row.rol_principal} />
                        </td>
                        <td>
                          <Badge variant={badge.variant} className={cn("font-normal", badge.className)}>
                            {row.seniority_estimado}
                          </Badge>
                        </td>
                        <td className="mono" style={{ textAlign: "right" }}>
                          {format.number(row.anos_experiencia_total)}
                        </td>
                        <td className="truncate" style={{ maxWidth: "14rem", color: "var(--faint)" }}>
                          {formatSectores(row.sectores)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CandidatesTablePagination page={page} pageSize={pageSize} totalCount={totalCount} />

      <CandidateDetailSheet
        candidate={selected}
        open={open}
        onOpenChange={setOpen}
        addToPosition={{ mode: "select", positions: openPositions }}
        candidates={candidates}
        onNavigate={(c) => setSelected(c)}
      />
    </>
  );
}
