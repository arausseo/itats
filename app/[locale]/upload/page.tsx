import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CvUploadZone } from "@/components/cv-upload-zone";
import { MAX_FILES } from "@/src/lib/upload-config";

type UploadPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: UploadPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("uploadTitle") };
}

export default async function UploadPage({ params }: UploadPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("upload");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const loc = await getLocale();
    redirect(
      `/${loc}/login?next=${encodeURIComponent(`/${loc}/upload`)}`,
    );
  }

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <CardTitle className="text-lg sm:text-xl">{t("title")}</CardTitle>
            <CardDescription>
              {t("description", { maxFiles: MAX_FILES })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CvUploadZone />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
