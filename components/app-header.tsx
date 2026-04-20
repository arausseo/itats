import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { getUserProfile } from "@/src/lib/user-profile";
import { signOut } from "@/src/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppNavLinks } from "@/components/app-nav-links";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const t = await getTranslations("header");
  const profile = await getUserProfile();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="shrink-0">
          <span className="text-sm font-bold tracking-tight text-foreground">
            {t("brand")}
          </span>
        </Link>

        {/* Nav links */}
        <AppNavLinks
          labels={{
            dashboard: t("dashboard"),
            candidates: t("candidates"),
            positions: t("positions"),
            upload: t("uploadCvs"),
          }}
        />

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {profile && (
            <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground lg:block">
              {t("organization", { name: profile.organizationName })}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground sm:block">
            {user.email}
          </span>
          <LanguageSwitcher />
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
