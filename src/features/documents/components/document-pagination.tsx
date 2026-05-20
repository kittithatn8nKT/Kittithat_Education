"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentFilters } from "../hooks/use-document-filters";

interface Props {
  total: number;
  pageCount: number;
}

export function DocumentPagination({ total, pageCount }: Props) {
  const t = useTranslations("documents");
  const { filters, patch } = useDocumentFilters();
  const { page, pageSize } = filters;

  if (pageCount <= 1) {
    return <p className="text-muted-foreground text-xs">{t("page_count_simple", { total })}</p>;
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs">{t("page_range", { start, end, total })}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => patch({ page: page - 1 })}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs tabular-nums">
          {t("page_indicator", { page, pageCount })}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => patch({ page: page + 1 })}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
