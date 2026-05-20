import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

      <div className="card">
        {members && members.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-mono text-slate-500">{m.user_id.slice(0, 8)}…</p>
                  {m.title && <p className="text-xs text-slate-500">{m.title}</p>}
                </div>
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No members yet.</p>
        )}
      </div>
    </div>
  );
}
