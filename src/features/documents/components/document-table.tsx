"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/files/constants";
import { formatThaiDate } from "@/lib/utils";
import type { DocumentRow } from "../types";
import { DocumentRowActions } from "./document-row-actions";
import { FileIcon } from "./file-icon";
import { OcrStatusBadge } from "./ocr-status-badge";

interface Props {
  rows: DocumentRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
}

export function DocumentTable({ rows, selectedIds, onToggle, onToggleAll }: Props) {
  const t = useTranslations("documents");
  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedIds.has(id));

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={() => onToggleAll(allIds)}
                aria-label={t("table_select_all")}
              />
            </TableHead>
            <TableHead>{t("col_name")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("col_category")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("col_type")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("col_size")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("col_uploaded")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("col_ocr")}</TableHead>
            <TableHead className="w-24 text-right">{t("col_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.id);
            return (
              <TableRow key={row.id} data-state={selected ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`Select ${row.title}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <FileIcon mime={row.version?.mime_type ?? null} />
                    <span className="truncate font-medium" title={row.title}>
                      {row.title}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {row.category ? (
                    <Badge variant="secondary">{row.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {row.document_type ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                  {row.version?.file_size_bytes ? formatFileSize(row.version.file_size_bytes) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                  {formatThaiDate(row.created_at)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.version ? (
                    <OcrStatusBadge
                      status={row.version.ocr_status}
                      attempt={row.version.ocr_attempt}
                      maxAttempts={row.version.ocr_max_attempts}
                      error={row.version.ocr_error}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {row.version && (
                    <DocumentRowActions
                      documentId={row.id}
                      filePath={row.version.file_path}
                      fileName={row.version.file_name}
                      versionId={row.version.id}
                      ocrStatus={row.version.ocr_status}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
