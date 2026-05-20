// Pure filter parsing + constants — universal (no React, no Next client APIs).
// Importable from both Server Components and Client Components.
//
// (The client hook useDocumentFilters lives in ./hooks/use-document-filters.ts
//  and imports parseDocumentFilters from here.)

import type { DocumentFilters, DocumentSort, DocumentStatusTab, DocumentView } from "./types";

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_SORT: DocumentSort = "created_at_desc";

const VALID_SORTS: DocumentSort[] = [
  "created_at_desc",
  "created_at_asc",
  "title_asc",
  "title_desc",
  "size_desc",
  "size_asc",
];
const VALID_VIEWS: DocumentView[] = ["table", "grid"];
const VALID_STATUS: DocumentStatusTab[] = ["active", "archived"];

/**
 * Coerce raw searchParams (string | string[] | undefined values) into a
 * fully-typed DocumentFilters with safe defaults. Used by:
 *   - the RSC page (server-side)
 *   - the useDocumentFilters hook (client-side)
 */
export function parseDocumentFilters(
  params: Record<string, string | string[] | undefined>
): DocumentFilters {
  const get = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };

  const status = get("status");
  const sort = get("sort");
  const view = get("view");
  const pageRaw = Number(get("page") ?? "1");
  const pageSizeRaw = Number(get("pageSize") ?? String(DEFAULT_PAGE_SIZE));

  return {
    q: get("q") ?? "",
    status: VALID_STATUS.includes(status as DocumentStatusTab)
      ? (status as DocumentStatusTab)
      : "active",
    category_id: get("category") || null,
    department_id: get("dept") || null,
    type: get("type") || null,
    from: get("from") || null,
    to: get("to") || null,
    sort: VALID_SORTS.includes(sort as DocumentSort) ? (sort as DocumentSort) : DEFAULT_SORT,
    view: VALID_VIEWS.includes(view as DocumentView) ? (view as DocumentView) : "table",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    pageSize:
      Number.isFinite(pageSizeRaw) && pageSizeRaw >= 5 && pageSizeRaw <= 100
        ? Math.floor(pageSizeRaw)
        : DEFAULT_PAGE_SIZE,
  };
}
