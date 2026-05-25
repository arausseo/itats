import { createClient } from "@supabase/supabase-js";
import {
  parsePositionQuestionRows,
  type PositionQuestion,
} from "@/src/types/position-question";

// ---------------------------------------------------------------------------
// Cliente de servicio: la landing pública es anónima, así que toda la lectura
// y escritura se hace con service_role desde el servidor (RLS no aplica).
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables de entorno de Supabase faltantes");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface PublicApplicationContext {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  position: {
    id: string;
    title: string;
    description: string;
    requirements: string;
  };
  questions: PositionQuestion[];
}

/**
 * Resuelve la info pública de la plaza vía orgSlug + positionId.
 * Devuelve null si:
 * - la org no existe,
 * - la plaza no existe,
 * - la plaza no pertenece a esa org,
 * - la plaza está cerrada.
 */
export async function getPublicApplicationContext(
  orgSlug: string,
  positionId: string,
): Promise<PublicApplicationContext | null> {
  const supabase = getServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle<{ id: string; name: string; slug: string }>();
  if (!org) return null;

  const { data: position } = await supabase
    .from("positions")
    .select("id, organization_id, title, description, requirements, status")
    .eq("id", positionId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      title: string;
      description: string;
      requirements: string;
      status: string;
    }>();
  if (!position) return null;
  if (position.organization_id !== org.id) return null;
  if (position.status !== "Open") return null;

  const { data: questionRows } = await supabase
    .from("position_questions")
    .select("*")
    .eq("position_id", positionId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    organization: { id: org.id, name: org.name, slug: org.slug },
    position: {
      id: position.id,
      title: position.title,
      description: position.description,
      requirements: position.requirements,
    },
    questions: parsePositionQuestionRows(questionRows ?? []),
  };
}
