import { cn } from "@/lib/utils";

/**
 * Wordmark de ReclutaIT: tile iris con el glyph `< ✦ >` + "Recluta" en
 * Hanken Grotesk y "IT" en JetBrains Mono color marca.
 * Ver reclutait/docs/design (logo).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight select-none",
        className,
      )}
    >
      <span
        className="grid size-9 place-items-center rounded-[10px]"
        style={{
          background:
            "linear-gradient(150deg, var(--brand), var(--brand-strong))",
          boxShadow: "0 5px 14px -4px oklch(0.47 0.142 282 / 0.5)",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" width="22" height="22">
          <path
            d="M15 11L9 20L15 29"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M25 11L31 20L25 29"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 13.5C20 18 20.4 18.8 24 20 20.4 21.2 20 22 20 26.5 20 22 19.6 21.2 16 20 19.6 18.8 20 18 20 13.5Z"
            fill="#fff"
          />
        </svg>
      </span>
      <span style={{ color: "var(--ink)" }}>
        Recluta
        <span
          className="font-mono font-bold"
          style={{ color: "var(--brand)", marginLeft: "-2px" }}
        >
          IT
        </span>
      </span>
    </span>
  );
}
