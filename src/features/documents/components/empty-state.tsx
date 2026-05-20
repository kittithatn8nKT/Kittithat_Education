"use client";

import { useTranslations } from "next-intl";
import { FileSearch, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentFilters } from "../hooks/use-document-filters";

interface Props {
  hasFilters: boolean;
  onOpenUpload: () => void;
}

export function DocumentEmptyState({ hasFilters, onOpenUpload }: Props) {
  const t = useTranslations("documents");
  const { reset } = useDocumentFilters();

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {hasFilters ? (
          <FileSearch className="text-muted-foreground h-10 w-10" />
        ) : (
          <Inbox className="text-muted-foreground h-10 w-10" />
        )}
        <CardTitle className="mt-4 text-base">
          {hasFilters ? t("empty_filtered_title") : t("empty_title")}
        </CardTitle>
        <CardDescription>
          {hasFilters ? t("empty_filtered_description") : t("empty_description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-2">
        {hasFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            {t("empty_clear_filters")}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onOpenUpload}>
            {t("toolbar_upload")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
