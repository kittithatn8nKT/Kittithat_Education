"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createCategory, deleteCategory } from "../actions";
import type { DocumentCategory } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: DocumentCategory[];
}

export function CategoryManager({ open, onOpenChange, categories }: Props) {
  const t = useTranslations("documents");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createCategory({ name: name.trim(), name_en: nameEn || undefined });
        setName("");
        setNameEn("");
        toast.success(t("category_created"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(t("category_delete_confirm", { name: label }))) return;
    startTransition(async () => {
      try {
        await deleteCategory({ id });
        toast.success(t("category_deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("categories_title")}</DialogTitle>
          <DialogDescription>{t("categories_description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">{t("category_name")}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder={t("category_name_placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name-en">{t("category_name_en")}</Label>
            <Input
              id="cat-name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              maxLength={80}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending || !name.trim()} className="w-full">
            <Plus className="h-4 w-4" />
            {t("category_add")}
          </Button>
        </form>

        <Separator />

        <div>
          <p className="text-muted-foreground mb-2 text-xs">{t("categories_existing")}</p>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("categories_empty")}</p>
          ) : (
            <ScrollArea className="h-56 pr-3">
              <ul className="space-y-1.5">
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Badge variant="secondary">{c.name}</Badge>
                      {c.name_en && (
                        <span className="text-muted-foreground ml-2 text-xs">{c.name_en}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleDelete(c.id, c.name)}
                      aria-label="Delete"
                    >
                      <Trash2 className="text-destructive h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
