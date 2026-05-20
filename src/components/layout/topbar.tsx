"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import type { Membership } from "@/types/database";

interface TopbarProps {
  userEmail: string;
  fullName: string | null;
  membership: Membership | null;
}

export function Topbar({ userEmail, fullName, membership }: TopbarProps) {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">
          {membership?.institution_name ?? t("common.app_name")}
        </span>
        {membership && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {membership.role}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu email={userEmail} fullName={fullName} />
      </div>
    </header>
  );
}
