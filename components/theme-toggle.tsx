"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  labels: { light: string; dark: string };
}

/**
 * Alterna el tema claro/oscuro escribiendo la clase `.dark` en <html> y
 * persistiendo la elección en localStorage. El script no-flash del layout
 * aplica el tema guardado antes del primer render.
 */
export function ThemeToggle({ labels }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage no disponible: el cambio vive solo en esta sesión */
    }
  }

  const label = isDark ? labels.light : labels.dark;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={label}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
    >
      <HugeiconsIcon
        icon={mounted && isDark ? Sun03Icon : Moon02Icon}
        className="size-4 shrink-0"
      />
      {mounted ? label : labels.dark}
    </Button>
  );
}
