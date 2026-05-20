"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUpload } from "../hooks/use-file-upload";
import { UploadDropzone } from "./upload-dropzone";
import { UploadItem } from "./upload-item";

/**
 * Wraps the dropzone + the in-flight upload list. Drops directly onto the
 * dropzone OR clicks on the "เลือกไฟล์" button feed into useFileUpload,
 * which handles validation, signed-URL fetch, XHR PUT with progress, and
 * the server confirmation.
 */
export function UploadPanel() {
  const t = useTranslations("documents");
  const router = useRouter();

  const { items, add, cancel, remove, clearCompleted } = useFileUpload({
    // Refresh the documents list after the batch settles so newly-uploaded
    // rows show up in the list below.
    onAllSettled: () => router.refresh(),
  });

  const completed = items.filter((it) => it.status === "success").length;
  const inFlight = items.some((it) => it.status === "uploading" || it.status === "queued");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("upload_title")}</CardTitle>
        <CardDescription>{t("upload_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadDropzone onFiles={add} />

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t("upload_queue", { count: items.length })}</h3>
              {completed > 0 && !inFlight && (
                <Button type="button" size="xs" variant="ghost" onClick={clearCompleted}>
                  {t("upload_clear_completed")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {items.map((item) => (
                <UploadItem key={item.id} item={item} onCancel={cancel} onRemove={remove} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
