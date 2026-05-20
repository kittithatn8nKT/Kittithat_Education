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
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.signup_title")}</CardTitle>
        <CardDescription>{t("common.tagline")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          {t("auth.have_account")}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t("auth.go_login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
