"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/src/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Icon } from "@/components/app/icon";
import { AppSidebarInner, type ShellData } from "@/components/app/app-sidebar";

/**
 * Barra superior + drawer lateral para viewport < lg.
 * El drawer aloja el mismo sidebar oscuro (portaleado fuera de .rit-app,
 * por eso el estilo vive bajo .rit-sidebar / .rit-app-drawer).
 */
export function AppMobileBar({
  data,
  menuLabel,
}: {
  data: ShellData;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Cierra el menú al navegar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header className="app-mobilebar">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="icon-btn" aria-label={menuLabel}>
          <Icon name="menu" size={20} />
        </SheetTrigger>
        <SheetContent side="left" className="rit-app-drawer w-72">
          <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
          <aside className="rit-sidebar">
            <AppSidebarInner data={data} onNavigate={() => setOpen(false)} />
          </aside>
        </SheetContent>
      </Sheet>
      <div className="logo-name" style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)" }}>
        Recluta<b style={{ color: "var(--brand)" }}>IT</b>
      </div>
    </header>
  );
}
