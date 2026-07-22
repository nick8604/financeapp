import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Resolves the signed-in user plus their applicant/underwriter profile row.
 * Returns null if there's no session -- callers decide whether to redirect
 * or return a 401.
 */
export async function getCurrentProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { supabase, profile: profile as Profile };
}
