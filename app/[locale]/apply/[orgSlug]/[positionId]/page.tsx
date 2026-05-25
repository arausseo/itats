import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicApplicationContext } from "@/src/lib/public-application";
import { PublicApplicationForm } from "@/components/public-application-form";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; positionId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, orgSlug, positionId } = await params;
  const ctx = await getPublicApplicationContext(orgSlug, positionId);
  const t = await getTranslations({ locale, namespace: "publicApply" });
  if (!ctx) return { title: t("notFoundTitle") };
  return {
    title: `${ctx.position.title} — ${ctx.organization.name}`,
    description: ctx.position.description?.slice(0, 160) ?? t("metaDescription"),
  };
}

export default async function PublicApplyPage({ params }: Props) {
  const { locale, orgSlug, positionId } = await params;
  setRequestLocale(locale);

  const ctx = await getPublicApplicationContext(orgSlug, positionId);
  if (!ctx) notFound();

  const t = await getTranslations("publicApply");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {ctx.organization.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {ctx.position.title}
          </h1>
        </header>

        {(ctx.position.description || ctx.position.requirements) && (
          <section className="mb-6 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            {ctx.position.description && (
              <div className="mb-4">
                <h2 className="mb-1 text-sm font-semibold text-foreground">
                  {t("descriptionTitle")}
                </h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {ctx.position.description}
                </p>
              </div>
            )}
            {ctx.position.requirements && (
              <div>
                <h2 className="mb-1 text-sm font-semibold text-foreground">
                  {t("requirementsTitle")}
                </h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {ctx.position.requirements}
                </p>
              </div>
            )}
          </section>
        )}

        <PublicApplicationForm
          orgSlug={ctx.organization.slug}
          positionId={ctx.position.id}
          questions={ctx.questions}
        />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("poweredBy")}
        </p>
      </div>
    </div>
  );
}
