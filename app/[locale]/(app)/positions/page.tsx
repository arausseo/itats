import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { parsePositionRow } from "@/src/types/position";
import type { PositionWithCount } from "@/src/types/position";
import { CreatePositionDialog } from "@/components/positions/create-position-dialog";
import { PositionsList } from "@/components/positions/positions-list";

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
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("eyebrow")}</div>
          <h1>{t("title")}</h1>
          <div className="sub">{t("description")}</div>
        </div>
        <div className="right">
          <CreatePositionDialog />
        </div>
      </div>

      {error && (
        <p
          style={{
            marginBottom: 16,
            borderRadius: 11,
            background: "var(--neg-tint)",
            color: "var(--neg)",
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          {error.message}
        </p>
      )}

      <PositionsList positions={positions} />
    </div>
  );
}
