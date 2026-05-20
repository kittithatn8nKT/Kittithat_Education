"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseDocumentFilters } from "../filters";
import type { DocumentFilters } from "../types";

/**
 * Browser-side hook. Reads the current URL filters via useSearchParams and
 * exposes a `patch()` that writes a partial update via router.replace.
 *
 * Pure parsing lives in ../filters.ts so it can also be called from RSC
 * (Next 16 marks every export of a "use client" file as client-only).
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
