"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { addCandidateToPosition } from "@/src/lib/positions-actions";

/**
 * Control "Añadir a plaza" para el panel de perfil en contexto Candidatos.
 * Select nativo estilizado como botón primario; al elegir una plaza,
 * inserta el candidato en su pipeline (status inicial Sourced).
 */
export function AddToPositionControl({
  candidateId,
  positions,
}: {
  candidateId: string;
  positions: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (positions.length === 0) return null;

  function onPick(positionId: string) {
    if (!positionId) return;
    startTransition(async () => {
      const res = await addCandidateToPosition(positionId, candidateId);
      if (res.ok) {
        toast.success("Añadido a la plaza");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <select
      className="btn btn-primary btn-sm"
      style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 14 }}
      value=""
      disabled={pending}
      onChange={(e) => onPick(e.target.value)}
      aria-label="Añadir a plaza"
    >
      <option value="" disabled>
        {pending ? "Añadiendo…" : "+ Añadir a plaza"}
      </option>
      {positions.map((p) => (
        <option key={p.id} value={p.id} style={{ color: "var(--ink)" }}>
          {p.title}
        </option>
      ))}
    </select>
  );
}
