import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FileText, CheckSquare, Users, Sparkles } from "lucide-react";
import type { Membership } from "@/types/database";

export default async function DashboardHomePage() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();

  const { data: memberships } = await supabase
    .from("my_memberships")
    .select("*")
    .limit(1);

  const membership = (memberships?.[0] ?? null) as Membership | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull live counts under RLS — each query is implicitly tenant-scoped.
  const [docs, workflows, members] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("institution_members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const stats = [
    { label: t("dashboard.stat_documents"), value: docs.count ?? 0, icon: FileText },
    { label: t("dashboard.stat_workflows_pending"), value: workflows.count ?? 0, icon: CheckSquare },
    { label: t("dashboard.stat_members"), value: members.count ?? 0, icon: Users },
    { label: t("dashboard.stat_ai_usage"), value: 0, icon: Sparkles },
  ];

  const isTrial = membership?.subscription_status === "trial";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t("dashboard.welcome")}, {user?.email}
        </p>
      </div>

      {isTrial && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {t("dashboard.trial_banner", { days: 30 })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Phase 1 — Foundation</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Authentication, multi-tenant data isolation, and the dashboard shell are
          live. Document upload, OCR, AI summaries, RAG chat, workflows, and
          billing will be added in subsequent phases. See <code>docs/ROADMAP.md</code>.
        </p>
      </div>
    </div>
  );
}
