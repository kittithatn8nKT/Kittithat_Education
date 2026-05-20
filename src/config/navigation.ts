import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type { MemberRole } from "@/types/database";

export interface NavItem {
  href: string;
  /** Translation key from messages/{th,en}.json */
  labelKey: string;
  icon: LucideIcon;
  /** Optional Phase gate — UI shows a "coming soon" badge if disabled. */
  phase?: 2 | 3 | 4 | 5;
  /** Optional role gate — only members with one of these roles see this item. */
  roles?: MemberRole[];
}

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard.nav_overview", icon: LayoutDashboard },
  { href: "/documents", labelKey: "dashboard.nav_documents", icon: FileText, phase: 2 },
  { href: "/workflows", labelKey: "dashboard.nav_workflows", icon: CheckSquare, phase: 4 },
  { href: "/departments", labelKey: "dashboard.nav_departments", icon: Building2 },
  { href: "/members", labelKey: "dashboard.nav_members", icon: Users },
  { href: "/ai", labelKey: "dashboard.nav_ai", icon: Sparkles, phase: 3 },
  {
    href: "/admin",
    labelKey: "dashboard.nav_admin",
    icon: Shield,
    roles: ["institution_admin", "super_admin"],
  },
  { href: "/settings", labelKey: "dashboard.nav_settings", icon: Settings },
];
