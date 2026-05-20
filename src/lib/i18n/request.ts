import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";

function pickLocale(value: string | undefined | null): Locale {
  if (!value) return defaultLocale;
  const lower = value.toLowerCase();
  for (const loc of locales) {
    if (lower.startsWith(loc)) return loc;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const acceptLanguage = headerStore.get("accept-language");
  const locale: Locale = pickLocale(cookieLocale ?? acceptLanguage ?? defaultLocale);

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return { locale, messages };
});
