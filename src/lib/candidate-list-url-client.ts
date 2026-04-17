import {
  PARAM_DIR,
  PARAM_FW,
  PARAM_PAT,
  PARAM_Q,
  PARAM_LIBRE,
  PARAM_ROL,
  PARAM_PAGE,
  PARAM_PAGE_SIZE,
  PARAM_PAIS,
  PARAM_SENIORITY,
  PARAM_SORT,
  PARAM_STACK,
  DEFAULT_PAGE_SIZE,
  normalizePageSize,
  setRepeatedParam,
} from "@/src/lib/candidate-list-params";

export type CandidateListUrlPatch = {
  q?: string;
  libre?: string;
  seniority?: string;
  pais?: string;
  rol?: string[];
  stack?: string[];
  fw?: string[];
  pat?: string[];
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
};

/**
 * Aplica cambios parciales conservando sort/dir y el resto de claves en `current`.
 */
export function mergeCandidateListUrl(
  current: URLSearchParams,
  patch: CandidateListUrlPatch,
): URLSearchParams {
  const p = new URLSearchParams(current.toString());

  if (patch.q !== undefined) {
    if (patch.q.trim()) {
      p.set(PARAM_Q, patch.q.trim());
    } else {
      p.delete(PARAM_Q);
    }
  }
  if (patch.libre !== undefined) {
    if (patch.libre.trim()) {
      p.set(PARAM_LIBRE, patch.libre.trim());
    } else {
      p.delete(PARAM_LIBRE);
    }
  }
  if (patch.seniority !== undefined) {
    if (patch.seniority.trim()) {
      p.set(PARAM_SENIORITY, patch.seniority.trim());
    } else {
      p.delete(PARAM_SENIORITY);
    }
  }
  if (patch.pais !== undefined) {
    if (patch.pais.trim()) {
      p.set(PARAM_PAIS, patch.pais.trim());
    } else {
      p.delete(PARAM_PAIS);
    }
  }
  if (patch.rol !== undefined) {
    setRepeatedParam(p, PARAM_ROL, patch.rol);
  }
  if (patch.stack !== undefined) {
    setRepeatedParam(p, PARAM_STACK, patch.stack);
  }
  if (patch.fw !== undefined) {
    setRepeatedParam(p, PARAM_FW, patch.fw);
  }
  if (patch.pat !== undefined) {
    setRepeatedParam(p, PARAM_PAT, patch.pat);
  }
  if (patch.sort !== undefined) {
    if (patch.sort.trim()) {
      p.set(PARAM_SORT, patch.sort.trim());
    } else {
      p.delete(PARAM_SORT);
    }
  }
  if (patch.dir !== undefined) {
    if (patch.dir.trim()) {
      p.set(PARAM_DIR, patch.dir.trim());
    } else {
      p.delete(PARAM_DIR);
    }
  }
  if (patch.page !== undefined) {
    const n = Number.parseInt(patch.page, 10);
    if (!Number.isFinite(n) || n <= 1) {
      p.delete(PARAM_PAGE);
    } else {
      p.set(PARAM_PAGE, String(n));
    }
  }
  if (patch.pageSize !== undefined) {
    const n = Number.parseInt(patch.pageSize, 10);
    const normalized = Number.isFinite(n)
      ? normalizePageSize(n)
      : DEFAULT_PAGE_SIZE;
    if (normalized === DEFAULT_PAGE_SIZE) {
      p.delete(PARAM_PAGE_SIZE);
    } else {
      p.set(PARAM_PAGE_SIZE, String(normalized));
    }
  }

  return p;
}

export function listParamFromSearchParams(
  searchParams: URLSearchParams,
  key: string,
): string[] {
  return searchParams.getAll(key).map((s) => s.trim()).filter(Boolean);
}
