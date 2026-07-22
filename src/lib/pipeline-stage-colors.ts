import type { PipelineStatus } from "@/src/types/position";

/**
 * Color de marca por stage del pipeline (designV2). Usado por el funnel
 * interactivo y por el StatusSelect pill. Valores en CSS vars/OKLCH del
 * sistema de diseño.
 */
export const STAGE_COLOR: Record<PipelineStatus, string> = {
  Sourced: "var(--faint)",
  "To Contact": "var(--eng)",
  Screening: "var(--brand)",
  "Tech Assessment": "oklch(0.55 0.15 300)",
  Interview: "var(--warn)",
  Offer: "var(--clay)",
  Hired: "var(--pos)",
  Rejected: "var(--neg)",
};
