"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/src/lib/candidate-list-params";
import { mergeCandidateListUrl } from "@/src/lib/candidate-list-url-client";

export type CandidatesTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
};

export function CandidatesTablePagination({
  page,
  pageSize,
  totalCount,
}: CandidatesTablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const goToPage = (nextPage: number) => {
    const p = mergeCandidateListUrl(
      new URLSearchParams(searchParams.toString()),
      { page: String(nextPage) },
    );
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setPageSize = (nextSize: string) => {
    const p = mergeCandidateListUrl(
      new URLSearchParams(searchParams.toString()),
      { pageSize: nextSize, page: "1" },
    );
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {totalCount === 0
          ? "Sin resultados"
          : `Mostrando ${from}–${to} de ${totalCount}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" id="page-size-label">
            Por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={setPageSize}
            aria-labelledby="page-size-label"
          >
            <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Página {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || totalCount === 0}
          onClick={() => goToPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
