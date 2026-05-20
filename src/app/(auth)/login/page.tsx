import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.login_title")}</CardTitle>
        <CardDescription>{t("common.app_name")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          {t("auth.no_account")}{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            {t("auth.create_account")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
