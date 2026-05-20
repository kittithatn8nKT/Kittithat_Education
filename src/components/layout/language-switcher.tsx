"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    // document.cookie is a setter that writes a Set-Cookie header to the
    // browser store, not a mutable assignment. The react-hooks linter rule
    // about "value cannot be modified" doesn't apply to this DOM API.
    const cookieValue = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = cookieValue;
    startTransition(() => router.refresh());
  }

  return (
    <div className="border-input bg-background flex items-center gap-0.5 rounded-md border p-0.5">
      <Globe className="text-muted-foreground ml-1.5 h-3.5 w-3.5" />
      {locales.map((loc) => (
        <Button
          key={loc}
          type="button"
          variant={locale === loc ? "default" : "ghost"}
          size="sm"
          onClick={() => setLocale(loc)}
          disabled={isPending}
          aria-pressed={locale === loc}
          className={cn("h-6 px-2 text-xs", locale !== loc && "text-muted-foreground")}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
