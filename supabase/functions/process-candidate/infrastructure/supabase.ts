import { createClient } from "@supabase/supabase-js";

export const createSupabaseServiceClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return { ok: false as const, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }
  return {
    ok: true as const,
    client: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
};
