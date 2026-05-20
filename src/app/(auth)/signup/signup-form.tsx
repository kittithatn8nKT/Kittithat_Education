"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignupForm() {
  const t = useTranslations();
  const router = useRouter();

  const [fullNameTh, setFullNameTh] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError(t("auth.password_mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.password_mismatch"));
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            full_name_th: fullNameTh,
            preferred_language: "th",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        // Email confirmation disabled — straight to onboarding.
        router.push("/onboarding");
        router.refresh();
      } else {
        setSuccess(t("auth.signup_success"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="full_name_th" className="label">
          {t("auth.full_name_th")}
        </label>
        <input
          id="full_name_th"
          required
          className="input"
          value={fullNameTh}
          onChange={(e) => setFullNameTh(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="full_name" className="label">
          {t("auth.full_name")}
        </label>
        <input
          id="full_name"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          {t("auth.password")}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="label">
          {t("auth.confirm_password")}
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          {success}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? t("common.loading") : t("auth.signup_button")}
      </button>
    </form>
  );
}
