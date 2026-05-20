import { getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize } from "@/lib/files/constants";
import { formatThaiDate } from "@/lib/utils";
import { listRecentDocuments } from "../queries";
import { FileIcon } from "./file-icon";
import { DocumentRowActions } from "./document-row-actions";

/**
 * Server Component — renders the current tenant's documents. RLS scopes
 * the query, so we don't need to filter by institution_id here.
 */
export async function DocumentList() {
  const t = await getTranslations("documents");
  const docs = await listRecentDocuments(50);

  if (docs.length === 0) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <Inbox className="text-muted-foreground h-10 w-10" />
          <CardTitle className="mt-4 text-base">{t("list_empty_title")}</CardTitle>
          <CardDescription>{t("list_empty_description")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("list_title")}</CardTitle>
        <CardDescription>{t("list_count", { count: docs.length })}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-3">
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                <FileIcon mime={doc.version?.mime_type ?? null} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={doc.title}>
                  {doc.title}
                </p>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {doc.document_type && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {doc.document_type}
                    </Badge>
                  )}
                  {doc.version?.file_size_bytes && (
                    <span>{formatFileSize(doc.version.file_size_bytes)}</span>
                  )}
                  <span>{formatThaiDate(doc.created_at)}</span>
                </div>
              </div>

              {doc.version && (
                <DocumentRowActions
                  documentId={doc.id}
                  filePath={doc.version.file_path}
                  fileName={doc.version.file_name}
                />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
