"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveDocuments, deleteDocuments, restoreDocuments } from "../actions";
import type { DocumentStatusTab } from "../types";

interface Props {
  selectedIds: string[];
  selectedCount: number;
  onClear: () => void;
  /** Drives which actions show — archive in active, restore in archived. */
  statusTab: DocumentStatusTab;
}

export function BulkActionBar({ selectedIds, selectedCount, onClear, statusTab }: Props) {
  const t = useTranslations("documents");
  const [isPending, startTransition] = useTransition();

  if (selectedCount === 0) return null;

  function run(
    op: (input: { document_ids: string[] }) => Promise<unknown>,
    success: string,
    confirmPrompt?: string
  ) {
    if (confirmPrompt && !confirm(confirmPrompt)) return;
    startTransition(async () => {
      try {
        await op({ document_ids: selectedIds });
        toast.success(success);
        onClear();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="bg-card border-border sticky bottom-4 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onClear}
          aria-label={t("bulk_clear")}
        >
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{t("bulk_selected", { count: selectedCount })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusTab === "active" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(archiveDocuments, t("bulk_archived_toast"))}
          >
            <Archive className="h-4 w-4" />
            {t("bulk_archive")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(restoreDocuments, t("bulk_restored_toast"))}
          >
            <ArchiveRestore className="h-4 w-4" />
            {t("bulk_restore")}
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => run(deleteDocuments, t("bulk_deleted_toast"), t("bulk_delete_confirm"))}
        >
          <Trash2 className="h-4 w-4" />
          {t("bulk_delete")}
        </Button>
      </div>
    </div>
  );
}
