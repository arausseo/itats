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

export function PositionsList({ positions }: PositionsListProps) {
  const t = useTranslations("positions");
  const locale = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = [...positions].sort((a, b) => {
      // Abiertas primero, luego por fecha desc
      if (a.status !== b.status) return a.status === "Open" ? -1 : 1;
      return 0;
    });
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [positions, search]);

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
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("searchPositions")}
          />
        </div>
        {search && (
          <span style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600 }}>
            {t("searchResults", { count: filtered.length })}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: "56px 24px" }}>
          <p style={{ fontSize: 14, color: "var(--faint)" }}>
            {search ? t("noSearchResults") : t("empty")}
          </p>
          <p style={{ marginTop: 4, fontSize: 12.5, color: "var(--faint)" }}>
            {search ? t("noSearchResultsHint") : t("emptyHint")}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 8px" }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "48%" }}>{t("colPosition")}</th>
                  <th style={{ textAlign: "center" }}>{t("candidates")}</th>
                  <th>{t("colAdded")}</th>
                  <th>{t("colStatus")}</th>
                  <th style={{ width: 60 }} aria-label="acciones" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} onClick={() => router.push(`/positions/${p.id}`)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}
                      >
                        <Icon name="users" size={13} style={{ color: "var(--faint)" }} />
                        {p.candidate_count}
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
      )}
    </div>
  );
}
