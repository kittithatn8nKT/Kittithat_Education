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
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          full_name_th: fullNameTh || null,
          phone: phone || null,
          preferred_language: lang,
        })
        .eq("id", user.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name_th">{t("auth.full_name_th")}</Label>
        <Input
          id="full_name_th"
          value={fullNameTh}
          onChange={(e) => setFullNameTh(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">{t("auth.full_name")}</Label>
        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lang">{t("common.language")}</Label>
        <Select value={lang} onValueChange={(v) => setLang(v as Locale)}>
          <SelectTrigger id="lang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="th">ไทย</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}
