"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { closePosition } from "@/src/lib/positions-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ClosePositionDialogProps {
  positionId: string;
  positionTitle: string;
}

export function ClosePositionDialog({
  positionId,
  positionTitle,
}: ClosePositionDialogProps) {
  const t = useTranslations("positions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closePosition(positionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          {t("closeButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("closeConfirmTitle")}</DialogTitle>
          <DialogDescription>
            {t("closeConfirmDescription", { title: positionTitle })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
          >
            {isPending ? t("closing") : t("closeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
