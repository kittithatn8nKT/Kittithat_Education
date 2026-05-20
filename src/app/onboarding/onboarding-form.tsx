"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { InstitutionType } from "@/types/database";

export function OnboardingForm() {
  const t = useTranslations();
  const router = useRouter();

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [type, setType] = useState<InstitutionType>("secondary");
  const [thaiId, setThaiId] = useState("");
  const [province, setProvince] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("create_institution_with_admin", {
        p_name: name,
        p_name_en: nameEn || null,
        p_slug: slug,
        p_type: type,
        p_thai_id: thaiId || null,
        p_province: province || null,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) {
        toast.error(t("common.error_generic"));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  const types: { value: InstitutionType; label: string }[] = [
    { value: "primary", label: t("onboarding.type_primary") },
    { value: "secondary", label: t("onboarding.type_secondary") },
    { value: "vocational", label: t("onboarding.type_vocational") },
    { value: "university", label: t("onboarding.type_university") },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("onboarding.institution_name")}</Label>
        <Input id="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name_en">{t("onboarding.institution_name_en")}</Label>
        <Input id="name_en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">{t("onboarding.institution_slug")}</Label>
        <Input
          id="slug"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        <p className="text-muted-foreground text-xs">{t("onboarding.slug_hint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t("onboarding.institution_type")}</Label>
        <Select value={type} onValueChange={(v) => setType(v as InstitutionType)}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="thai_id">{t("onboarding.thai_id")}</Label>
          <Input
            id="thai_id"
            inputMode="numeric"
            maxLength={10}
            value={thaiId}
            onChange={(e) => setThaiId(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">{t("onboarding.province")}</Label>
          <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("common.loading") : t("onboarding.create_button")}
      </Button>
    </form>
  );
}
