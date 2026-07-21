import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Etiqueta corta en mono/iris sobre el título (firma de marca ReclutaIT). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Acciones a la derecha (botones, diálogos). */
  actions?: ReactNode;
}

/**
 * Encabezado de página unificado para las pantallas internas.
 * eyebrow (mono/iris) → título → subtítulo, con acciones opcionales.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
