"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PARAM_ROL,
  PARAM_FW,
  PARAM_PAT,
  PARAM_STACK,
} from "@/src/lib/candidate-list-params";
import {
  listParamFromSearchParams,
  mergeCandidateListUrl,
  type CandidateListUrlPatch,
} from "@/src/lib/candidate-list-url-client";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import type { FacetCountBundle } from "@/src/lib/candidate-facet-counts";
import { cn } from "@/lib/utils";

const ALL_SENIORITY = "__all__";
const ALL_PAIS = "__all_pais__";

export type CandidateFiltersProps = {
  seniorityOptions: string[];
  paisOptions: string[];
  rolOptions: string[];
  stackOptions: string[];
  frameworkOptions: string[];
  patronOptions: string[];
  facetCounts: FacetCountBundle;
  className?: string;
};

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function CandidateFilters({
  seniorityOptions,
  paisOptions,
  rolOptions,
  stackOptions,
  frameworkOptions,
  patronOptions,
  facetCounts,
  className,
}: CandidateFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qFromUrl = getSingleParam(searchParams.get("q") ?? undefined) ?? "";
  const libreFromUrl =
    getSingleParam(searchParams.get("libre") ?? undefined) ?? "";
  const seniorityFromUrl =
    getSingleParam(searchParams.get("seniority") ?? undefined) ?? "";
  const paisFromUrl =
    getSingleParam(searchParams.get("pais") ?? undefined) ?? "";

  const rolSelected = listParamFromSearchParams(searchParams, PARAM_ROL);
  const stackSelected = listParamFromSearchParams(searchParams, PARAM_STACK);
  const fwSelected = listParamFromSearchParams(searchParams, PARAM_FW);
  const patSelected = listParamFromSearchParams(searchParams, PARAM_PAT);

  const [qInput, setQInput] = useState(qFromUrl);
  const [libreInput, setLibreInput] = useState(libreFromUrl);

  useEffect(() => {
    setQInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    setLibreInput(libreFromUrl);
  }, [libreFromUrl]);

  const replaceUrl = useCallback(
    (patch: CandidateListUrlPatch) => {
      const p = mergeCandidateListUrl(
        new URLSearchParams(searchParams.toString()),
        patch,
      );
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const pushTextFilters = useCallback(
    (next: {
      q?: string;
      libre?: string;
      seniority?: string;
      pais?: string;
    }) => {
      const patch: CandidateListUrlPatch = { page: "1" };
      if (next.q !== undefined) {
        patch.q = next.q;
      }
      if (next.libre !== undefined) {
        patch.libre = next.libre;
      }
      if (next.seniority !== undefined) {
        patch.seniority = next.seniority;
      }
      if (next.pais !== undefined) {
        patch.pais = next.pais;
      }
      replaceUrl(patch);
    },
    [replaceUrl],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (qInput.trim() === qFromUrl.trim()) {
        return;
      }
      pushTextFilters({ q: qInput });
    }, 320);
    return () => window.clearTimeout(t);
  }, [qInput, qFromUrl, pushTextFilters]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (libreInput.trim() === libreFromUrl.trim()) {
        return;
      }
      pushTextFilters({ libre: libreInput });
    }, 320);
    return () => window.clearTimeout(t);
  }, [libreInput, libreFromUrl, pushTextFilters]);

  const selectValue = seniorityFromUrl.trim() || ALL_SENIORITY;
  const paisSelectValue = paisFromUrl.trim() || ALL_PAIS;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        className,
      )}
    >
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <label
          htmlFor="candidate-q"
          className="text-xs font-medium text-muted-foreground"
        >
          Buscar por nombre
        </label>
        <Input
          id="candidate-q"
          type="search"
          placeholder="Nombre…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <label
          htmlFor="candidate-libre"
          className="text-xs font-medium text-muted-foreground"
        >
          Buscar en resumen, stacks, certificaciones…
        </label>
        <Input
          id="candidate-libre"
          type="search"
          placeholder="Término en resumen, lenguajes, frameworks…"
          value={libreInput}
          onChange={(e) => setLibreInput(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="min-w-[200px] space-y-1.5">
        <span className="block text-xs font-medium text-muted-foreground">
          Seniority
        </span>
        <Select
          value={selectValue}
          onValueChange={(value) => {
            const seniority = value === ALL_SENIORITY ? "" : value;
            pushTextFilters({ seniority });
          }}
        >
          <SelectTrigger className="w-full min-w-[200px]">
            <SelectValue placeholder="Todos los niveles" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_SENIORITY}>
              Todos los niveles ({facetCounts.seniorityTotal})
            </SelectItem>
            {seniorityOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s} ({facetCounts.seniority[s] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px] space-y-1.5">
        <span className="block text-xs font-medium text-muted-foreground">
          País
        </span>
        <Select
          value={paisSelectValue}
          onValueChange={(value) => {
            const nextPais = value === ALL_PAIS ? "" : value;
            pushTextFilters({ pais: nextPais });
          }}
        >
          <SelectTrigger className="w-full min-w-[200px]">
            <SelectValue placeholder="Todos los países" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_PAIS}>
              Todos los países ({facetCounts.paisTotal})
            </SelectItem>
            {paisOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p} ({facetCounts.pais[p] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MultiSelectFilter
        label="Rol principal"
        options={rolOptions}
        selected={rolSelected}
        onChange={(rol) => replaceUrl({ rol, page: "1" })}
        optionCounts={facetCounts.rol}
        facetTotal={facetCounts.rolTotal}
      />
      <MultiSelectFilter
        label="Stack (lenguajes)"
        options={stackOptions}
        selected={stackSelected}
        onChange={(stack) => replaceUrl({ stack, page: "1" })}
        optionCounts={facetCounts.stack}
        facetTotal={facetCounts.stackTotal}
      />
      <MultiSelectFilter
        label="Frameworks"
        options={frameworkOptions}
        selected={fwSelected}
        onChange={(fw) => replaceUrl({ fw, page: "1" })}
        optionCounts={facetCounts.frameworks}
        facetTotal={facetCounts.frameworksTotal}
      />
      <MultiSelectFilter
        label="Patrones"
        options={patronOptions}
        selected={patSelected}
        onChange={(pat) => replaceUrl({ pat, page: "1" })}
        optionCounts={facetCounts.patrones}
        facetTotal={facetCounts.patronesTotal}
      />
    </div>
  );
}
