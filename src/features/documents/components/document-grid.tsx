"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/files/constants";
import { formatThaiDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DocumentRow } from "../types";
import { DocumentRowActions } from "./document-row-actions";
import { FileIcon } from "./file-icon";

interface Props {
  rows: DocumentRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function DocumentGrid({ rows, selectedIds, onToggle }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => {
        const selected = selectedIds.has(row.id);
        return (
          <li
            key={row.id}
            className={cn(
              "bg-card border-border relative flex flex-col gap-3 rounded-lg border p-4 transition-colors",
              selected && "ring-primary ring-2"
            )}
          >
            <div className="absolute top-2 left-2">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggle(row.id)}
                aria-label={`Select ${row.title}`}
              />
            </div>
            <div className="bg-muted ml-8 inline-flex h-10 w-10 items-center justify-center rounded">
              <FileIcon mime={row.version?.mime_type ?? null} />
            </div>
            <p className="line-clamp-2 text-sm font-medium" title={row.title}>
              {row.title}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] uppercase">
                {row.document_type ?? "—"}
              </Badge>
              {row.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {row.category.name}
                </Badge>
              )}
              {row.version?.file_size_bytes && (
                <span>{formatFileSize(row.version.file_size_bytes)}</span>
              )}
            </div>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {formatThaiDate(row.created_at)}
              </span>
              {row.version && (
                <DocumentRowActions
                  documentId={row.id}
                  filePath={row.version.file_path}
                  fileName={row.version.file_name}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
