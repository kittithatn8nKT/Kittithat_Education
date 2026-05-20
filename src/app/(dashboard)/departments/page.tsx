import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

      <div className="card">
        {departments && departments.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  {d.name_en && (
                    <p className="text-xs text-slate-500">{d.name_en}</p>
                  )}
                </div>
                {d.code && (
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {d.code}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No departments yet. Department CRUD lands in Phase 2.
          </p>
        )}
      </div>
    </div>
  );
}
