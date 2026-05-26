"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidateSearchCard } from "@/components/positions/candidate-search-card";
import { searchCandidatesForPosition } from "@/src/lib/positions-actions";
import { isoDateDaysAgo, isoDateToday } from "@/src/lib/candidate-list-params";
import type { CandidateSearchResult } from "@/src/types/position";
import type { Position } from "@/src/types/position";

const ALL = "__all__";

interface AiSearchViewProps {
  positionId: string;
  position: Position;
  seniorityOptions: string[];
}

export function AiSearchView({ positionId, position, seniorityOptions }: AiSearchViewProps) {
  const t = useTranslations("positions");
  const tFilters = useTranslations("filters");
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState<string>(ALL);
  const defaultDateFrom = isoDateDaysAgo(30);
  const defaultDateTo = isoDateToday();
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDefaultDateRange = dateFrom === defaultDateFrom && dateTo === defaultDateTo;

  async function runSearch(q: string, sen: string, from: string, to: string) {
    setError(null);
    setSearched(false);
    startTransition(async () => {
      const res = await searchCandidatesForPosition(
        q,
        positionId,
        sen === ALL ? undefined : sen,
        from,
        to,
      );
      if (!res.ok) {
        setError(res.error);
        setResults([]);
      } else {
        setResults(res.results);
        setSearched(true);
      }
    });
  }

  // Auto-búsqueda al montar usando datos de la plaza
  useEffect(() => {
    void runSearch("", ALL, defaultDateFrom, defaultDateTo);
    // Solo al montar — positionId no cambia en esta página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query, seniority, dateFrom, dateTo);
  }

  function handleAdded(candidateId: string) {
    setResults((prev) => prev.filter((r) => r.id !== candidateId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">{t("searchHint")}</p>
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="flex-1"
              disabled={isPending}
            />
            {seniorityOptions.length > 0 && (
              <Select value={seniority} onValueChange={setSeniority} disabled={isPending}>
                <SelectTrigger className="h-10 w-full sm:w-44">
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
            )}
            <Button type="submit" disabled={isPending} className="shrink-0">
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {isPending ? t("searching") : t("searchButton")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="ai-search-date-from"
                className="text-xs text-muted-foreground"
              >
                {tFilters("dateFrom")}
              </label>
              <Input
                id="ai-search-date-from"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isPending}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="ai-search-date-to"
                className="text-xs text-muted-foreground"
              >
                {tFilters("dateTo")}
              </label>
              <Input
                id="ai-search-date-to"
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isPending}
                className="h-8 w-36 text-xs"
              />
            </div>
            {!isDefaultDateRange && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom(defaultDateFrom);
                  setDateTo(defaultDateTo);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {tFilters("dateReset")}
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {isPending && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Spinner className="h-6 w-6 text-primary" />
          <span className="text-sm text-muted-foreground">{t("searchingAi")}</span>
        </div>
      )}

      {!isPending && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("noResultsHint")}</p>
        </div>
      )}

      {!isPending && results.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("resultsCount", { count: results.length })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <CandidateSearchCard
                key={r.id}
                result={r}
                positionId={positionId}
                positionTitle={position.title}
                onAdded={handleAdded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
