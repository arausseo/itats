/** Parámetros de URL compartidos entre servidor y cliente (listado de candidatos). */

export const PARAM_Q = "q";
export const PARAM_LIBRE = "libre";
export const PARAM_SENIORITY = "seniority";
export const PARAM_PAIS = "pais";
export const PARAM_SORT = "sort";
export const PARAM_DIR = "dir";
export const PARAM_ROL = "rol";
export const PARAM_STACK = "stack";
export const PARAM_FW = "fw";
export const PARAM_PAT = "pat";
export const PARAM_PAGE = "page";
export const PARAM_PAGE_SIZE = "pageSize";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSizeOption = 20;

/** Solo valores permitidos en URL; cualquier otro se trata como default. */
export function normalizePageSize(raw: number): PageSizeOption {
  if (raw === 10 || raw === 20 || raw === 50) {
    return raw;
  }
  return DEFAULT_PAGE_SIZE;
}

/** Longitud máxima visible del rol principal en la tabla (resto en tooltip). */
export const ROL_TABLE_MAX_LEN = 20;

export const SORT_COLUMNS = [
  "nombre",
  "rol_principal",
  "seniority_estimado",
  "anos_experiencia_total",
  "created_at",
] as const;

export type SortColumn = (typeof SORT_COLUMNS)[number];
export type SortDir = "asc" | "desc";

/** Al hacer clic en cabecera: misma columna alterna dir; otra columna usa dir inicial razonable. */
export function nextSortClick(
  clicked: SortColumn,
  current: SortColumn,
  currentDir: SortDir,
): { sort: SortColumn; dir: SortDir } {
  if (clicked === current) {
    return { sort: clicked, dir: currentDir === "asc" ? "desc" : "asc" };
  }
  const dir: SortDir =
    clicked === "created_at" || clicked === "anos_experiencia_total"
      ? "desc"
      : "asc";
  return { sort: clicked, dir };
}

export function isSortColumn(value: string): value is SortColumn {
  return (SORT_COLUMNS as readonly string[]).includes(value);
}

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Lee valores multi (clave repetida o una cadena con comas).
 */
export function getStringListParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const v = sp[key];
  if (v === undefined) {
    return [];
  }
  const parts = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const item of parts) {
    for (const segment of item.split(",")) {
      const t = segment.trim();
      if (t) {
        out.push(t);
      }
    }
  }
  return [...new Set(out)];
}

export function parseSortFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): { column: SortColumn; ascending: boolean } {
  const rawSort = firstString(sp[PARAM_SORT])?.trim() ?? "";
  const rawDir = firstString(sp[PARAM_DIR])?.trim().toLowerCase() ?? "";

  const column: SortColumn = isSortColumn(rawSort) ? rawSort : "created_at";

  let ascending: boolean;
  if (rawDir === "desc") {
    ascending = false;
  } else if (rawDir === "asc") {
    ascending = true;
  } else {
    ascending = column === "created_at" || column === "anos_experiencia_total"
      ? false
      : true;
  }

  return { column, ascending };
}

export function parsePaginationFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): { page: number; pageSize: number } {
  const rawPage = firstString(sp[PARAM_PAGE]);
  const rawSize = firstString(sp[PARAM_PAGE_SIZE]);
  let pageSize = Number.parseInt(rawSize ?? "", 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE;
  } else {
    pageSize = normalizePageSize(pageSize);
  }
  let page = Number.parseInt(rawPage ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) {
    page = 1;
  }
  return { page, pageSize };
}

/** Serializa listas en `URLSearchParams` (misma clave repetida). */
export function setRepeatedParam(
  params: URLSearchParams,
  key: string,
  values: string[],
) {
  params.delete(key);
  for (const v of values) {
    const t = v.trim();
    if (t) {
      params.append(key, t);
    }
  }
}
