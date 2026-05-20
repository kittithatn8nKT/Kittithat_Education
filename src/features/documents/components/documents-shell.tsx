"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentFilters } from "../hooks/use-document-filters";
import { useDocumentSelection } from "../hooks/use-document-selection";
import type { DocumentCategory, DocumentRow, DocumentStatusTab } from "../types";
import { BulkActionBar } from "./bulk-action-bar";
import { CategoryManager } from "./category-manager";
import { DocumentEmptyState } from "./empty-state";
import { DocumentGrid } from "./document-grid";
import { DocumentPagination } from "./document-pagination";
import { DocumentTable } from "./document-table";
import { DocumentToolbar } from "./document-toolbar";
import { UploadSheet } from "./upload-sheet";

interface Props {
  rows: DocumentRow[];
  total: number;
  pageCount: number;
  categories: DocumentCategory[];
  departments: { id: string; name: string }[];
  canManageCategories: boolean;
}

/**
 * Client wrapper that owns the local UI state (selection, dialogs) and
 * delegates server-side data to the props passed in from the RSC page.
 *
 * The URL is the source of truth for filters/sort/view — useDocumentFilters
 * reads + writes searchParams, which round-trips back to this component
 * via router.replace -> RSC re-render.
 */
export function DocumentsShell({
  rows,
  total,
  pageCount,
  categories,
  departments,
  canManageCategories,
}: Props) {
  const t = useTranslations("documents");
  const { filters, patch } = useDocumentFilters();
  const selection = useDocumentSelection();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const selectedIdSet = new Set(selection.ids);
  const hasActiveFilters = Boolean(
    filters.q ||
    filters.category_id ||
    filters.department_id ||
    filters.type ||
    filters.from ||
    filters.to
  );

  return (
    <div className="space-y-4">
      <DocumentToolbar
        categories={categories}
        departments={departments}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        canManageCategories={canManageCategories}
      />

      <Tabs value={filters.status} onValueChange={(v) => patch({ status: v as DocumentStatusTab })}>
        <TabsList>
          <TabsTrigger value="active">{t("tab_active")}</TabsTrigger>
          <TabsTrigger value="archived">{t("tab_archived")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <DocumentEmptyState
          hasFilters={hasActiveFilters}
          onOpenUpload={() => setUploadOpen(true)}
        />
      ) : filters.view === "grid" ? (
        <DocumentGrid rows={rows} selectedIds={selectedIdSet} onToggle={selection.toggle} />
      ) : (
        <DocumentTable
          rows={rows}
          selectedIds={selectedIdSet}
          onToggle={selection.toggle}
          onToggleAll={selection.toggleAll}
        />
      )}

      <DocumentPagination total={total} pageCount={pageCount} />

      <BulkActionBar
        selectedIds={selection.ids}
        selectedCount={selection.count}
        onClear={selection.clear}
        statusTab={filters.status}
      />

      <UploadSheet open={uploadOpen} onOpenChange={setUploadOpen} />

      {canManageCategories && (
        <CategoryManager
          open={categoryManagerOpen}
          onOpenChange={setCategoryManagerOpen}
          categories={categories}
        />
      )}
    </div>
  );
}
