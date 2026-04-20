"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
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
import { Spinner } from "@/components/ui/spinner";

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
  const t = useTranslations("filters");
  const [isPending, startTransition] = useTransition();
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
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
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
    const timer = window.setTimeout(() => {
      if (qInput.trim() === qFromUrl.trim()) {
        return;
      }
      pushTextFilters({ q: qInput });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [qInput, qFromUrl, pushTextFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (libreInput.trim() === libreFromUrl.trim()) {
        return;
      }
      pushTextFilters({ libre: libreInput });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [libreInput, libreFromUrl, pushTextFilters]);

  const selectValue = seniorityFromUrl.trim() || ALL_SENIORITY;
  const paisSelectValue = paisFromUrl.trim() || ALL_PAIS;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Fila 1: solo nombre y búsqueda libre */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="candidate-q"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("searchName")}
          </label>
          <Input
            id="candidate-q"
            type="search"
            placeholder={t("namePlaceholder")}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="candidate-libre"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("searchLibre")}
          </label>
          <Input
            id="candidate-libre"
            type="search"
            placeholder={t("librePlaceholder")}
            value={libreInput}
            onChange={(e) => setLibreInput(e.target.value)}
            autoComplete="off"
          />
        </div>

        {isPending ? (
          <div className="flex shrink-0 items-center justify-center pb-0.5 sm:pb-1.5">
            <Spinner className="h-4 w-4 text-primary" />
          </div>
        ) : null}
      </div>

      {/* Fila 2: senioridad, país, rol */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">
            {t("seniority")}
          </span>
          <Select
            value={selectValue}
            onValueChange={(value) => {
              const seniority = value === ALL_SENIORITY ? "" : value;
              pushTextFilters({ seniority });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("seniorityAll")} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL_SENIORITY}>
                {t("seniorityAllWithCount", {
                  count: facetCounts.seniorityTotal,
                })}
              </SelectItem>
              {seniorityOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s} ({facetCounts.seniority[s] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">
            {t("country")}
          </span>
          <Select
            value={paisSelectValue}
            onValueChange={(value) => {
              const nextPais = value === ALL_PAIS ? "" : value;
              pushTextFilters({ pais: nextPais });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("countryAll")} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL_PAIS}>
                {t("countryAllWithCount", { count: facetCounts.paisTotal })}
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
          label={t("rol")}
          options={rolOptions}
          selected={rolSelected}
          onChange={(rol) => replaceUrl({ rol, page: "1" })}
          optionCounts={facetCounts.rol}
          facetTotal={facetCounts.rolTotal}
          className="min-w-0"
        />
      </div>

      {/* Fila 3: stack, frameworks, patrones */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MultiSelectFilter
          label={t("stack")}
          options={stackOptions}
          selected={stackSelected}
          onChange={(stack) => replaceUrl({ stack, page: "1" })}
          optionCounts={facetCounts.stack}
          facetTotal={facetCounts.stackTotal}
          className="min-w-0"
        />
        <MultiSelectFilter
          label={t("frameworks")}
          options={frameworkOptions}
          selected={fwSelected}
          onChange={(fw) => replaceUrl({ fw, page: "1" })}
          optionCounts={facetCounts.frameworks}
          facetTotal={facetCounts.frameworksTotal}
          className="min-w-0"
        />
        <MultiSelectFilter
          label={t("patrones")}
          options={patronOptions}
          selected={patSelected}
          onChange={(pat) => replaceUrl({ pat, page: "1" })}
          optionCounts={facetCounts.patrones}
          facetTotal={facetCounts.patronesTotal}
          className="min-w-0"
        />
      </div>
    </div>
  );
}
