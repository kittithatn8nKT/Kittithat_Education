import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, Users, Sparkles, ArrowRight } from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations();

  const features = [
    {
      icon: FileText,
      title: t("landing.feature_documents_title"),
      body: t("landing.feature_documents_body"),
    },
    {
      icon: Users,
      title: t("landing.feature_workflow_title"),
      body: t("landing.feature_workflow_body"),
    },
    {
      icon: Sparkles,
      title: t("landing.feature_ai_title"),
      body: t("landing.feature_ai_body"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {t("common.app_name")}
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">
              {t("auth.login_button")}
            </Link>
            <Link href="/signup" className="btn-primary">
              {t("landing.cta_primary")}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            {t("landing.hero_title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t("landing.hero_subtitle")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              {t("landing.cta_primary")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="btn-secondary px-6 py-3 text-base">
              {t("landing.cta_secondary")}
            </Link>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} {t("common.app_name")} · {t("common.tagline")}
      </footer>
    </div>
  );
}
