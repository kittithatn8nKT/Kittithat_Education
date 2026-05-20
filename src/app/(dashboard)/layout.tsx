import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const displayName =
    session.profile?.full_name_th || session.profile?.full_name || session.user.email || null;

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar
          userEmail={session.user.email ?? ""}
          fullName={displayName}
          membership={session.active}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
