import { cn } from "@/lib/utils";

/**
 * Ring spinner. Color is controlled via `text-*` — track uses 15% opacity,
 * arc uses full opacity of the current color.
 * Example: <Spinner className="h-8 w-8 text-primary" />
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block rounded-full",
        "border-[3px] border-current/15 border-t-current",
        "animate-spin",
        className,
      )}
    />
  );
}
