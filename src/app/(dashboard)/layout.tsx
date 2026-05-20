import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getMyMemberships } from "@/features/institutions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getMyMemberships();
  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, full_name_th")
    .eq("id", user.id)
    .single();

  const activeMembership = memberships[0];
  const displayName = profile?.full_name_th || profile?.full_name || user.email || null;

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userEmail={user.email ?? ""} fullName={displayName} membership={activeMembership} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
