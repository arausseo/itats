"use client";

import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";

const subscribeOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

interface Props {
  orgSlug: string | null;
  positionId: string;
  positionStatus: "Open" | "Closed";
}

/**
 * Tarjeta que muestra la URL pública de la plaza (para compartir en LinkedIn).
 * Sólo se muestra si la org tiene slug y la plaza está abierta.
 */
export function PublicLinkCard({ orgSlug, positionId, positionStatus }: Props) {
  const t = useTranslations("publicLink");
  const locale = useLocale();
  const origin = useSyncExternalStore(
    subscribeOrigin,
    getOrigin,
    getServerOrigin,
  );

  if (!orgSlug) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950 dark:text-amber-200">
        {t("missingSlug")}
      </div>
    );
  }

  if (positionStatus !== "Open") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        {t("closedHint")}
      </div>
    );
  }

  const url = origin
    ? `${origin}/${locale}/apply/${orgSlug}/${positionId}`
    : `/${locale}/apply/${orgSlug}/${positionId}`;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{t("title")}</p>
        <CopyToClipboardButton value={url} aria-label={t("copyAria")} />
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t("subtitle")}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block truncate text-xs text-primary underline-offset-2 hover:underline"
      >
        {url}
      </a>
    </div>
  );
}
