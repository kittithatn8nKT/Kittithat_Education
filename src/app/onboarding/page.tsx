import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  // If the user already has any active membership, skip onboarding.
  const { data: memberships } = await supabase
    .from("my_memberships")
    .select("institution_id")
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="card">
          <h1 className="text-2xl font-bold">{t("onboarding.title")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t("onboarding.subtitle")}
          </p>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
  );
}
