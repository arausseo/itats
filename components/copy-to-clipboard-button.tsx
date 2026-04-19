"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClipboardCopyIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyToClipboardButton({
  value,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  "aria-label": string;
  className?: string;
}) {
  const t = useTranslations("sheet");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const v = value.trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [value]);

  if (!value.trim()) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground", className)}
      aria-label={ariaLabel}
      title={copied ? t("copied") : ariaLabel}
      onClick={() => void handleCopy()}
    >
      <HugeiconsIcon
        icon={ClipboardCopyIcon}
        strokeWidth={2}
        className={cn("size-3.5", copied && "text-emerald-600 dark:text-emerald-400")}
      />
    </Button>
  );
}
