"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { createPosition } from "@/src/lib/positions-actions";
import { POSITION_FIELD_LIMITS } from "@/src/lib/position-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RefinableTextarea } from "@/components/positions/refinable-textarea";

export function CreatePositionDialog() {
  const t = useTranslations("positions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");

  // Client-side validation for title
  const titleLength = title.trim().length;
  const titleLimits = POSITION_FIELD_LIMITS.title;
  const titleTooShort = titleLength > 0 && titleLength < titleLimits.min;
  const titleTooLong = titleLength > titleLimits.max;
  const titleInvalid = titleTooShort || titleTooLong;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (titleInvalid) return;
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPosition(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setTitle("");
      setOpen(false);
      router.refresh();
    });
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          + {t("createButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Título */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-foreground">
                {t("fieldTitle")} <span className="text-destructive">*</span>
              </label>
              <p className="tabular-nums text-xs text-muted-foreground">
                {titleLength} / {titleLimits.max}
              </p>
            </div>
            <Input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              autoFocus
              className={titleInvalid ? "border-destructive focus-visible:ring-destructive/40" : ""}
            />
            {titleTooShort && (
              <p className="mt-1 text-xs text-destructive">{t("fieldTitleMin")}</p>
            )}
            {titleTooLong && (
              <p className="mt-1 text-xs text-destructive">{t("fieldTitleMax")}</p>
            )}
          </div>

          {/* Descripción */}
          <RefinableTextarea
            name="description"
            field="description"
            label={t("fieldDescription")}
            placeholder={t("fieldDescriptionPlaceholder")}
            rows={6}
            positionTitle={title}
          />

          {/* Requisitos */}
          <RefinableTextarea
            name="requirements"
            field="requirements"
            label={t("fieldRequirements")}
            placeholder={t("fieldRequirementsPlaceholder")}
            rows={6}
            positionTitle={title}
          />

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending || titleInvalid}>
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
