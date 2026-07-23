"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/app/icon";
import {
  searchFacetValues,
  type FacetKind,
  type FacetSuggestion,
} from "@/src/lib/facet-search-actions";

interface TokenAutocompleteProps {
  label: string;
  kind: FacetKind;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/**
 * Input de tokens con autocomplete (typeahead) para facetas multi-valor.
 * Reemplaza la lista de checkboxes: solo pide sugerencias que matchean lo
 * tipeado (server action + cache), con base count. Soporta varios valores.
 */
export function TokenAutocomplete({
  label,
  kind,
  selected,
  onChange,
  placeholder,
}: TokenAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FacetSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchFacetValues(kind, query);
        setSuggestions(res);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open, kind]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function add(value: string) {
    if (!selected.includes(value)) onChange([...selected, value]);
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  }

  const available = suggestions.filter((s) => !selected.includes(s.value));

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
      <div style={{ position: "relative" }}>
        <div className="tokenbox" onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
          {selected.map((v) => (
            <span key={v} className="token">
              {v}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(v); }}
                aria-label={`Quitar ${v}`}
              >
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="token-input"
            value={query}
            placeholder={selected.length === 0 ? (placeholder ?? "Escribe para buscar…") : ""}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
        </div>
        {open && (
          <div className="token-menu">
            {pending && available.length === 0 ? (
              <div className="token-empty">Buscando…</div>
            ) : available.length === 0 ? (
              <div className="token-empty">{query ? "Sin coincidencias" : "Escribe para buscar"}</div>
            ) : (
              available.map((s) => (
                <button key={s.value} type="button" className="token-opt" onClick={() => add(s.value)}>
                  <span className="truncate">{s.value}</span>
                  <span className="token-count">{s.count}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
