import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { DocumentList } from "@/features/documents/components/document-list";
import { UploadPanel } from "@/features/documents/components/upload-panel";

export default async function DocumentsPage() {
  // Layout already requires a session, but calling again here narrows the
  // type for any future per-permission gating on this page.
  await requireSession("/documents");
  const t = await getTranslations("documents");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("page_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("page_subtitle")}</p>
      </div>

      <UploadPanel />

      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentList />
      </Suspense>
    </div>
  );
}

function DocumentListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
