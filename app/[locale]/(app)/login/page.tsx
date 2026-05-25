import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("loginTitle") };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("login");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0a0f1e]/70" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Brand mark */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              A
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">ATS</span>
          </div>

          {/* Hero text */}
          <div className="space-y-4">
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
              {t("panelTagline")}
            </p>
            <h1 className="text-white text-4xl font-bold leading-tight text-balance">
              {t("panelHeadline")}
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              {t("panelSubtitle")}
            </p>
          </div>

          {/* Footer note */}
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} ATS Platform
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-base tracking-tight">ATS</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {t("cardTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("formSubtitle")}
            </p>
          </div>

          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
