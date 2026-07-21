"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { Link } from "@/src/i18n/navigation";
import { signOut } from "@/src/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AppNavLinks } from "@/components/app-nav-links";

interface SidebarContentProps {
  labels: {
    dashboard: string;
    candidates: string;
    positions: string;
    upload: string;
  };
  organization?: string | null;
  email?: string | null;
  signOutLabel: string;
  /** Se ejecuta al hacer clic en un enlace o el logo (cierra el drawer móvil). */
  onNavigate?: () => void;
}

/**
 * Contenido compartido del sidebar (desktop) y del drawer móvil.
 * Logo → navegación → pie (organización, email, idioma, cerrar sesión).
 */
export function SidebarContent({
  labels,
  organization,
  email,
  signOutLabel,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 py-2">
        <Link href="/" onClick={onNavigate} aria-label="ReclutaIT">
          <Logo className="text-lg" />
        </Link>
      </div>

      <div className="mt-2">
        <AppNavLinks labels={labels} onNavigate={onNavigate} />
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-border/60 pt-4">
        {organization && (
          <p className="truncate px-2 text-xs font-medium text-foreground">
            {organization}
          </p>
        )}
        {email && (
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        )}
        <div className="px-1">
          <LanguageSwitcher />
        </div>
        <form action={signOut} className="px-1">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={Logout01Icon} className="size-4 shrink-0" />
            {signOutLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
