import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">{t("auth.login_title")}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {t("common.app_name")}
      </p>

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.no_account")}{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          {t("auth.create_account")}
        </Link>
      </p>
    </div>
  );
}
