import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { getUserProfile } from "@/src/lib/user-profile";
import { signOut } from "@/src/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const t = await getTranslations("header");
  const profile = await getUserProfile();

  return (
    <header className="border-b border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold tracking-tight">{t("brand")}</span>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground md:block">
              {t("organization", { name: profile.organizationName })}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground sm:block">
            {user.email}
          </span>
          <LanguageSwitcher />
          <Link href="/positions">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              {t("positions")}
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              {t("uploadCvs")}
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
