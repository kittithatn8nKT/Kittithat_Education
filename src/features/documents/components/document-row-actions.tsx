"use client";

import { useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET_DOCUMENTS } from "@/lib/files/constants";
import { softDeleteDocument } from "../actions";

interface Props {
  documentId: string;
  filePath: string;
  fileName: string;
}

export function DocumentRowActions({ documentId, filePath, fileName }: Props) {
  const [isDownloading, startDownload] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleDownload() {
    startDownload(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET_DOCUMENTS)
          .createSignedUrl(filePath, 60);
        if (error || !data) {
          toast.error(error?.message ?? "ดาวน์โหลดไม่สำเร็จ");
          return;
        }
        // Open in a new tab — keeps user on the documents list.
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ");
      }
    });
  }

  function handleDelete() {
    if (!confirm("ต้องการลบเอกสารนี้?")) return;
    startDelete(async () => {
      try {
        await softDeleteDocument({ document_id: documentId });
        toast.success("ลบเอกสารแล้ว");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label="Download"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Delete"
      >
        <Trash2 className="text-destructive h-4 w-4" />
      </Button>
    </div>
  );
}
