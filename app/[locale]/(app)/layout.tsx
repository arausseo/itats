import { getTranslations } from "next-intl/server";
import { QueueProvider } from "@/components/providers/queue-provider";
import { SidebarContent } from "@/components/sidebar-content";
import { MobileNav } from "@/components/mobile-nav";
import { createClient } from "@/src/utils/supabase/server";
import { getUserProfile } from "@/src/lib/user-profile";

export default async function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión (p. ej. /login): sin shell, solo el contenido.
  if (!user) {
    return <QueueProvider>{children}</QueueProvider>;
  }

  const t = await getTranslations("header");
  const profile = await getUserProfile();

  const labels = {
    dashboard: t("dashboard"),
    candidates: t("candidates"),
    positions: t("positions"),
    upload: t("uploadCvs"),
  };
  const organization = profile
    ? t("organization", { name: profile.organizationName })
    : null;
  const signOutLabel = t("signOut");
  const menuLabel = t("menu");
  const themeLabels = { light: t("themeLight"), dark: t("themeDark") };

  return (
    <QueueProvider>
      <div className="flex min-h-screen">
        {/* Sidebar fijo (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/70 bg-sidebar lg:flex lg:flex-col">
          <SidebarContent
            labels={labels}
            organization={organization}
            email={user.email}
            signOutLabel={signOutLabel}
            themeLabels={themeLabels}
          />
        </aside>

        {/* Columna principal */}
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav
            labels={labels}
            organization={organization}
            email={user.email}
            signOutLabel={signOutLabel}
            themeLabels={themeLabels}
            menuLabel={menuLabel}
          />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </QueueProvider>
  );
}
