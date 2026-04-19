"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectFilterProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Conteo por opción (misma faceta que el listado). */
  optionCounts?: Record<string, number>;
  /** Total de filas de la faceta (sin aplicar ese filtro). */
  facetTotal?: number;
  className?: string;
};

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  optionCounts,
  facetTotal,
  className,
}: MultiSelectFilterProps) {
  const t = useTranslations("multiSelect");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = useCallback(
    (value: string, checked: boolean) => {
      if (checked) {
        onChange([...selected, value]);
      } else {
        onChange(selected.filter((x) => x !== value));
      }
    },
    [onChange, selected],
  );

  const summary =
    selected.length === 0
      ? facetTotal !== undefined
        ? t("allWithCount", { count: facetTotal })
        : t("all")
      : selected.length === 1
        ? selected[0]
        : t("selectedCount", { count: selected.length });

  return (
    <div className={cn("min-w-[200px] space-y-1.5", className)}>
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-7 w-full min-w-[200px] justify-between font-normal"
          >
            <span className="truncate text-left">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="flex w-80 max-h-72 flex-col overflow-hidden p-0"
          align="start"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("noOptions")}</p>
          ) : (
            <>
              <div className="shrink-0 border-b border-border/60 p-2">
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-8 text-xs"
                  autoComplete="off"
                  aria-label={t("searchPlaceholder")}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("noMatches")}</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredOptions.map((opt) => {
                      const isOn = selected.includes(opt);
                      return (
                        <li key={opt}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60",
                            )}
                          >
                            <Checkbox
                              checked={isOn}
                              onCheckedChange={(c) => toggle(opt, c === true)}
                            />
                            <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 leading-tight">
                              <span className="min-w-0 break-words">{opt}</span>
                              {optionCounts ? (
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {optionCounts[opt] ?? 0}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
