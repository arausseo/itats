import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { normalizeStringArray } from "@/src/types/candidate";

export type BadgeVariant = NonNullable<
  ComponentProps<typeof Badge>["variant"]
>;

export function seniorityBadgeProps(label: string): {
  variant: BadgeVariant;
  className?: string;
} {
  const n = label.toLowerCase().trim();
  if (n.includes("junior")) {
    return { variant: "secondary" };
  }
  if (n.includes("mid") || n.includes("semi")) {
    return { variant: "outline" };
  }
  if (
    n.includes("lead") ||
    n.includes("principal") ||
    n.includes("staff")
  ) {
    return {
      variant: "secondary",
      className:
        "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    };
  }
  if (n.includes("senior") || /\bsr\b/.test(n)) {
    return { variant: "default" };
  }
  return {
    variant: "outline",
    className: "text-muted-foreground border-dashed",
  };
}

export function formatSectores(sectores: unknown): string {
  const list = normalizeStringArray(sectores);
  if (list.length === 0) {
    return "—";
  }
  const head = list.slice(0, 2).join(", ");
  const rest = list.length > 2 ? ` +${list.length - 2}` : "";
  return `${head}${rest}`;
}
