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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
};

function RolPrincipalCell({ text }: { text: string }) {
  const tCommon = useTranslations("common");
  const dash = tCommon("dash");
  const trimmed = text.trim() || dash;
  if (trimmed === dash || trimmed.length <= ROL_TABLE_MAX_LEN) {
    return <span className="max-w-[14rem] truncate">{trimmed}</span>;
  }
  const short = `${trimmed.slice(0, ROL_TABLE_MAX_LEN)}…`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="max-w-[14rem] cursor-default truncate text-left">
          {short}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="break-words">{trimmed}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SortableColumnHead({
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
  const ariaSort = active
    ? sortDir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <TableHead
      className={cn(align === "right" && "text-right")}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-medium hover:bg-muted/60 hover:text-foreground",
          align === "right" && "w-full justify-end",
        )}
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
      >
        <span>{label}</span>
        {active ? (
          <span className="tabular-nums text-muted-foreground">
            {sortDir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </TableHead>
  );
}

export function CandidatesTableSheet({
  candidates,
  sortColumn,
  sortDir,
  totalCount,
  page,
  pageSize,
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
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70 backdrop-blur-[1px]">
            <Spinner className="h-9 w-9 text-primary" />
          </div>
        )}
        <div className="overflow-x-auto rounded-md border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableColumnHead
                label={tTable("name")}
                column="nombre"
                sortColumn={sortColumn}
                sortDir={sortDir}
                startTransition={startTransition}
              />
              <SortableColumnHead
                label={tTable("rolPrincipal")}
                column="rol_principal"
                sortColumn={sortColumn}
                sortDir={sortDir}
                startTransition={startTransition}
              />
              <SortableColumnHead
                label={tTable("seniority")}
                column="seniority_estimado"
                sortColumn={sortColumn}
                sortDir={sortDir}
                startTransition={startTransition}
              />
              <SortableColumnHead
                label={tTable("yearsExperience")}
                column="anos_experiencia_total"
                align="right"
                sortColumn={sortColumn}
                sortDir={sortDir}
                startTransition={startTransition}
              />
              <TableHead>{tTable("sectors")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tTable("empty")}
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((row) => {
                const badge = seniorityBadgeProps(row.seniority_estimado);
                return (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => openRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRow(row);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {row.nombre || dash}
                    </TableCell>
                    <TableCell>
                      <RolPrincipalCell text={row.rol_principal} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={badge.variant}
                        className={cn("font-normal", badge.className)}
                      >
                        {row.seniority_estimado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {format.number(row.anos_experiencia_total)}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                      {formatSectores(row.sectores)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <CandidatesTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
      />

      <CandidateDetailSheet
        candidate={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
