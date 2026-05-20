import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfileSettingsPage() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, full_name_th, phone, preferred_language")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("common.profile")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
      </div>

      <div className="card">
        <ProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            full_name_th: profile?.full_name_th ?? "",
            phone: profile?.phone ?? "",
            preferred_language: (profile?.preferred_language as "th" | "en") ?? "th",
          }}
        />
      </div>
    </div>
  );
}
