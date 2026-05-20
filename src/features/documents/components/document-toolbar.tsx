"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  LayoutGrid,
  LayoutList,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDocumentFilters } from "../hooks/use-document-filters";
import type { DocumentCategory, DocumentSort, DocumentView } from "../types";

interface Props {
  categories: DocumentCategory[];
  departments: { id: string; name: string }[];
  onOpenUpload: () => void;
  onOpenCategoryManager: () => void;
  canManageCategories: boolean;
}

const TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "word", label: "DOCX" },
  { value: "spreadsheet", label: "XLSX" },
  { value: "presentation", label: "PPTX" },
  { value: "image", label: "Images" },
  { value: "text", label: "TXT" },
  { value: "csv", label: "CSV" },
];

const SORT_OPTIONS: { value: DocumentSort; label: string }[] = [
  { value: "created_at_desc", label: "ใหม่ → เก่า" },
  { value: "created_at_asc", label: "เก่า → ใหม่" },
  { value: "title_asc", label: "ชื่อ A → Z" },
  { value: "title_desc", label: "ชื่อ Z → A" },
];

export function DocumentToolbar({
  categories,
  departments,
  onOpenUpload,
  onOpenCategoryManager,
  canManageCategories,
}: Props) {
  const t = useTranslations("documents");
  const { filters, patch, reset } = useDocumentFilters();
  const [searchDraft, setSearchDraft] = useState(filters.q);

  const activeFilterCount = [
    filters.category_id,
    filters.department_id,
    filters.type,
    filters.from,
    filters.to,
  ].filter(Boolean).length;

  function commitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    patch({ q: searchDraft });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <form onSubmit={commitSearch} className="relative flex-1 sm:max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder={t("toolbar_search_placeholder")}
          className="pl-9"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onBlur={commitSearch}
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {/* Filters popover */}
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                {t("toolbar_filters")}
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80 space-y-3">
            <FilterRow label={t("filter_category")}>
              <Select
                value={filters.category_id ?? "_all"}
                onValueChange={(v) => patch({ category_id: v === "_all" ? null : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t("filter_all")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterRow>

            <FilterRow label={t("filter_department")}>
              <Select
                value={filters.department_id ?? "_all"}
                onValueChange={(v) => patch({ department_id: v === "_all" ? null : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t("filter_all")}</SelectItem>
                  {departments.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      {t("filter_no_departments")}
                    </SelectItem>
                  ) : (
                    departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FilterRow>

            <FilterRow label={t("filter_type")}>
              <Select
                value={filters.type ?? "_all"}
                onValueChange={(v) => patch({ type: v === "_all" ? null : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t("filter_all")}</SelectItem>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterRow>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <FilterRow label={t("filter_from")}>
                <Input
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(e) => patch({ from: e.target.value || null })}
                />
              </FilterRow>
              <FilterRow label={t("filter_to")}>
                <Input
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(e) => patch({ to: e.target.value || null })}
                />
              </FilterRow>
            </div>

            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={reset} className="w-full">
                <X className="h-3.5 w-3.5" />
                {t("filter_clear_all")}
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as DocumentSort })}>
          <SelectTrigger size="sm" className="min-w-[10rem]">
            {filters.sort.endsWith("_desc") ? (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="border-input flex items-center rounded-md border">
          <ViewButton
            mode="table"
            current={filters.view}
            onClick={() => patch({ view: "table" })}
            label={t("view_table")}
          >
            <LayoutList className="h-4 w-4" />
          </ViewButton>
          <ViewButton
            mode="grid"
            current={filters.view}
            onClick={() => patch({ view: "grid" })}
            label={t("view_grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </ViewButton>
        </div>

        {/* Category manager (admin only) */}
        {canManageCategories && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenCategoryManager}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("toolbar_categories")}</span>
          </Button>
        )}

        <Button type="button" size="sm" onClick={onOpenUpload}>
          <Upload className="h-4 w-4" />
          {t("toolbar_upload")}
        </Button>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ViewButton({
  mode,
  current,
  onClick,
  label,
  children,
}: {
  mode: DocumentView;
  current: DocumentView;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={
        "flex h-8 w-8 items-center justify-center transition-colors " +
        (active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60")
      }
    >
      {children}
    </button>
  );
}
