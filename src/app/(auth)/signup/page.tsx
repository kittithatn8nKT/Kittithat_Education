import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations();
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">{t("auth.signup_title")}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {t("common.tagline")}
      </p>

      <div className="mt-6">
        <SignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.have_account")}{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          {t("auth.go_login")}
        </Link>
      </p>
    </div>
  );
}
