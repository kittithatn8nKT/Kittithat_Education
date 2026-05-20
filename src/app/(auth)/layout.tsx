import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <Link href="/" className="text-lg font-bold">
          {t("common.app_name")}
        </Link>
        <div className="flex flex-1 items-center">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
