"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "@/src/lib/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { next?: string };

type LoginState = { 
  error: string | null;
  redirect?: string;
};

const initialState: LoginState = { error: null };

export function LoginForm({ next }: Props) {
  const [state, action, isPending] = useActionState(signIn, initialState);
  const t = useTranslations("auth");
  const router = useRouter();

  // Handle redirect after successful login and cookies are set
  useEffect(() => {
    if (state.redirect) {
      // Force a full page navigation to ensure cookies are sent with the request
      window.location.href = state.redirect;
    }
  }, [state.redirect]);

  return (
    <form action={action} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          {t("email")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
          className="h-11 rounded-lg border-border bg-muted/40 px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/40 transition-shadow"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          {t("password")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={t("passwordPlaceholder")}
          className="h-11 rounded-lg border-border bg-muted/40 px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/40 transition-shadow"
        />
      </div>

      {state.error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs leading-relaxed text-destructive">{state.error}</p>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-1 h-11 w-full rounded-lg text-sm font-semibold shadow-sm transition-opacity disabled:opacity-60"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            {t("submitting")}
          </span>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
