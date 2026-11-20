import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import { getUser } from "./server";

/**
 * Service-role client: bypasses row rules. Use ONLY in server code, ONLY after
 * `requireAdmin()` (admin studio) or inside verified webhooks.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabase(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Throws unless the signed-in user holds the admin role. Returns the member client and user. */
export async function requireAdmin() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admins only");
  return { supabase, user };
}
