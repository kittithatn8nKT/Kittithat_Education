"use client";

import { useTransition } from "react";
import { Download, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET_DOCUMENTS } from "@/lib/files/constants";
import { retryOcrForVersion, softDeleteDocument } from "../actions";
import type { OcrStatus } from "../types";

interface Props {
  documentId: string;
  filePath: string;
  fileName: string;
  /** Pass the current OCR status to surface a retry button on failure. */
  versionId?: string;
  ocrStatus?: OcrStatus;
}

export function DocumentRowActions({
  documentId,
  filePath,
  fileName,
  versionId,
  ocrStatus,
}: Props) {
  const [isDownloading, startDownload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isRetrying, startRetry] = useTransition();

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

  function handleRetryOcr() {
    if (!versionId) return;
    startRetry(async () => {
      try {
        await retryOcrForVersion({ version_id: versionId });
        toast.success("เริ่มประมวลผล OCR อีกครั้ง");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ลองใหม่ไม่สำเร็จ");
      }
    });
  }

  const showRetry = ocrStatus === "failed" && versionId;

  return (
    <div className="flex items-center gap-1">
      {showRetry && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleRetryOcr}
          disabled={isRetrying}
          aria-label="Retry OCR"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      )}
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
