"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Briefcase01Icon,
  CloudUploadIcon,
} from "@hugeicons/core-free-icons";
import { Link, usePathname } from "@/src/i18n/navigation";
import { cn } from "@/lib/utils";

interface AppNavLinksProps {
  labels: {
    dashboard: string;
    candidates: string;
    positions: string;
    upload: string;
  };
  /** Callback opcional al navegar (p. ej. cerrar el drawer móvil). */
  onNavigate?: () => void;
}

const navItems = [
  { key: "dashboard", href: "/", icon: DashboardSquare01Icon },
  { key: "candidates", href: "/candidates", icon: UserGroupIcon },
  { key: "positions", href: "/positions", icon: Briefcase01Icon },
  { key: "upload", href: "/upload", icon: CloudUploadIcon },
] as const;

export function AppNavLinks({ labels, onNavigate }: AppNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {navItems.map(({ key, href, icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link key={key} href={href} onClick={onNavigate}>
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="size-[18px] shrink-0" />
              {labels[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
