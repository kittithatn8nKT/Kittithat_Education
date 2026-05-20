import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FileText, CheckSquare, Users, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Membership } from "@/types/database";

export default async function DashboardHomePage() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();

  const { data: memberships } = await supabase.from("my_memberships").select("*").limit(1);

  const membership = (memberships?.[0] ?? null) as Membership | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [docs, workflows, members] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("institution_members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const stats = [
    {
      label: t("dashboard.stat_documents"),
      value: docs.count ?? 0,
      icon: FileText,
    },
    {
      label: t("dashboard.stat_workflows_pending"),
      value: workflows.count ?? 0,
      icon: CheckSquare,
    },
    {
      label: t("dashboard.stat_members"),
      value: members.count ?? 0,
      icon: Users,
    },
    { label: t("dashboard.stat_ai_usage"), value: 0, icon: Sparkles },
  ];

  const isTrial = membership?.subscription_status === "trial";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("dashboard.welcome")}, {user?.email}
        </p>
      </div>

      {isTrial && (
        <Alert>
          <AlertTitle>Trial</AlertTitle>
          <AlertDescription>{t("dashboard.trial_banner", { days: 30 })}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
              <div className="bg-primary/10 text-primary inline-flex h-9 w-9 items-center justify-center rounded-lg">
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase 1 — Foundation</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Authentication, multi-tenant data isolation, and the dashboard shell are live. Document
          upload, OCR, AI summaries, RAG chat, workflows, and billing will be added in subsequent
          phases. See <code className="bg-muted rounded px-1 py-0.5 text-xs">docs/ROADMAP.md</code>.
        </CardContent>
      </Card>
    </div>
  );
}
