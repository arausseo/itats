import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import {
  parsePositionRow,
  parsePositionCandidateWithCandidate,
  type PositionCandidateWithCandidate,
} from "@/src/types/position";
import { PipelineView } from "@/components/positions/pipeline-view";
import { AiSearchView } from "@/components/positions/ai-search-view";
import { closePosition, reopenPosition, getSeniorityOptions } from "@/src/lib/positions-actions";
import { EditPositionDialog } from "@/components/positions/edit-position-dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/src/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

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

export default async function PositionDetailPage({ params, searchParams }: Props) {
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
    .select("*, candidates(nombre, rol_principal, seniority_estimado, email)")
    .eq("position_id", id)
    .order("created_at", { ascending: true });

  const pipelineCandidates: PositionCandidateWithCandidate[] = (pcRows ?? []).map(
    parsePositionCandidateWithCandidate,
  );

  const sp = await searchParams;
  const tab = sp.tab === "search" ? "search" : "pipeline";

  const [t, seniorityOptions] = await Promise.all([
    getTranslations("positions"),
    getSeniorityOptions(),
  ]);

  async function closeAction() {
    "use server";
    await closePosition(id);
  }

  async function reopenAction() {
    "use server";
    await reopenPosition(id);
  }

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/positions"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← {t("backToPositions")}
                  </Link>
                </div>
                <h1 className="mt-1 text-lg font-semibold sm:text-xl">
                  {position.title}
                </h1>
                {position.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {position.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant={position.status === "Open" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {position.status === "Open" ? t("statusOpen") : t("statusClosed")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {pipelineCandidates.length} {t("candidatesInPipeline")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <EditPositionDialog position={position} />
                {position.status === "Open" ? (
                  <form action={closeAction}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {t("closePosition")}
                    </Button>
                  </form>
                ) : (
                  <form action={reopenAction}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {t("reopenPosition")}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-1 border-b border-transparent">
              <Link
                href={`/positions/${id}?tab=pipeline`}
                className={`rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "pipeline"
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabPipeline")} ({pipelineCandidates.length})
              </Link>
              <Link
                href={`/positions/${id}?tab=search`}
                className={`rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "search"
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("tabSearch")}
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {tab === "pipeline" ? (
              <PipelineView
                positionCandidates={pipelineCandidates}
                positionId={id}
                positionTitle={position.title}
              />
            ) : (
              <AiSearchView positionId={id} position={position} seniorityOptions={seniorityOptions} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
