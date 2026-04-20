"use client";

import { usePathname } from "@/src/i18n/navigation";
import { Link } from "@/src/i18n/navigation";

interface AppNavLinksProps {
  labels: {
    dashboard: string;
    candidates: string;
    positions: string;
    upload: string;
  };
}

const navItems = [
  { key: "dashboard" as const, href: "/" },
  { key: "candidates" as const, href: "/candidates" },
  { key: "positions" as const, href: "/positions" },
  { key: "upload" as const, href: "/upload" },
];

export function AppNavLinks({ labels }: AppNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5" aria-label="Main navigation">
      {navItems.map(({ key, href }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link key={key} href={href}>
            <span
              className={`inline-flex h-7 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {labels[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
