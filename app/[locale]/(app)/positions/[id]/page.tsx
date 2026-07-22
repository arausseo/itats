import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import {
  parsePositionRow,
  parsePositionCandidateWithCandidate,
  type PositionCandidateWithCandidate,
} from "@/src/types/position";
import { PositionTabs } from "@/components/positions/position-tabs";
import { reopenPosition, getSeniorityOptions } from "@/src/lib/positions-actions";
import { getPositionQuestions } from "@/src/lib/position-questions-actions";
import { getUserProfile } from "@/src/lib/user-profile";
import { EditPositionDialog } from "@/components/positions/edit-position-dialog";
import { ClosePositionDialog } from "@/components/positions/close-position-dialog";
import { StatusBadge } from "@/components/app/dashboard-ui";
import { Link } from "@/src/i18n/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select("title")
    .eq("id", id)
    .maybeSingle<{ title: string }>();
  const t = await getTranslations({ locale, namespace: "positions" });
  return { title: data?.title ? `${data.title} — ${t("title")}` : t("title") };
}

export default async function PositionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loc = await getLocale();
    redirect(`/${loc}/login`);
  }

  const { data: posRow, error: posError } = await supabase
    .from("positions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (posError || !posRow) notFound();

  const position = parsePositionRow(posRow);

  const { data: pcRows } = await supabase
    .from("position_candidates")
    .select(`
      *,
      candidates(
        nombre, rol_principal, seniority_estimado, email,
        pais_residencia, resumen_ejecutivo,
        lenguajes, frameworks, patrones,
        anos_experiencia_total
      )
    `)
    .eq("position_id", id)
    .order("created_at", { ascending: true });

  const pipelineCandidates: PositionCandidateWithCandidate[] = (pcRows ?? []).map(
    parsePositionCandidateWithCandidate,
  );

  const [t, seniorityOptions, questions, profile] = await Promise.all([
    getTranslations("positions"),
    getSeniorityOptions(),
    getPositionQuestions(id),
    getUserProfile(),
  ]);

  async function reopenAction() {
    "use server";
    await reopenPosition(id);
  }

  return (
    <div className="page fade-in">
      <div className="crumb" style={{ marginBottom: 12 }}>
        <Link href="/positions">← {t("backToPositions")}</Link>
      </div>

      <div className="page-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 26 }}>{position.title}</h1>
          {position.description && (
            <p
              className="sub"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {position.description}
            </p>
          )}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge
              open={position.status === "Open"}
              label={position.status === "Open" ? t("statusOpen") : t("statusClosed")}
            />
            <span style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600 }}>
              {pipelineCandidates.length} {t("candidatesInPipeline")}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--faint)" }}>
              · {t("createdAt", { date: new Date(position.created_at).toLocaleDateString() })}
            </span>
          </div>
        </div>
        <div className="right">
          <EditPositionDialog position={position} />
          {position.status === "Open" ? (
            <ClosePositionDialog positionId={position.id} positionTitle={position.title} />
          ) : (
            <form action={reopenAction}>
              <Button type="submit" variant="outline" size="sm">
                {t("reopenPosition")}
              </Button>
            </form>
          )}
        </div>
      </div>

      <PositionTabs
        position={position}
        positionCandidates={pipelineCandidates}
        seniorityOptions={seniorityOptions}
        questions={questions}
        orgSlug={profile?.organizationSlug ?? null}
      />
    </div>
  );
}
