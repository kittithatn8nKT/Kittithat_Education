import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DepartmentsPage() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, name_en, code, head_user_id, created_at")
    .order("name");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.nav_departments")}</h1>
      </div>

      <Card>
        {departments && departments.length > 0 ? (
          <CardContent>
            <ul className="divide-border divide-y">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.name_en && <p className="text-muted-foreground text-xs">{d.name_en}</p>}
                  </div>
                  {d.code && <Badge variant="outline">{d.code}</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">No departments yet</CardTitle>
              <CardDescription>Department CRUD lands in Phase 2.</CardDescription>
            </CardHeader>
          </>
        )}
      </Card>
    </div>
  );
}
