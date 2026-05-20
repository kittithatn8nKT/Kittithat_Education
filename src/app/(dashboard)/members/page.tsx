import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MembersPage() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();

  const { data: members } = await supabase
    .from("institution_members")
    .select("id, role, title, is_active, joined_at, user_id")
    .eq("is_active", true)
    .order("joined_at");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.nav_members")}</h1>
      </div>

      <Card>
        {members && members.length > 0 ? (
          <CardContent>
            <ul className="divide-border divide-y">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-muted-foreground font-mono text-sm">
                      {m.user_id.slice(0, 8)}…
                    </p>
                    {m.title && <p className="text-muted-foreground text-xs">{m.title}</p>}
                  </div>
                  <Badge>{m.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">No members yet</CardTitle>
              <CardDescription>Invite teammates from the admin panel in Phase 2.</CardDescription>
            </CardHeader>
          </>
        )}
      </Card>
    </div>
  );
}
