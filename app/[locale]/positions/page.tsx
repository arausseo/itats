import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { parsePositionRow } from "@/src/types/position";
import type { PositionWithCount } from "@/src/types/position";
import { CreatePositionDialog } from "@/components/positions/create-position-dialog";
import { PositionsList } from "@/components/positions/positions-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "positions" });
  return { title: t("metaTitle") };
}

export default async function PositionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loc = await getLocale();
    redirect(`/${loc}/login?next=${encodeURIComponent(`/${loc}/positions`)}`);
  }

  const t = await getTranslations("positions");

  const { data: rows, error } = await supabase
    .from("positions")
    .select("*, position_candidates(count)")
    .order("created_at", { ascending: false });

  const positions: PositionWithCount[] = (rows ?? []).map((row) => {
    const base = parsePositionRow(row);
    const countArr = (row as Record<string, unknown>).position_candidates;
    const count = Array.isArray(countArr)
      ? (countArr[0] as { count: number } | undefined)?.count ?? 0
      : 0;
    return { ...base, candidate_count: count };
  });

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">{t("title")}</CardTitle>
                <CardDescription className="mt-1">{t("description")}</CardDescription>
              </div>
              <CreatePositionDialog />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error.message}
              </p>
            )}

            <PositionsList positions={positions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
