import Link from "next/link";
import { createClient } from "@/src/utils/supabase/server";
import { signOut } from "@/src/lib/auth-actions";
import { Button } from "@/components/ui/button";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold tracking-tight">ATS</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {user.email}
          </span>
          <Link href="/upload">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Subir CVs
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
