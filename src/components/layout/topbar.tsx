"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
    <header className="bg-background/80 border-border sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur">
      <div className="flex flex-col">
        <span className="text-sm leading-tight font-semibold">
          {membership?.institution_name ?? t("common.app_name")}
        </span>
        {membership && (
          <Badge variant="secondary" className="mt-0.5 w-fit text-[10px]">
            {membership.role}
          </Badge>
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
