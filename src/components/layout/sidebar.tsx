import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { dashboardNav } from "@/config/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarItem } from "./sidebar-item";

export async function Sidebar() {
  const t = await getTranslations();
  const session = await getSession();
  const role = session?.role;

  const items = dashboardNav.filter((item) => {
    if (!item.roles) return true;
    if (!role) return false;
    if (role === "super_admin") return true;
    return item.roles.includes(role);
  });

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 shrink-0 border-r md:block">
      <div className="border-sidebar-border flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          {t("common.app_name")}
        </Link>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            // Render the icon HERE on the server. The resulting element is a
            // plain JSX object that serializes across the RSC boundary; the
            // raw LucideIcon function would not.
            const Icon = item.icon;
            return (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={t(item.labelKey as Parameters<typeof t>[0])}
              >
                <Icon className="h-4 w-4" />
              </SidebarItem>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
