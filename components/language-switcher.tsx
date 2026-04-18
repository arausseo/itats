"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("header");

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t("language")}</span>
      <Select
        value={locale}
        onValueChange={(next) => {
          router.replace(pathname, { locale: next });
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-[7.5rem] text-xs"
          aria-label={t("language")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {routing.locales.map((loc) => (
            <SelectItem key={loc} value={loc} className="text-xs">
              {loc === "es" ? t("localeEs") : t("localeEn")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
