import type { CSSProperties } from "react";
import { Icon } from "@/components/app/icon";

/** Spark relleno (firma IA). */
export function Spark({ size = 13, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden="true">
      <path d="M12 3l1.7 5.1L19 10l-5.3 1.6L12 17l-1.7-5.4L5 10l5.3-1.9z" />
    </svg>
  );
}

/** Color de score: ≥80 verde, ≥65 ámbar, si no rojo; null → faint. */
export function scoreColor(s: number | null): string {
  if (s == null) return "var(--faint)";
  if (s >= 80) return "var(--pos)";
  if (s >= 65) return "var(--warn)";
  return "var(--neg)";
}

export function StatCard({
  icon,
  iconBg,
  iconFg,
  value,
  label,
}: {
  icon: string;
  iconBg: string;
  iconFg: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="stat">
      <div className="ico" style={{ background: iconBg, color: iconFg }}>
        <Icon name={icon} size={19} />
      </div>
      <div className="v">{value}</div>
      <div className="k">{label}</div>
    </div>
  );
}

export function StatusBadge({ open, label }: { open: boolean; label: string }) {
  return (
    <span className={"badge " + (open ? "b-pub" : "b-closed")}>
      <span className="d" />
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="badge"
      style={{ background: "var(--brand-tint)", color: "var(--brand-strong)" }}
    >
      {role}
    </span>
  );
}

export function ScoreChip({ score }: { score: number | null }) {
  return (
    <div className="score-chip">
      <b style={{ color: scoreColor(score) }}>{score ?? "—"}</b>
      <span>match</span>
    </div>
  );
}

/**
 * Anillo de progreso. `score` colorea/rellena por defecto; se puede
 * override con `display` (texto central), `color` y `fillPct`.
 */
export function ScoreRing({
  score = null,
  size = 92,
  stroke = 9,
  label,
  display,
  color,
  fillPct,
}: {
  score?: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  display?: string | number;
  color?: string;
  fillPct?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = color ?? scoreColor(score);
  const pct = fillPct ?? score ?? 0;
  const off = c * (1 - pct / 100);
  const gid = `sr-${size}-${String(display ?? score)}`;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={col} />
            <stop offset="1" stopColor={col} stopOpacity="0.72" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="num">
        <b style={{ color: col, fontSize: size * 0.28 }}>{display ?? score ?? "—"}</b>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
