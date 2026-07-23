"use client";

import { useEffect, useState } from "react";
import type { ProfileMode } from "@/components/features/candidate-profile-panel";

const KEY = "rit_prof_layout";
const MODES: ProfileMode[] = ["split", "drawer", "full"];
const LABELS: Record<ProfileMode, string> = {
  split: "Split",
  drawer: "Drawer",
  full: "Full",
};

function isMode(v: string | null): v is ProfileMode {
  return v === "split" || v === "drawer" || v === "full";
}

/** Preferencia de modo del panel de perfil, persistida en localStorage. */
export function useProfileLayout(): [ProfileMode, (m: ProfileMode) => void] {
  const [mode, setMode] = useState<ProfileMode>("split");
  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    // Hidratación desde localStorage al montar (no disponible en SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isMode(stored)) setMode(stored);
  }, []);
  function update(m: ProfileMode) {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  }
  return [mode, update];
}

/** Segmented control: Split / Drawer / Full. */
export function ProfileLayoutToggle({
  value,
  onChange,
}: {
  value: ProfileMode;
  onChange: (m: ProfileMode) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label="Ver perfil como">
      {MODES.map((m) => (
        <button key={m} type="button" className={value === m ? "on" : ""} onClick={() => onChange(m)}>
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
