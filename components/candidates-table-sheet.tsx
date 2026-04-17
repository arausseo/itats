"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { redFlagsIsClear, type Candidate } from "@/src/types/candidate";
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type CandidatesTableSheetProps = {
  candidates: Candidate[];
  sortColumn: SortColumn;
  sortDir: SortDir;
  totalCount: number;
  page: number;
  pageSize: number;
};

function RolPrincipalCell({ text }: { text: string }) {
  const t = text.trim() || "—";
  if (t === "—" || t.length <= ROL_TABLE_MAX_LEN) {
    return <span className="max-w-[14rem] truncate">{t}</span>;
  }
  const short = `${t.slice(0, ROL_TABLE_MAX_LEN)}…`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="max-w-[14rem] cursor-default truncate text-left">
          {short}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="break-words">{t}</p>
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
}: {
  label: string;
  column: SortColumn;
  align?: "left" | "right";
  sortColumn: SortColumn;
  sortDir: SortDir;
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
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const openRow = useCallback((row: Candidate) => {
    setSelected(row);
    setOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableColumnHead
                label="Nombre"
                column="nombre"
                sortColumn={sortColumn}
                sortDir={sortDir}
              />
              <SortableColumnHead
                label="Rol principal"
                column="rol_principal"
                sortColumn={sortColumn}
                sortDir={sortDir}
              />
              <SortableColumnHead
                label="Seniority"
                column="seniority_estimado"
                sortColumn={sortColumn}
                sortDir={sortDir}
              />
              <SortableColumnHead
                label="Años de experiencia"
                column="anos_experiencia_total"
                align="right"
                sortColumn={sortColumn}
                sortDir={sortDir}
              />
              <TableHead>Sectores</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay candidatos que coincidan con los filtros.
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
                      {row.nombre || "—"}
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
                      {row.anos_experiencia_total.toLocaleString("es-ES")}
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

      <CandidatesTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:!max-w-2xl lg:!max-w-3xl"
          showCloseButton
        >
          {selected ? (
            <>
              <SheetHeader className="border-b border-border/60 px-6 py-6 text-left sm:px-8">
                <SheetTitle className="pr-10 font-heading text-lg sm:text-xl">
                  {selected.nombre}
                </SheetTitle>
                <SheetDescription>
                  {selected.rol_principal} · {selected.email}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-7 px-6 pb-8 pt-5 sm:px-8">
                <section className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ubicación y contacto
                  </h3>
                  <dl className="grid gap-2 text-xs/relaxed sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">País de residencia</dt>
                      <dd className="font-medium text-foreground">
                        {selected.pais_residencia?.trim()
                          ? selected.pais_residencia
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Teléfono</dt>
                      <dd className="font-medium text-foreground">
                        {selected.telefono?.trim() ? selected.telefono : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Resumen ejecutivo
                  </h3>
                  <p className="text-xs/relaxed text-foreground whitespace-pre-wrap">
                    {selected.resumen_ejecutivo || "—"}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Red flags
                  </h3>
                  {redFlagsIsClear(selected.red_flags) ? (
                    <p className="text-xs/relaxed text-emerald-800 dark:text-emerald-100/90">
                      Nada relevante
                    </p>
                  ) : (
                    <p className="max-w-full whitespace-pre-wrap text-xs/relaxed text-destructive">
                      {selected.red_flags}
                    </p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Stack tecnológico
                  </h3>
                  <div className="space-y-2">
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      Lenguajes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.lenguajes.length ? (
                        selected.lenguajes.map((x) => (
                          <Badge key={x} variant="secondary">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      Frameworks
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.frameworks.length ? (
                        selected.frameworks.map((x) => (
                          <Badge key={x} variant="outline">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-[0.625rem] font-medium text-muted-foreground">
                      Patrones / prácticas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.patrones.length ? (
                        selected.patrones.map((x) => (
                          <Badge key={x} variant="outline">
                            {x}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Educación
                  </h3>
                  <p className="text-xs/relaxed text-foreground whitespace-pre-wrap">
                    {selected.educacion_formal?.trim()
                      ? selected.educacion_formal
                      : "—"}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Certificaciones
                  </h3>
                  {selected.certificaciones.length ? (
                    <ul className="list-inside list-disc space-y-1.5 text-xs/relaxed text-foreground">
                      {selected.certificaciones.map((c, i) => (
                        <li key={`${c}-${i}`}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </section>

                <div className="pt-2">
                  <Button type="button" variant="secondary" onClick={closeSheet}>
                    Cerrar
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
