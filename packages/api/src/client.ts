import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** A Supabase client typed with the v2 schema. Web passes its server/browser client; phones will pass theirs. */
export type DB = SupabaseClient<Database>;
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

/** Throws a readable error from a Supabase response. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: not found`);
  return res.data;
}
