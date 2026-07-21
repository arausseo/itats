import { getTranslations } from "next-intl/server";
import { QueueProvider } from "@/components/providers/queue-provider";
import { AppSidebar, type ShellData } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { AppMobileBar } from "@/components/app/app-mobile-bar";
import { createClient } from "@/src/utils/supabase/server";
import { getUserProfile } from "@/src/lib/user-profile";

/** Iniciales (máx 2) a partir de un nombre o email. */
function initials(source: string, max = 2): string {
  const parts = source.trim().split(/[\s@._-]+/).filter(Boolean);
  const chars = parts.slice(0, max).map((p) => p[0]!.toUpperCase());
  return chars.join("") || "·";
}

export default async function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión (p. ej. /login): sin shell.
  if (!user) {
    return <QueueProvider>{children}</QueueProvider>;
  }

  const t = await getTranslations("header");
  const [profile, posCount, candCount] = await Promise.all([
    getUserProfile(),
    supabase
      .from("positions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Open"),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
  ]);

  const orgName = profile?.organizationName ?? "ReclutaIT";
  const email = user.email ?? "";

  const data: ShellData = {
    nav: {
      dashboard: t("dashboard"),
      positions: t("positions"),
      candidates: t("candidates"),
      upload: t("uploadCvs"),
    },
    org: { name: orgName, initials: initials(orgName), plan: t("plan") },
    user: {
      name: email.split("@")[0] || email,
      email,
      initials: initials(email),
    },
    counts: { positions: posCount.count ?? 0, candidates: candCount.count ?? 0 },
    labels: { credits: t("credits"), buyMore: t("buyMore") },
  };

  return (
    <QueueProvider>
      <div className="rit-app">
        <AppSidebar data={data} />
        <div className="main">
          <AppMobileBar data={data} menuLabel={t("menu")} />
          <AppTopbar searchPlaceholder={t("searchPlaceholder")} />
          {children}
        </div>
      </div>
    </QueueProvider>
  );
}
