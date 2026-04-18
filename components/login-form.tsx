"use client";

import { useActionState } from "react";
import { signIn } from "@/src/lib/auth-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { next?: string };

const initialState = { error: null as string | null };

export function LoginForm({ next }: Props) {
  const [state, action, isPending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="recruiter@empresa.com"
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-foreground">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="h-9 text-sm"
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-1 h-9 text-sm">
        {isPending ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
