import { getTranslations } from "next-intl/server";
import { CheckSquare, FileText, Sparkles, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession, sessionCan } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations();
  const session = await requireSession();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  // RLS scopes each query to the active institution automatically.
  const [docs, workflows, members] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("institution_members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const stats = [
    { label: t("dashboard.stat_documents"), value: docs.count ?? 0, icon: FileText },
    {
      label: t("dashboard.stat_workflows_pending"),
      value: workflows.count ?? 0,
      icon: CheckSquare,
    },
    { label: t("dashboard.stat_members"), value: members.count ?? 0, icon: Users },
    { label: t("dashboard.stat_ai_usage"), value: 0, icon: Sparkles },
  ];

  const isTrial = session.active.subscription_status === "trial";
  const canViewAudit = sessionCan(session, "audit", "view");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("dashboard.welcome")}, {session.user.email}
        </p>
      </div>

      {params.error === "forbidden" && (
        <Alert variant="destructive">
          <AlertTitle>403</AlertTitle>
          <AlertDescription>
            คุณไม่มีสิทธิ์เข้าหน้าดังกล่าว · You don&apos;t have permission to access that page.
          </AlertDescription>
        </Alert>
      )}

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

      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle>Admin tools</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            You can see this card because your role is{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">{session.role}</code>. Audit log
            access goes here in Phase 4.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
