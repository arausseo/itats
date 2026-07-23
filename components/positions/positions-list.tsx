"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { Icon } from "@/components/app/icon";
import { StatusBadge } from "@/components/app/dashboard-ui";
import type { PositionWithCount } from "@/src/types/position";

interface PositionsListProps {
  positions: PositionWithCount[];
}

const PAGE_SIZES = [10, 25, 50] as const;

export function PositionsList({ positions }: PositionsListProps) {
  const t = useTranslations("positions");
  const locale = useLocale();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  // Filtrado por búsqueda (sobre todo el set).
  const bySearch = useMemo(() => {
    if (!search.trim()) return positions;
    const q = search.toLowerCase();
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [positions, search]);

  const closedCount = useMemo(
    () => bySearch.filter((p) => p.status === "Closed").length,
    [bySearch],
  );

  // Estado (cerradas ocultas por defecto) + orden (abiertas primero).
  const visible = useMemo(() => {
    const base = showClosed ? bySearch : bySearch.filter((p) => p.status === "Open");
    return [...base].sort((a, b) => {
      if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
      return 0;
    });
  }, [bySearch, showClosed]);

  const total = visible.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
    } catch {
      return "—";
    }
  };

  return (
    <div>
      {/* Filtros */}
      <div className="filters">
        <div className="search" style={{ width: 260 }}>
          <Icon name="search" size={16} />
          <input
            placeholder={t("searchPositions")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label={t("searchPositions")}
          />
        </div>

        <button
          type="button"
          className={"fchip" + (showClosed ? " on" : "")}
          onClick={() => { setShowClosed((v) => !v); setPage(1); }}
          aria-pressed={showClosed}
        >
          <Icon name={showClosed ? "eye" : "filter"} size={13} />
          {t("showClosed")}
          {closedCount > 0 && (
            <span className="mono" style={{ opacity: 0.7 }}>({closedCount})</span>
          )}
        </button>

        {search && (
          <span style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600 }}>
            {t("searchResults", { count: total })}
          </span>
        )}

        {/* Page size */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--faint)", fontWeight: 600 }}>
          {t("perPage")}
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={"fchip sm" + (pageSize === s ? " on" : "")}
              onClick={() => { setPageSize(s); setPage(1); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: "56px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--faint)" }}>
            {search ? t("noSearchResults") : t("empty")}
          </p>
          <p style={{ marginTop: 4, fontSize: 12.5, color: "var(--faint)" }}>
            {search ? t("noSearchResultsHint") : t("emptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: "6px 8px" }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "42%" }}>{t("colPosition")}</th>
                    <th style={{ textAlign: "center" }}>{t("candidates")}</th>
                    <th style={{ textAlign: "center" }}>{t("colViewsApps")}</th>
                    <th>{t("colAdded")}</th>
                    <th>{t("colStatus")}</th>
                    <th style={{ width: 60 }} aria-label="acciones" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p, i) => (
                    <tr key={p.id} onClick={() => router.push(`/positions/${p.id}`)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <span className="mono" style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>
                            #{(safePage - 1) * pageSize + i + 1}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}>
                          <Icon name="users" size={13} style={{ color: "var(--faint)" }} />
                          {p.candidate_count}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--faint)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }} title={t("colViews")}>
                            <Icon name="eye" size={13} />
                            {p.views}
                          </span>
                          <span
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: p.application_count > 0 ? "var(--brand-strong)" : "var(--faint)" }}
                            title={t("colApplications")}
                          >
                            <Icon name="doc" size={13} />
                            {p.application_count}
                          </span>
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--faint)" }}>{fmtDate(p.created_at)}</td>
                      <td>
                        <StatusBadge
                          open={p.status === "Open"}
                          label={p.status === "Open" ? t("statusOpen") : t("statusClosed")}
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="icon-btn sm"
                            aria-label={t("viewProfile")}
                            onClick={() => router.push(`/positions/${p.id}`)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          <div className="pager">
            <span>{t("pageResults", { count: total })}</span>
            <div className="grow">
              <button
                type="button"
                className="icon-btn sm"
                aria-label={t("prevPage")}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icon name="chevLeft" size={15} />
              </button>
              <span style={{ minWidth: 92, textAlign: "center" }}>
                {t("pageOf", { page: safePage, total: totalPages })}
              </span>
              <button
                type="button"
                className="icon-btn sm"
                aria-label={t("nextPage")}
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Icon name="chevRight" size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
