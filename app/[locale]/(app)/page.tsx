import { redirect } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { getQueueStatus } from "@/src/lib/queue-actions";
import { parsePositionRow, type PositionWithCount } from "@/src/types/position";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/app/icon";
import {
  Spark,
  StatCard,
  StatusBadge,
  RoleBadge,
  ScoreRing,
} from "@/components/app/dashboard-ui";

type DashboardPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function initials(source: string, max = 2): string {
  const parts = source.trim().split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, max).map((p) => p[0]!.toUpperCase()).join("") || "·";
}

const PIPELINE_ORDER = [
  "Sourced", "To Contact", "Screening", "Tech Assessment",
  "Interview", "Offer", "Hired", "Rejected",
] as const;

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loc = await getLocale();
    redirect(`/${loc}/login`);
  }

  const t = await getTranslations("dashboard");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    positionsResult,
    totalCandRes,
    monthCandRes,
    recentCandRes,
    pipelineRes,
    queueStatus,
  ] = await Promise.all([
    supabase
      .from("positions")
      .select("*, position_candidates(count)")
      .order("created_at", { ascending: false }),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("candidates")
      .select("id, nombre, rol_principal, seniority_estimado")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("position_candidates").select("pipeline_status"),
    getQueueStatus(),
  ]);

  // ── Positions ──────────────────────────────────────────────
  const positions: PositionWithCount[] = (positionsResult.data ?? []).map((row) => {
    const base = parsePositionRow(row);
    const arr = (row as Record<string, unknown>).position_candidates;
    const count = Array.isArray(arr) ? (arr[0] as { count: number } | undefined)?.count ?? 0 : 0;
    return { ...base, candidate_count: count };
  });
  const openPositions = positions.filter((p) => p.status === "Open");
  const totalInPipeline = positions.reduce((a, p) => a + p.candidate_count, 0);
  const attentionJobs = positions.filter((p) => p.status !== "Closed").slice(0, 4);

  const totalCandidates = totalCandRes.count ?? 0;
  const cvsThisMonth = monthCandRes.count ?? 0;

  // ── Recent candidates ──────────────────────────────────────
  type Recent = { id: string; nombre: string; rol_principal: string; seniority_estimado: string };
  const recentCandidates = (recentCandRes.data ?? []) as Recent[];

  // ── Pipeline breakdown ─────────────────────────────────────
  const counts: Record<string, number> = {};
  for (const r of pipelineRes.data ?? []) {
    const s = (r as { pipeline_status: string }).pipeline_status ?? "Sourced";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const breakdown = PIPELINE_ORDER
    .map((s) => ({ status: s, count: counts[s] ?? 0 }))
    .filter((d) => d.count > 0)
    .slice(0, 5);
  const maxBar = Math.max(1, ...breakdown.map((d) => d.count));

  const userName = (user.email ?? "").split("@")[0] || "";
  const today = new Date().toLocaleDateString(locale, { day: "numeric", month: "long" });
  const orgLabel = "ReclutaIT";

  return (
    <div className="page fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("title")}</div>
          <h1>
            {t("greeting")}{userName ? `, ${userName}` : ""} <span className="wave">👋</span>
          </h1>
          <div className="sub">
            {t("todayPre")} <b>{orgLabel}</b> {t("todayPost")}, {today}.
          </div>
        </div>
        <div className="right">
          <Link href="/candidates">
            <Button variant="outline" size="lg">{t("viewCandidates")}</Button>
          </Link>
          <Link href="/positions">
            <Button size="lg">
              <Icon name="plus" size={14} />
              {t("newJob")}
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard icon="briefcase" iconBg="var(--brand-tint)" iconFg="var(--brand)" value={openPositions.length} label={t("stActiveJobs")} />
        <StatCard icon="users" iconBg="var(--clay-tint)" iconFg="var(--clay)" value={totalInPipeline} label={t("stInProcess")} />
        <StatCard icon="spark" iconBg="var(--brand-tint)" iconFg="var(--brand)" value={cvsThisMonth} label={t("stCvsMonth")} />
        <StatCard icon="layers" iconBg="var(--eng-tint)" iconFg="var(--eng)" value={totalCandidates} label={t("stTotalCandidates")} />
      </div>

      {/* ── Row A: attention + top candidates ───────────────── */}
      <div className="dash-cols split-a">
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", padding: "18px 22px 14px" }}>
            <h3 style={{ fontSize: 16 }}>{t("jobsNeed")}</h3>
            <Link href="/positions" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>
              {t("viewAll")}
            </Link>
          </div>
          <div style={{ padding: "0 12px 12px" }}>
            {attentionJobs.length === 0 && (
              <p style={{ padding: "14px 12px", fontSize: 13, color: "var(--faint)" }}>{t("noData")}</p>
            )}
            {attentionJobs.map((j, i) => (
              <Link
                key={j.id}
                href={`/positions/${j.id}`}
                className="row-hover"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 12px", borderRadius: 12 }}
              >
                <div className="mono" style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, width: 24 }}>#{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{j.title}</div>
                </div>
                <div style={{ textAlign: "center", width: 48 }}>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{j.candidate_count}</div>
                  <div className="microcap">{t("cands")}</div>
                </div>
                <StatusBadge open={j.status === "Open"} label={j.status === "Open" ? t("statActive") : t("statClosed")} />
              </Link>
            ))}
          </div>
        </div>

        <div className="ai-surface">
          <div className="ai-head">
            <div className="ico"><Spark size={15} /></div>
            <div className="ttl">{t("topRecent")}</div>
            <div className="by"><Spark size={10} />IA</div>
          </div>
          <div style={{ padding: "8px 14px 14px" }}>
            {recentCandidates.length === 0 && (
              <p style={{ padding: "10px 8px", fontSize: 13, color: "var(--faint)" }}>{t("noData")}</p>
            )}
            {recentCandidates.map((c, i) => (
              <Link
                key={c.id}
                href="/candidates"
                className="row-hover-glass"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 12 }}
              >
                <div className="mono" style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700, width: 16 }}>{i + 1}</div>
                <span className="avatar sq" style={{ width: 36, height: 36, fontSize: 13, borderRadius: 12 }}>
                  {initials(c.nombre)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.nombre}</div>
                  <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    {c.rol_principal && <RoleBadge role={c.rol_principal} />}
                    {c.seniority_estimado && (
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>· {c.seniority_estimado}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row B: AI queue + pipeline breakdown ────────────── */}
      <div className="dash-cols split-b">
        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>{t("aiQueue")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ScoreRing
              display={queueStatus.pending}
              label={t("inQueue")}
              color="var(--clay)"
              fillPct={queueStatus.processingEnabled ? 100 : 30}
              size={92}
              stroke={9}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--faint)", lineHeight: 1.6 }}>
                <b style={{ color: "var(--ink)" }}>{queueStatus.processing}</b>{" "}
                {locale === "en" ? "processing now." : "procesando ahora."}
                <br />
                <b style={{ color: "var(--clay)" }}>{queueStatus.pending} {t("inQueue")}</b>{" "}
                {locale === "en" ? "waiting." : "esperando."}
              </div>
              <Link href="/upload">
                <Button variant="ghost" size="sm" style={{ marginTop: 10, marginLeft: -8 }}>
                  <Icon name="spark" size={14} style={{ color: "var(--brand)" }} />
                  {t("processNow")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>{t("pipelineBreakdown")}</h3>
          {breakdown.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--faint)" }}>{t("noData")}</p>
          )}
          {breakdown.map((d) => (
            <div className="exp-row" key={d.status}>
              <div className="top">
                <b>{t(`pipelineStatus.${d.status.replace(/\s+/g, "_")}`)}</b>
                <span className="v mono">{d.count}</span>
              </div>
              <div className="exp-bar">
                <i style={{ width: `${Math.round((d.count / maxBar) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
