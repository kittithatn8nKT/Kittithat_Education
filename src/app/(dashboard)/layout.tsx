import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Membership } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("my_memberships")
    .select("*")
    .order("institution_name");

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, full_name_th")
    .eq("id", user.id)
    .single();

  const activeMembership = memberships[0] as Membership;
  const displayName =
    profile?.full_name_th || profile?.full_name || user.email || null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar
          userEmail={user.email ?? ""}
          fullName={displayName}
          membership={activeMembership}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
