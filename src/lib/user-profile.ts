import { createClient } from "@/src/utils/supabase/server";
import type { UserProfile } from "@/src/types/profile";

type ProfileOrgRow = {
  organization_id: string;
  organizations: { name: string; slug: string | null } | null;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name, slug)")
    .eq("id", user.id)
    .maybeSingle<ProfileOrgRow>();

  if (error || !data?.organization_id) return null;

  const org = data.organizations;
  return {
    userId: user.id,
    organizationId: data.organization_id,
    organizationName: org?.name?.trim() ? org.name : "—",
    organizationSlug: org?.slug ?? null,
  };
}

export async function getCurrentOrganizationId(): Promise<string | null> {
  const profile = await getUserProfile();
  return profile?.organizationId ?? null;
}

/**
 * Garantiza una fila en `profiles` (usuarios previos al trigger o migraciones).
 * Solo puede insertar la organización `slug = default` vía RLS.
 */
export async function ensureUserProfile(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (existing) return;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "default")
    .maybeSingle<{ id: string }>();

  if (orgError || !org) {
    throw new Error("No se encontró la organización por defecto (slug default).");
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    organization_id: org.id,
  });

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
}
