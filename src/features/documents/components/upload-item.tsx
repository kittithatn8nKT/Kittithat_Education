"use client";

import Image from "next/image";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/files/constants";
import type { UploadItem as UploadItemModel } from "@/lib/files/types";
import { FileIcon } from "./file-icon";

interface Props {
  item: UploadItemModel;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadItem({ item, onCancel, onRemove }: Props) {
  return (
    <li className="bg-card border-border flex items-start gap-3 rounded-lg border p-3">
      {item.previewUrl ? (
        <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
          <Image
            src={item.previewUrl}
            alt=""
            fill
            sizes="40px"
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
          <FileIcon mime={item.file.type} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium" title={item.file.name}>
            {item.file.name}
          </p>
          <StatusIcon status={item.status} />
        </div>
        <p className="text-muted-foreground text-xs">{formatFileSize(item.file.size)}</p>

        {(item.status === "uploading" || item.status === "queued") && (
          <Progress value={item.progress} className="mt-2 h-1.5" />
        )}

        {item.status === "error" && <p className="text-destructive mt-1 text-xs">{item.error}</p>}
        {item.status === "cancelled" && (
          <p className="text-muted-foreground mt-1 text-xs">{item.error}</p>
        )}
      </div>

      {(item.status === "uploading" || item.status === "queued") && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => onCancel(item.id)}
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {(item.status === "success" || item.status === "error" || item.status === "cancelled") && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => onRemove(item.id)}
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: UploadItemModel["status"] }) {
  switch (status) {
    case "uploading":
    case "queued":
      return <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error":
    case "cancelled":
      return <XCircle className="text-destructive h-4 w-4" />;
    default:
      return null;
  }
}
