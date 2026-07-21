"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { usePathname } from "@/src/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { SidebarContent } from "@/components/sidebar-content";

interface MobileNavProps {
  labels: {
    dashboard: string;
    candidates: string;
    positions: string;
    upload: string;
  };
  organization?: string | null;
  email?: string | null;
  signOutLabel: string;
  themeLabels: { light: string; dark: string };
  menuLabel: string;
}

/**
 * Barra superior + drawer lateral para viewport móvil (< lg).
 * En desktop el sidebar fijo la reemplaza.
 */
export function MobileNav({
  labels,
  organization,
  email,
  signOutLabel,
  themeLabels,
  menuLabel,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el drawer al cambiar de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label={menuLabel}
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Menu01Icon} className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
          <SidebarContent
            labels={labels}
            organization={organization}
            email={email}
            signOutLabel={signOutLabel}
            themeLabels={themeLabels}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <Logo className="text-base" />
    </header>
  );
}
