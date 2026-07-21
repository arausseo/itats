"use client";

import { Icon } from "@/components/app/icon";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Topbar del shell: buscador (⌘K, aún no funcional — TODO), switcher de
 * idioma, botón spark y campana. Sólo desktop (en móvil manda app-mobile-bar).
 */
export function AppTopbar({ searchPlaceholder }: { searchPlaceholder: string }) {
  return (
    <div className="topbar">
      <div className="search">
        <Icon name="search" size={16} />
        <input placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
        <span className="kbd">⌘K</span>
      </div>
      <div className="right">
        <LanguageSwitcher />
        <button type="button" className="icon-btn" aria-label="IA">
          <Icon name="spark" size={17} style={{ color: "var(--brand)" }} />
        </button>
        <button type="button" className="icon-btn dot-badge" aria-label="Notificaciones">
          <Icon name="bell" size={18} />
        </button>
      </div>
    </div>
  );
}
