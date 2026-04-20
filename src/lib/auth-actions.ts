"use server";

import { redirect as nextRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { ensureUserProfile } from "@/src/lib/user-profile";

export async function signIn(
  _prevState: { error: string | null } | undefined,
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/").trim() || "/";

  const t = await getTranslations("auth");

  if (!email || !password) {
    return { error: t("errors.required") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t("errors.invalidCredentials") };
  }

  try {
    await ensureUserProfile();
  } catch {
    return { error: t("errors.profileSetup") };
  }

  // Get the current locale for the redirect
  const locale = await getLocale();
  
  // Return the redirect URL to be handled on the client after cookies are set
  return { error: null, redirect: next };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  nextRedirect(`/${locale}/login`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  nextRedirect(`/${locale}/login`);
}
