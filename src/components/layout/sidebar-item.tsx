"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  href: string;
  label: string;
  /** Rendered icon element — passed as children so we don't cross
   *  the RSC boundary with a function reference (React 19 strict). */
  children: ReactNode;
}

export function SidebarItem({ href, label, children }: SidebarItemProps) {
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
        {children}
        {label}
      </Link>
    </li>
  );
}
