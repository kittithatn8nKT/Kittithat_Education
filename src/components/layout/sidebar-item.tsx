"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function SidebarItem({ href, label, icon: Icon }: SidebarItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </li>
  );
}
