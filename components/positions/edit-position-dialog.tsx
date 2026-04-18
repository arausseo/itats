"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { updatePosition } from "@/src/lib/positions-actions";
import type { Position } from "@/src/types/position";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditPositionDialogProps {
  position: Position;
}

export function EditPositionDialog({ position }: EditPositionDialogProps) {
  const t = useTranslations("positions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePosition(position.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        {t("editButton")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold">{t("editTitle")}</h2>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {t("fieldTitle")} <span className="text-destructive">*</span>
            </label>
            <Input
              name="title"
              required
              defaultValue={position.title}
              placeholder={t("fieldTitlePlaceholder")}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {t("fieldDescription")}
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={position.description}
              placeholder={t("fieldDescriptionPlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {t("fieldRequirements")}
            </label>
            <textarea
              name="requirements"
              rows={4}
              defaultValue={position.requirements}
              placeholder={t("fieldRequirementsPlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
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
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
