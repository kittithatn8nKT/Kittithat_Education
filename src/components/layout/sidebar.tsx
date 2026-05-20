"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Building2,
  Users,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: t("dashboard.nav_overview"), icon: LayoutDashboard },
    { href: "/documents", label: t("dashboard.nav_documents"), icon: FileText },
    { href: "/workflows", label: t("dashboard.nav_workflows"), icon: CheckSquare },
    { href: "/departments", label: t("dashboard.nav_departments"), icon: Building2 },
    { href: "/members", label: t("dashboard.nav_members"), icon: Users },
    { href: "/ai", label: t("dashboard.nav_ai"), icon: Sparkles },
    { href: "/settings", label: t("dashboard.nav_settings"), icon: Settings },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
      <div className="flex h-16 items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          {t("common.app_name")}
        </Link>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
