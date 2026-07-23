import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { parseCandidateRows, type Candidate } from "@/src/types/candidate";
import {
  getStringListParam,
  parsePaginationFromSearchParams,
  parseSortFromSearchParams,
  isoDateDaysAgo,
  isoDateToday,
  type SortDir,
} from "@/src/lib/candidate-list-params";
import {
  applyCandidateFilters,
  type CandidateListFilterState,
} from "@/src/lib/candidate-filters-query";
import {
  fetchFacetOptionsFromCache,
  fetchLibreCandidateIds,
  type FacetOption,
} from "@/src/lib/candidate-filters-server";
import { CandidateFilters } from "@/components/candidate-filters";
import { CandidatesTableSheet } from "@/components/candidates-table-sheet";

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

type CandidatesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CandidatesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

export default async function CandidatesPage({
  params,
  searchParams,
}: CandidatesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const search = await searchParams;

  const q = (firstString(search.q) ?? "").trim();
  const libre = (firstString(search.libre) ?? "").trim();
  const seniority = (firstString(search.seniority) ?? "").trim();
  const pais = (firstString(search.pais) ?? "").trim();

  const defaultDateFrom = isoDateDaysAgo(30);
  const defaultDateTo = isoDateToday();
  const dateFrom = (firstString(search.dateFrom) ?? "").trim() || defaultDateFrom;
  const dateTo = (firstString(search.dateTo) ?? "").trim() || defaultDateTo;

  const roles = getStringListParam(search, "rol");
  const stacks = getStringListParam(search, "stack");
  const frameworks = getStringListParam(search, "fw");
  const patrones = getStringListParam(search, "pat");

  const { column: sortColumn, ascending } = parseSortFromSearchParams(search);
  const { page: requestedPage, pageSize } =
    parsePaginationFromSearchParams(search);

  let candidates: Candidate[] = [];
  let totalCount = 0;
  let seniorityOptions: FacetOption[] = [];
  let paisOptions: FacetOption[] = [];
  let queryError: string | null = null;
  let openPositions: { id: string; title: string }[] = [];

  try {
    const supabase = await createClient();

    [seniorityOptions, paisOptions] = await Promise.all([
      fetchFacetOptionsFromCache(supabase, "seniority"),
      fetchFacetOptionsFromCache(supabase, "pais"),
    ]);

    const { data: openPosRows } = await supabase
      .from("positions")
      .select("id, title")
      .eq("status", "Open")
      .order("title");
    openPositions = (openPosRows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
    }));

    let libreCandidateIds: string[] | undefined;
    if (libre.trim()) {
      libreCandidateIds = await fetchLibreCandidateIds(supabase, libre.trim());
    }

    const filterState: CandidateListFilterState = {
      q,
      libre,
      libreCandidateIds,
      seniority,
      pais,
      roles,
      stacks,
      frameworks,
      patrones,
      dateFrom,
      dateTo,
    };

    const buildFiltered = () =>
      applyCandidateFilters(supabase, filterState, null, "*", {
        count: "exact",
      }).order(sortColumn, { ascending });

    const baseQuery = buildFiltered();
    let from = (requestedPage - 1) * pageSize;
    let to = from + pageSize - 1;
    const firstRange = await baseQuery.range(from, to);
    let { data } = firstRange;
    const { error, count } = firstRange;

    if (error) {
      queryError = error.message;
    } else {
      totalCount = count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const safePage = Math.min(Math.max(1, requestedPage), totalPages);

      if (safePage !== requestedPage && totalCount > 0) {
        from = (safePage - 1) * pageSize;
        to = from + pageSize - 1;
        const retry = await buildFiltered().range(from, to);
        if (retry.error) {
          queryError = retry.error.message;
        } else {
          data = retry.data;
          candidates = parseCandidateRows(retry.data);
          totalCount = retry.count ?? totalCount;
        }
      } else {
        candidates = parseCandidateRows(data);
      }
    }
  } catch (e) {
    queryError =
      e instanceof Error ? e.message : tCommon("connectionError");
  }

  const sortDir: SortDir = ascending ? "asc" : "desc";

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageDisplay = Math.min(Math.max(1, requestedPage), totalPages);

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t("eyebrow")}</div>
          <h1>{t("title")}</h1>
          <div className="sub">{t("description")}</div>
        </div>
      </div>

      <div className="talent-layout">
        <aside className="card card-pad talent-rail">
          <Suspense
            fallback={<div className="h-16 animate-pulse rounded-md bg-muted/80" />}
          >
            <CandidateFilters
              seniorityOptions={seniorityOptions}
              paisOptions={paisOptions}
              defaultDateFrom={defaultDateFrom}
              defaultDateTo={defaultDateTo}
            />
          </Suspense>
        </aside>

        <div style={{ minWidth: 0 }}>
          {queryError ? (
            <div
              role="alert"
              style={{ borderRadius: 11, background: "var(--neg-tint)", color: "var(--neg)", padding: "12px 16px", fontSize: 13 }}
            >
              <p style={{ fontWeight: 600 }}>{t("loadErrorTitle")}</p>
              <p style={{ marginTop: 4 }}>{queryError}</p>
            </div>
          ) : (
            <CandidatesTableSheet
              candidates={candidates}
              sortColumn={sortColumn}
              sortDir={sortDir}
              totalCount={totalCount}
              page={pageDisplay}
              pageSize={pageSize}
              openPositions={openPositions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
