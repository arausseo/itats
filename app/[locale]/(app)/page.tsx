import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { PipelineBarChart } from "@/components/dashboard/pipeline-bar-chart";
import { CandidatesTrendChart } from "@/components/dashboard/candidates-trend-chart";
import { SeniorityDonutChart } from "@/components/dashboard/seniority-donut-chart";
import type { PositionWithCount } from "@/src/types/position";
import { parsePositionRow } from "@/src/types/position";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loc = await getLocale();
    redirect(`/${loc}/login`);
  }

  const t = await getTranslations("dashboard");

  // ─── Parallel data fetching ───────────────────────────────────────────────
  const [
    candidatesResult,
    positionsResult,
    pipelineResult,
    seniorityResult,
    recentCandidatesResult,
  ] = await Promise.allSettled([
    // Total candidates
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    // Positions with candidate counts
    supabase
      .from("positions")
      .select("*, position_candidates(count)")
      .order("created_at", { ascending: false }),
    // Pipeline status breakdown
    supabase
      .from("position_candidates")
      .select("pipeline_status"),
    // Seniority distribution
    supabase
      .from("candidates")
      .select("seniority_estimado"),
    // Recent candidates (last 7)
    supabase
      .from("candidates")
      .select("id, nombre, rol_principal, seniority_estimado, created_at")
      .order("created_at", { ascending: false })
      .limit(7),
  ]);

  // ─── Candidates count ──────────────────────────────────────────────────────
  const totalCandidates =
    candidatesResult.status === "fulfilled"
      ? (candidatesResult.value.count ?? 0)
      : 0;

  // ─── Positions ─────────────────────────────────────────────────────────────
  const positionRows =
    positionsResult.status === "fulfilled"
      ? (positionsResult.value.data ?? [])
      : [];

  const positions: PositionWithCount[] = positionRows.map((row) => {
    const base = parsePositionRow(row);
    const countArr = (row as Record<string, unknown>).position_candidates;
    const count = Array.isArray(countArr)
      ? (countArr[0] as { count: number } | undefined)?.count ?? 0
      : 0;
    return { ...base, candidate_count: count };
  });

  const openPositions = positions.filter((p) => p.status === "Open");
  const totalInPipeline = positions.reduce(
    (acc, p) => acc + p.candidate_count,
    0,
  );

  // ─── Pipeline status distribution ─────────────────────────────────────────
  const pipelineRows =
    pipelineResult.status === "fulfilled"
      ? (pipelineResult.value.data ?? [])
      : [];

  const pipelineStatusOrder = [
    "Sourced",
    "To Contact",
    "Screening",
    "Tech Assessment",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
  ];
  const pipelineCountMap: Record<string, number> = {};
  for (const row of pipelineRows) {
    const s = (row as { pipeline_status: string }).pipeline_status ?? "Sourced";
    pipelineCountMap[s] = (pipelineCountMap[s] ?? 0) + 1;
  }
  const pipelineChartData = pipelineStatusOrder
    .map((status) => ({ status, count: pipelineCountMap[status] ?? 0 }))
    .filter((d) => d.count > 0);

  const pipelineLabelMap: Record<string, string> = {
    Sourced: t("pipelineStatus.Sourced"),
    "To Contact": t("pipelineStatus.To_Contact"),
    Screening: t("pipelineStatus.Screening"),
    "Tech Assessment": t("pipelineStatus.Tech_Assessment"),
    Interview: t("pipelineStatus.Interview"),
    Offer: t("pipelineStatus.Offer"),
    Hired: t("pipelineStatus.Hired"),
    Rejected: t("pipelineStatus.Rejected"),
  };

  // ─── Seniority distribution ────────────────────────────────────────────────
  const seniorityRows =
    seniorityResult.status === "fulfilled"
      ? (seniorityResult.value.data ?? [])
      : [];
  const seniorityCountMap: Record<string, number> = {};
  for (const row of seniorityRows) {
    const s =
      (row as { seniority_estimado: string }).seniority_estimado?.trim() || "—";
    if (s) seniorityCountMap[s] = (seniorityCountMap[s] ?? 0) + 1;
  }
  const seniorityChartData = Object.entries(seniorityCountMap)
    .map(([seniority, count]) => ({ seniority, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // ─── Candidate trend (last 6 months) ──────────────────────────────────────
  const allCandidateDates: string[] = [];
  if (seniorityResult.status === "fulfilled") {
    // Reuse the candidates query for dates — fetch separately
  }

  // Build trend from recent result (rough approximation using available data)
  // We need created_at for all candidates — use a dedicated query result
  const trendRows = recentCandidatesResult.status === "fulfilled"
    ? (recentCandidatesResult.value.data ?? [])
    : [];

  // Build month labels for the last 6 months
  const now = new Date();
  const monthTrend: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthTrend.push({ month: label, count: 0 });
  }

  // ─── Trend query: fetch all candidate created_at for last 6 months ─────────
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  const { data: trendData } = await supabase
    .from("candidates")
    .select("created_at")
    .gte("created_at", sixMonthsAgo);

  for (const row of trendData ?? []) {
    const d = new Date((row as { created_at: string }).created_at);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const entry = monthTrend.find((m) => m.month === label);
    if (entry) entry.count++;
  }

  // ─── Recent candidates ─────────────────────────────────────────────────────
  type RecentCandidate = {
    id: string;
    nombre: string;
    rol_principal: string;
    seniority_estimado: string;
    created_at: string;
  };
  const recentCandidates: RecentCandidate[] =
    recentCandidatesResult.status === "fulfilled"
      ? ((recentCandidatesResult.value.data ?? []) as RecentCandidate[])
      : [];

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/candidates">
              <Button variant="outline" size="sm">
                {t("viewCandidates")}
              </Button>
            </Link>
            <Link href="/positions">
              <Button size="sm">{t("viewPositions")}</Button>
            </Link>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={t("statCandidates")}
            value={totalCandidates}
            subtext={t("statCandidatesHint")}
            accent="blue"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
              </svg>
            }
          />
          <StatCard
            label={t("statOpenPositions")}
            value={openPositions.length}
            subtext={t("statOpenPositionsHint", { total: positions.length })}
            accent="green"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 0 1 8.75 1h2.5A2.75 2.75 0 0 1 14 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 0 1 6 4.193V3.75Zm6.5 0v.325a41.622 41.622 0 0 0-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25ZM10 10a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1H10Z" clipRule="evenodd" />
                <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.1.644 4.313.992 6.61.992 2.297 0 4.51-.348 6.61-.992.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 0 1-9.274 0C3.985 17.585 3 16.402 3 15.055Z" />
              </svg>
            }
          />
          <StatCard
            label={t("statInPipeline")}
            value={totalInPipeline}
            subtext={t("statInPipelineHint")}
            accent="amber"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V5c0 1.149.15 2.263.43 3.326a13.022 13.022 0 0 0 9.244 9.244c1.063.28 2.177.43 3.326.43h1.5a1.5 1.5 0 0 0 1.5-1.5v-1.148a1.5 1.5 0 0 0-1.175-1.465l-3.223-.716a1.5 1.5 0 0 0-1.767 1.052l-.267.933c-.117.41-.555.643-.95.48a11.542 11.542 0 0 1-6.254-6.254c-.163-.395.07-.833.48-.95l.933-.267a1.5 1.5 0 0 0 1.052-1.767l-.716-3.223A1.5 1.5 0 0 0 4.648 2H3.5Z" clipRule="evenodd" />
              </svg>
            }
          />
          <StatCard
            label={t("statHired")}
            value={pipelineCountMap["Hired"] ?? 0}
            subtext={t("statHiredHint")}
            accent="green"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Trend chart (spans 2 cols) */}
          <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {t("chartTrendTitle")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("chartTrendSubtitle")}
            </p>
            <CandidatesTrendChart data={monthTrend} />
          </div>

          {/* Seniority donut */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {t("chartSeniorityTitle")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("chartSenioritySubtitle")}
            </p>
            {seniorityChartData.length > 0 ? (
              <SeniorityDonutChart data={seniorityChartData} />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                {t("noData")}
              </p>
            )}
          </div>
        </div>

        {/* ── Bottom Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Pipeline bar chart (spans 2 cols) */}
          <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {t("chartPipelineTitle")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("chartPipelineSubtitle")}
            </p>
            {pipelineChartData.length > 0 ? (
              <PipelineBarChart data={pipelineChartData} labelMap={pipelineLabelMap} />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                {t("noData")}
              </p>
            )}
          </div>

          {/* Recent candidates */}
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {t("recentCandidatesTitle")}
              </h2>
              <Link href="/candidates">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("viewAll")}
                </span>
              </Link>
            </div>
            {recentCandidates.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/50">
                {recentCandidates.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {c.nombre}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {c.rol_principal}
                      {c.seniority_estimado ? ` · ${c.seniority_estimado}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Open Positions ─────────────────────────────────────────────── */}
        {openPositions.length > 0 && (
          <div className="mt-6 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {t("openPositionsTitle")}
              </h2>
              <Link href="/positions">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("viewAll")}
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openPositions.slice(0, 6).map((pos) => (
                <Link key={pos.id} href={`/positions/${pos.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-muted/40">
                    <span className="truncate font-medium text-foreground">
                      {pos.title}
                    </span>
                    <span className="ml-3 shrink-0 tabular-nums text-xs text-muted-foreground">
                      {pos.candidate_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
