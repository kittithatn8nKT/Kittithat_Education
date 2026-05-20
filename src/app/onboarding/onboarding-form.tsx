"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error: rpcError } = await supabase.rpc(
        "create_institution_with_admin",
        {
          p_name: name,
          p_name_en: nameEn || null,
          p_slug: slug,
          p_type: type,
          p_thai_id: thaiId || null,
          p_province: province || null,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (!data) {
        setError(t("common.error_generic"));
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
      <div>
        <label htmlFor="name" className="label">
          {t("onboarding.institution_name")}
        </label>
        <input
          id="name"
          required
          className="input"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="name_en" className="label">
          {t("onboarding.institution_name_en")}
        </label>
        <input
          id="name_en"
          className="input"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="slug" className="label">
          {t("onboarding.institution_slug")}
        </label>
        <input
          id="slug"
          required
          pattern="[a-z0-9-]+"
          className="input"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        <p className="mt-1 text-xs text-slate-500">{t("onboarding.slug_hint")}</p>
      </div>

      <div>
        <label htmlFor="type" className="label">
          {t("onboarding.institution_type")}
        </label>
        <select
          id="type"
          required
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value as InstitutionType)}
        >
          {types.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="thai_id" className="label">
            {t("onboarding.thai_id")}
          </label>
          <input
            id="thai_id"
            inputMode="numeric"
            maxLength={10}
            className="input"
            value={thaiId}
            onChange={(e) => setThaiId(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div>
          <label htmlFor="province" className="label">
            {t("onboarding.province")}
          </label>
          <input
            id="province"
            className="input"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? t("common.loading") : t("onboarding.create_button")}
      </button>
    </form>
  );
}
