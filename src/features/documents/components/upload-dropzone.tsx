"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTRIBUTE, MAX_FILES_PER_UPLOAD } from "@/lib/files/constants";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFiles, disabled }: Props) {
  const t = useTranslations("documents");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      role="region"
      aria-label={t("dropzone_aria")}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "border-input bg-card relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        dragOver && "border-primary bg-primary/5",
        disabled && "opacity-50"
      )}
    >
      <UploadCloud className="text-muted-foreground h-10 w-10" aria-hidden />
      <p className="mt-4 text-sm font-medium">{t("dropzone_title")}</p>
      <p className="text-muted-foreground mt-1 text-xs">{t("dropzone_subtitle")}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        {t("dropzone_max", { count: MAX_FILES_PER_UPLOAD })}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {t("dropzone_button")}
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          // Reset so re-selecting the same file fires the change event.
          e.target.value = "";
        }}
      />
    </div>
  );
}
