import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Building2,
  Users,
  Sparkles,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Translation key from messages/{th,en}.json */
  labelKey: string;
  icon: LucideIcon;
  /** Optional Phase gate — UI shows a "coming soon" badge if disabled */
  phase?: 2 | 3 | 4 | 5;
}

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard.nav_overview", icon: LayoutDashboard },
  { href: "/documents", labelKey: "dashboard.nav_documents", icon: FileText, phase: 2 },
  { href: "/workflows", labelKey: "dashboard.nav_workflows", icon: CheckSquare, phase: 4 },
  { href: "/departments", labelKey: "dashboard.nav_departments", icon: Building2 },
  { href: "/members", labelKey: "dashboard.nav_members", icon: Users },
  { href: "/ai", labelKey: "dashboard.nav_ai", icon: Sparkles, phase: 3 },
  { href: "/settings", labelKey: "dashboard.nav_settings", icon: Settings },
];
