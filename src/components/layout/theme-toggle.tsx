"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// useSyncExternalStore is the React 19-blessed primitive for "am I in the
// browser yet?" — it doesn't fire setState during effects, so the new
// react-hooks/set-state-in-effect rule is satisfied.
function subscribeNoop() {
  return () => {};
}
function useHasMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true, // client snapshot — always true once hydrated
    () => false // server snapshot — never mounted on the server
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();
  const mounted = useHasMounted();

  if (!mounted) return <div className="h-9 w-9" />;

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const icon =
    theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={t("common.theme")}
    >
      {icon}
    </Button>
  );
}
