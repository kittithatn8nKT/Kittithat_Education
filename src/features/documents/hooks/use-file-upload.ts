"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { validateFile } from "@/lib/files/validation";
import { MAX_FILES_PER_UPLOAD } from "@/lib/files/constants";
import type { UploadItem } from "@/lib/files/types";
import { confirmUpload, getUploadUrl } from "@/features/documents/actions";

/**
 * useFileUpload — orchestrates client-side validation, signed-URL fetch,
 * XHR-based upload (so we can show progress), and the server confirmation.
 *
 * Each file is independent and runs in parallel. Items are tracked in
 * state keyed by a stable client-generated id so the React list never
 * reshuffles when uploads complete out of order.
 */
export function useFileUpload(options?: { onAllSettled?: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const xhrMap = useRef<Map<string, XMLHttpRequest>>(new Map());

  // Revoke any object URLs we created for image previews when the component
  // unmounts; leaving them around leaks memory.
  useEffect(() => {
    const liveXhrs = xhrMap.current;
    return () => {
      for (const item of items) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      for (const xhr of liveXhrs.values()) xhr.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      update(item.id, { status: "uploading", progress: 0 });

      // 1. Local validation — fast feedback before round-tripping.
      const v = validateFile({
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
      });
      if (!v.ok) {
        update(item.id, { status: "error", error: v.message });
        return;
      }

      // 2. Get signed URL from the server.
      let ticket;
      try {
        ticket = await getUploadUrl({
          filename: item.file.name,
          size: item.file.size,
          mime_type: item.file.type,
        });
      } catch (err) {
        update(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to start upload",
        });
        return;
      }

      // 3. PUT to signed URL via XHR so we get upload progress events.
      try {
        await xhrPutWithProgress(ticket.signedUrl, item.file, {
          onProgress: (loaded, total) => {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            // Cap at 95% until confirmUpload returns — gives the user a sense
            // of progress for the round-trip too.
            update(item.id, { progress: Math.min(95, pct) });
          },
          registerXhr: (xhr) => xhrMap.current.set(item.id, xhr),
        });
      } catch (err) {
        update(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Network error",
        });
        return;
      } finally {
        xhrMap.current.delete(item.id);
      }

      // 4. Tell the server to record the row.
      try {
        const result = await confirmUpload({
          path: ticket.path,
          filename: item.file.name,
          size: item.file.size,
          mime_type: item.file.type,
        });
        update(item.id, {
          status: "success",
          progress: 100,
          documentId: result.document_id,
        });
      } catch (err) {
        update(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to record upload",
        });
      }
    },
    [update]
  );

  const add = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      if (files.length > MAX_FILES_PER_UPLOAD) {
        toast.error(`อัปโหลดได้สูงสุด ${MAX_FILES_PER_UPLOAD} ไฟล์ต่อครั้ง`);
        files = files.slice(0, MAX_FILES_PER_UPLOAD);
      }

      const next: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued",
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));

      setItems((prev) => [...next, ...prev]);

      // Kick off each upload in parallel; we don't await here so the UI
      // updates immediately.
      void Promise.allSettled(next.map((item) => uploadOne(item))).then(() => {
        options?.onAllSettled?.();
      });
    },
    [uploadOne, options]
  );

  const cancel = useCallback((id: string) => {
    const xhr = xhrMap.current.get(id);
    if (xhr) {
      xhr.abort();
      xhrMap.current.delete(id);
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: "cancelled", error: "ยกเลิกการอัปโหลด" } : it
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== "success"));
  }, []);

  return { items, add, cancel, remove, clearCompleted };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

interface XhrOptions {
  onProgress: (loaded: number, total: number) => void;
  registerXhr?: (xhr: XMLHttpRequest) => void;
}

function xhrPutWithProgress(url: string, file: File, opts: XhrOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    opts.registerXhr?.(xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Cache-Control", "max-age=3600");

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) opts.onProgress(ev.loaded, ev.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`อัปโหลดล้มเหลว (HTTP ${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("เครือข่ายขัดข้อง")));
    xhr.addEventListener("abort", () => reject(new Error("ยกเลิกการอัปโหลด")));
    xhr.send(file);
  });
}
