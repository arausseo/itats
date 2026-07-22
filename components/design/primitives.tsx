import { cn } from "@/lib/utils";

/**
 * Primitivas de diseño ReclutaIT (Fase 0).
 * Presentacionales y sin estado — seguras en Server o Client Components.
 * Tolerantes a datos ausentes (score/CEFR null → estado neutro), para
 * soportar el fallback mientras la señal AI (Fase 5) no exista.
 */

/** Color de score según umbral: ≥80 pos · ≥65 warn · resto neg · null faint. */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "var(--faint)";
  if (score >= 80) return "var(--pos)";
  if (score >= 65) return "var(--warn)";
  return "var(--neg)";
}

/** Iniciales a partir de un nombre completo (máx 2 letras). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  initials,
  size = 40,
  square = true,
  className,
  style,
}: {
  initials: string;
  size?: number;
  square?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("avatar", square && "sq", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, ...style }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/** Anillo de score (match/perfil). `score` null → anillo neutro con "—". */
export function ScoreRing({
  score,
  size = 104,
  stroke = 9,
  label = "match",
}: {
  score: number | null | undefined;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const has = score != null;
  const col = scoreColor(score);
  const off = has ? c * (1 - (score as number) / 100) : c;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)" }}
        />
      </svg>
      <div className="num">
        <b style={{ color: col, fontSize: size * 0.3 }}>{has ? score : "—"}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Medidor CEFR A1–C2. `level` null → todo apagado (sin datos). */
export function CefrMeter({ level }: { level: string | null | undefined }) {
  const idx = level ? CEFR_LEVELS.indexOf(level.toUpperCase() as (typeof CEFR_LEVELS)[number]) : -1;
  return (
    <div className="cefr">
      {CEFR_LEVELS.map((l, k) => (
        <i key={l} className={idx < 0 ? "" : k < idx ? "on" : k === idx ? "cur" : ""}>
          {l}
        </i>
      ))}
    </div>
  );
}

/** Chip pequeño (skill/tag técnico). */
export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}

/** Score compacto en mono, coloreado por umbral. */
export function ScoreChip({ score }: { score: number | null | undefined }) {
  return (
    <span className="scoreN" style={{ color: scoreColor(score) }}>
      {score ?? "—"}
    </span>
  );
}
