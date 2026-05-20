import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, Users, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="from-background to-muted/40 min-h-screen bg-gradient-to-b">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {t("common.app_name")}
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/login" />}>
              {t("auth.login_button")}
            </Button>
            <Button render={<Link href="/signup" />}>{t("landing.cta_primary")}</Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("landing.hero_title")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
            {t("landing.hero_subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/signup" />}>
              {t("landing.cta_primary")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" render={<Link href="#features" />}>
              {t("landing.cta_secondary")}
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardHeader>
                  <div className="bg-primary/10 text-primary inline-flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-4">{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-border border-t py-8 text-center text-sm">
        © {new Date().getFullYear()} {t("common.app_name")} · {t("common.tagline")}
      </footer>
    </div>
  );
}
