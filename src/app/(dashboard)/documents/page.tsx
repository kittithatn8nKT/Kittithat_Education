import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { DocumentsShell } from "@/features/documents/components/documents-shell";
import { parseDocumentFilters } from "@/features/documents/hooks/use-document-filters";
import {
  listCategories,
  listDepartmentsForFilter,
  listDocuments,
} from "@/features/documents/queries";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await requireSession("/documents");
  const t = await getTranslations("documents");
  const params = await searchParams;
  const filters = parseDocumentFilters(params);

  // Three parallel reads — RSC streams the result of all of them.
  const [list, categories, departments] = await Promise.all([
    listDocuments(filters),
    listCategories(),
    listDepartmentsForFilter(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("page_title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("page_subtitle")}</p>
      </div>

      <DocumentsShell
        rows={list.rows}
        total={list.total}
        pageCount={list.pageCount}
        categories={categories}
        departments={departments}
        canManageCategories={can(session.role, "department", "create")}
      />
    </div>
  );
}
