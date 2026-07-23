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
  PARAM_DATE_FROM,
  PARAM_DATE_TO,
} from "@/src/lib/candidate-list-params";
import {
  listParamFromSearchParams,
  mergeCandidateListUrl,
  type CandidateListUrlPatch,
} from "@/src/lib/candidate-list-url-client";
import { TokenAutocomplete } from "@/components/features/token-autocomplete";
import { Icon } from "@/components/app/icon";
import type { FacetOption } from "@/src/lib/candidate-filters-server";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const ALL_SENIORITY = "__all__";
const ALL_PAIS = "__all_pais__";

export type CandidateFiltersProps = {
  /** Opciones escalares precargadas desde la cache (con base count). */
  seniorityOptions: FacetOption[];
  paisOptions: FacetOption[];
  defaultDateFrom: string;
  defaultDateTo: string;
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
  defaultDateFrom,
  defaultDateTo,
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

  const dateFromUrl =
    getSingleParam(searchParams.get(PARAM_DATE_FROM) ?? undefined) ?? defaultDateFrom;
  const dateToUrl =
    getSingleParam(searchParams.get(PARAM_DATE_TO) ?? undefined) ?? defaultDateTo;

  const rolSelected = listParamFromSearchParams(searchParams, PARAM_ROL);
  const stackSelected = listParamFromSearchParams(searchParams, PARAM_STACK);
  const fwSelected = listParamFromSearchParams(searchParams, PARAM_FW);
  const patSelected = listParamFromSearchParams(searchParams, PARAM_PAT);

  const [qInput, setQInput] = useState(qFromUrl);
  const [libreInput, setLibreInput] = useState(libreFromUrl);
  const [dateFromInput, setDateFromInput] = useState(dateFromUrl);
  const [dateToInput, setDateToInput] = useState(dateToUrl);

  // Sincroniza el input local cuando cambia la URL (back/forward, filtro aplicado).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLibreInput(libreFromUrl);
  }, [libreFromUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateFromInput(dateFromUrl);
  }, [dateFromUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateToInput(dateToUrl);
  }, [dateToUrl]);

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
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const patch: CandidateListUrlPatch = { page: "1" };
      if (next.q !== undefined) patch.q = next.q;
      if (next.libre !== undefined) patch.libre = next.libre;
      if (next.seniority !== undefined) patch.seniority = next.seniority;
      if (next.pais !== undefined) patch.pais = next.pais;
      if (next.dateFrom !== undefined) patch.dateFrom = next.dateFrom;
      if (next.dateTo !== undefined) patch.dateTo = next.dateTo;
      replaceUrl(patch);
    },
    [replaceUrl],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFromInput(value);
      pushTextFilters({ dateFrom: value });
    },
    [pushTextFilters],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateToInput(value);
      pushTextFilters({ dateTo: value });
    },
    [pushTextFilters],
  );

  const isDefaultDateRange =
    dateFromInput === defaultDateFrom && dateToInput === defaultDateTo;

  const resetDateRange = useCallback(() => {
    setDateFromInput(defaultDateFrom);
    setDateToInput(defaultDateTo);
    replaceUrl({ dateFrom: "", dateTo: "", page: "1" });
  }, [defaultDateFrom, defaultDateTo, replaceUrl]);

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
    <div className={cn("flex flex-col gap-5", className)}>
      {/* Encabezado del rail */}
      <div className="flex items-center justify-between">
        <span className="eyebrow" style={{ fontSize: 10.5 }}>Filtros</span>
        {isPending && <Spinner className="h-3.5 w-3.5 text-primary" />}
      </div>

      {/* Búsqueda semántica */}
      <div
        className="space-y-1.5 rounded-[13px] p-3"
        style={{ background: "linear-gradient(165deg, var(--brand-tint), var(--surface) 82%)", border: "1px solid var(--brand-border)" }}
      >
        <label htmlFor="candidate-libre" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brand)" }}>
          <Icon name="spark" size={12} />
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

      {/* Registrado (rango de fechas) — primer filtro */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">{t("dateFrom")}</span>
        <Input
          id="candidate-date-from"
          type="date"
          value={dateFromInput}
          max={dateToInput}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">{t("dateTo")}</span>
        <Input
          id="candidate-date-to"
          type="date"
          value={dateToInput}
          min={dateFromInput}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="w-full"
        />
        {!isDefaultDateRange && (
          <button
            type="button"
            onClick={resetDateRange}
            className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("dateReset")}
          </button>
        )}
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label htmlFor="candidate-q" className="block text-xs font-semibold text-muted-foreground">
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

      {/* Seniority */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">{t("seniority")}</span>
        <Select
          value={selectValue}
          onValueChange={(value) => pushTextFilters({ seniority: value === ALL_SENIORITY ? "" : value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("seniorityAll")} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_SENIORITY}>{t("seniorityAll")}</SelectItem>
            {seniorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value} ({o.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* País */}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">{t("country")}</span>
        <Select
          value={paisSelectValue}
          onValueChange={(value) => pushTextFilters({ pais: value === ALL_PAIS ? "" : value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("countryAll")} />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_PAIS}>{t("countryAll")}</SelectItem>
            {paisOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value} ({o.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rol / Stack / Frameworks / Patrones — typeahead multi-valor */}
      <TokenAutocomplete
        label={t("rol")}
        kind="rol"
        selected={rolSelected}
        onChange={(rol) => replaceUrl({ rol, page: "1" })}
      />
      <TokenAutocomplete
        label={t("stack")}
        kind="lenguajes"
        selected={stackSelected}
        onChange={(stack) => replaceUrl({ stack, page: "1" })}
      />
      <TokenAutocomplete
        label={t("frameworks")}
        kind="frameworks"
        selected={fwSelected}
        onChange={(fw) => replaceUrl({ fw, page: "1" })}
      />
      <TokenAutocomplete
        label={t("patrones")}
        kind="patrones"
        selected={patSelected}
        onChange={(pat) => replaceUrl({ pat, page: "1" })}
      />
    </div>
  );
}
