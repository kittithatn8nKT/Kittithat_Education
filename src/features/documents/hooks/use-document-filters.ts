"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocumentFilters, DocumentSort, DocumentStatusTab, DocumentView } from "../types";

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
 * Server-side equivalent — used in page.tsx. Reads URLSearchParams-like
 * record and coerces to a fully-typed DocumentFilters.
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

/**
 * Browser-side hook. Reads the current URL filters and exposes a `patch()`
 * that writes a partial update back via router.replace.
 *
 * Most filter changes reset to page 1 — passing `{ page: 1, ... }` is
 * tedious so we do it automatically unless the caller specifies a page.
 */
export function useDocumentFilters() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = parseDocumentFilters(Object.fromEntries(params.entries()));

  const patch = useCallback(
    (partial: Partial<DocumentFilters>) => {
      const next = new URLSearchParams(params.toString());

      const apply = (key: string, value: string | number | null | undefined) => {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      };

      // Map fields → URL keys
      if ("q" in partial) apply("q", partial.q ?? "");
      if ("status" in partial) apply("status", partial.status ?? "active");
      if ("category_id" in partial) apply("category", partial.category_id);
      if ("department_id" in partial) apply("dept", partial.department_id);
      if ("type" in partial) apply("type", partial.type);
      if ("from" in partial) apply("from", partial.from);
      if ("to" in partial) apply("to", partial.to);
      if ("sort" in partial) apply("sort", partial.sort);
      if ("view" in partial) apply("view", partial.view);
      if ("pageSize" in partial) apply("pageSize", partial.pageSize);

      // Reset page to 1 on any non-page change.
      if ("page" in partial) {
        apply("page", partial.page);
      } else {
        next.delete("page");
      }

      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, patch, reset };
}
