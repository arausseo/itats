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
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState<string>(ALL);
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runSearch(q: string, sen: string) {
    setError(null);
    setSearched(false);
    startTransition(async () => {
      const res = await searchCandidatesForPosition(
        q,
        positionId,
        sen === ALL ? undefined : sen,
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
    void runSearch("", ALL);
    // Solo al montar — positionId no cambia en esta página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query, seniority);
  }

  function handleAdded(candidateId: string) {
    setResults((prev) => prev.filter((r) => r.id !== candidateId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">{t("searchHint")}</p>
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
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
