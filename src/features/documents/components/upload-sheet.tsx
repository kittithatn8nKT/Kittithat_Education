"use client";

import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UploadPanel } from "./upload-panel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSheet({ open, onOpenChange }: Props) {
  const t = useTranslations("documents");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-4 sm:max-w-xl sm:p-6">
        <SheetHeader className="px-0">
          <SheetTitle>{t("upload_title")}</SheetTitle>
          <SheetDescription>{t("upload_description")}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <UploadPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
