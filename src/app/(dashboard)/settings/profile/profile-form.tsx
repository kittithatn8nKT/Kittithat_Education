"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/types/database";

interface ProfileFormProps {
  initial: {
    full_name: string;
    full_name_th: string;
    phone: string;
    preferred_language: Locale;
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const t = useTranslations();
  const router = useRouter();

  const [fullName, setFullName] = useState(initial.full_name);
  const [fullNameTh, setFullNameTh] = useState(initial.full_name_th);
  const [phone, setPhone] = useState(initial.phone);
  const [lang, setLang] = useState<Locale>(initial.preferred_language);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          full_name_th: fullNameTh || null,
          phone: phone || null,
          preferred_language: lang,
        })
        .eq("id", user.id);

      if (upErr) {
        setError(upErr.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="full_name_th" className="label">
          {t("auth.full_name_th")}
        </label>
        <input
          id="full_name_th"
          className="input"
          value={fullNameTh}
          onChange={(e) => setFullNameTh(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="full_name" className="label">
          {t("auth.full_name")}
        </label>
        <input
          id="full_name"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="phone" className="label">
          Phone
        </label>
        <input
          id="phone"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="lang" className="label">
          {t("common.language")}
        </label>
        <select
          id="lang"
          className="input"
          value={lang}
          onChange={(e) => setLang(e.target.value as Locale)}
        >
          <option value="th">ไทย</option>
          <option value="en">English</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? t("common.loading") : t("common.save")}
      </button>
    </form>
  );
}
