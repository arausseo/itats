"use client";

import { Link, usePathname } from "@/src/i18n/navigation";
import { Icon } from "@/components/app/icon";

export interface ShellData {
  nav: { dashboard: string; positions: string; candidates: string; upload: string };
  org: { name: string; initials: string; plan: string };
  user: { name: string; email: string; initials: string };
  counts: { positions: number; candidates: number };
  labels: { credits: string; buyMore: string };
}

const NAV_ITEMS = [
  { key: "dashboard", href: "/", icon: "home", count: null },
  { key: "positions", href: "/positions", icon: "briefcase", count: "positions" },
  { key: "candidates", href: "/candidates", icon: "users", count: "candidates" },
  { key: "upload", href: "/upload", icon: "upload", count: null },
] as const;

/** Marca ReclutaIT sobre el sidebar oscuro (code-brackets + spark). */
function SidebarLogo() {
  return (
    <div className="logo-mark">
      <svg viewBox="0 0 40 40" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M15 11L9 20L15 29" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 11L31 20L25 29" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 13.5C20 18 20.4 18.8 24 20 20.4 21.2 20 22 20 26.5 20 22 19.6 21.2 16 20 19.6 18.8 20 18 20 13.5Z" fill="#fff" />
      </svg>
    </div>
  );
}

export function AppSidebarInner({
  data,
  onNavigate,
}: {
  data: ShellData;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <div className="sb-brand">
        <SidebarLogo />
        <div className="logo-name">
          Recluta<b>IT</b>
        </div>
      </div>

      {/* Workspace switcher — TODO(backend): multi-workspace real */}
      <button type="button" className="ws-switch">
        <span className="ws-logo">{data.org.initials}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="nm" style={{ display: "block" }}>{data.org.name}</span>
          <span className="sub" style={{ display: "block" }}>{data.org.plan}</span>
        </span>
        <Icon name="chevDown" size={15} style={{ color: "rgba(255,255,255,.4)" }} />
      </button>

      <nav className="sb-nav">
        {NAV_ITEMS.map((it) => {
          const count = it.count ? data.counts[it.count] : null;
          return (
            <Link
              key={it.key}
              href={it.href}
              onClick={onNavigate}
              className={"nav-item" + (isActive(it.href) ? " active" : "")}
            >
              <Icon name={it.icon} size={18} />
              {data.nav[it.key]}
              {count != null && <span className="count">{count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sb-foot">
        {/* Créditos — TODO(backend): sistema de créditos real (hoy hardcode) */}
        <div className="credits">
          <div className="top">
            <span>{data.labels.credits}</span>
            <span className="v">612</span>
          </div>
          <div className="bar">
            <i style={{ width: "61%" }} />
          </div>
          <div className="lab">
            {data.org.plan} · <a>{data.labels.buyMore}</a>
          </div>
        </div>

        <button type="button" className="sb-user">
          <span className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
            {data.user.initials}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="nm" style={{ display: "block" }}>{data.user.name}</span>
            <span className="em" style={{ display: "block" }}>{data.user.email}</span>
          </span>
          <Icon name="chevDown" size={14} style={{ color: "rgba(255,255,255,.4)" }} />
        </button>
      </div>
    </>
  );
}

export function AppSidebar({ data }: { data: ShellData }) {
  return (
    <aside className="rit-sidebar">
      <AppSidebarInner data={data} />
    </aside>
  );
}
