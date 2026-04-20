"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PositionCard } from "@/components/positions/position-card";
import type { PositionWithCount } from "@/src/types/position";
import { cn } from "@/lib/utils";

interface PositionsListProps {
  positions: PositionWithCount[];
}

export function PositionsList({ positions }: PositionsListProps) {
  const t = useTranslations("positions");
  const [search, setSearch] = useState("");
  const [closedExpanded, setClosedExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return positions;
    const q = search.toLowerCase();
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [positions, search]);

  const open = filtered.filter((p) => p.status === "Open");
  const closed = filtered.filter((p) => p.status === "Closed");

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          type="search"
          placeholder={t("searchPositions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => setSearch("")}
          >
            {t("clearSearch")}
          </Button>
        )}
        {search && (
          <span className="text-xs text-muted-foreground">
            {t("searchResults", { count: filtered.length })}
          </span>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? t("noSearchResults") : t("empty")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search ? t("noSearchResultsHint") : t("emptyHint")}
          </p>
        </div>
      )}

      {/* Open positions */}
      {open.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sectionOpen")} ({open.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </section>
      )}

      {/* Closed positions - Collapsible */}
      {closed.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setClosedExpanded(!closedExpanded)}
            className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                closedExpanded && "rotate-90",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {t("sectionClosed")} ({closed.length})
          </button>

          {closedExpanded && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((pos) => (
                <PositionCard key={pos.id} position={pos} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
