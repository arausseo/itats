import { Suspense } from "react";
import { createClient } from "@/src/utils/supabase/server";
import { parseCandidateRows, type Candidate } from "@/src/types/candidate";
import {
  getStringListParam,
  parsePaginationFromSearchParams,
  parseSortFromSearchParams,
  type SortDir,
} from "@/src/lib/candidate-list-params";
import {
  applyCandidateFilters,
  type CandidateListFilterState,
} from "@/src/lib/candidate-filters-query";
import {
  computeFacetCounts,
  emptyFacetBundle,
  type FacetCountBundle,
  type FacetCountOptions,
} from "@/src/lib/candidate-facet-counts";
import {
  fetchJsonbArrayOptions,
  fetchLibreCandidateIds,
  fetchPaisOptions,
  fetchRolOptions,
  fetchSeniorityOptions,
} from "@/src/lib/candidate-filters-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const q = (firstString(searchParams.q) ?? "").trim();
  const libre = (firstString(searchParams.libre) ?? "").trim();
  const seniority = (firstString(searchParams.seniority) ?? "").trim();
  const pais = (firstString(searchParams.pais) ?? "").trim();

  const roles = getStringListParam(searchParams, "rol");
  const stacks = getStringListParam(searchParams, "stack");
  const frameworks = getStringListParam(searchParams, "fw");
  const patrones = getStringListParam(searchParams, "pat");

  const { column: sortColumn, ascending } = parseSortFromSearchParams(
    searchParams,
  );
  const { page: requestedPage, pageSize } =
    parsePaginationFromSearchParams(searchParams);

  let candidates: Candidate[] = [];
  let totalCount = 0;
  let seniorityOptions: string[] = [];
  let paisOptions: string[] = [];
  let rolOptions: string[] = [];
  let stackOptions: string[] = [];
  let frameworkOptions: string[] = [];
  let patronOptions: string[] = [];
  let queryError: string | null = null;
  let facetCounts: FacetCountBundle = emptyFacetBundle({
    seniorityOptions: [],
    paisOptions: [],
    rolOptions: [],
    stackOptions: [],
    frameworkOptions: [],
    patronOptions: [],
  });
  let facetPromise: Promise<FacetCountBundle> | undefined;

  try {
    const supabase = await createClient();

    [
      seniorityOptions,
      paisOptions,
      rolOptions,
      stackOptions,
      frameworkOptions,
      patronOptions,
    ] = await Promise.all([
      fetchSeniorityOptions(supabase),
      fetchPaisOptions(supabase),
      fetchRolOptions(supabase),
      fetchJsonbArrayOptions(supabase, "lenguajes"),
      fetchJsonbArrayOptions(supabase, "frameworks"),
      fetchJsonbArrayOptions(supabase, "patrones"),
    ]);

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
    };

    const facetOpt: FacetCountOptions = {
      seniorityOptions,
      paisOptions,
      rolOptions,
      stackOptions,
      frameworkOptions,
      patronOptions,
    };

    facetPromise = computeFacetCounts(supabase, filterState, facetOpt).catch(
      () => emptyFacetBundle(facetOpt),
    );

    const buildFiltered = () =>
      applyCandidateFilters(supabase, filterState, null, "*", {
        count: "exact",
      }).order(sortColumn, { ascending });

    const baseQuery = buildFiltered();
    let from = (requestedPage - 1) * pageSize;
    let to = from + pageSize - 1;
    let { data, error, count } = await baseQuery.range(from, to);

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
      e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
  } finally {
    if (facetPromise) {
      facetCounts = await facetPromise;
    }
  }

  const sortDir: SortDir = ascending ? "asc" : "desc";

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageDisplay = Math.min(Math.max(1, requestedPage), totalPages);

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <CardTitle className="text-lg sm:text-xl">Candidatos</CardTitle>
            <CardDescription>
              Vista general del pipeline de talento. Filtra por país, seniority,
              rol, stack, frameworks y patrones; ordena columnas desde la tabla.
            </CardDescription>
            <Suspense
              fallback={
                <div className="mt-4 h-16 animate-pulse rounded-md bg-muted/80" />
              }
            >
              <CandidateFilters
                className="mt-4"
                seniorityOptions={seniorityOptions}
                paisOptions={paisOptions}
                rolOptions={rolOptions}
                stackOptions={stackOptions}
                frameworkOptions={frameworkOptions}
                patronOptions={patronOptions}
                facetCounts={facetCounts}
              />
            </Suspense>
          </CardHeader>
          <CardContent className="pt-6">
            {queryError ? (
              <div
                className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive"
                role="alert"
              >
                <p className="font-medium">Error al cargar candidatos</p>
                <p className="mt-1 text-destructive/90">{queryError}</p>
              </div>
            ) : (
              <CandidatesTableSheet
                candidates={candidates}
                sortColumn={sortColumn}
                sortDir={sortDir}
                totalCount={totalCount}
                page={pageDisplay}
                pageSize={pageSize}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
