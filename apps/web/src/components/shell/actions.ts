"use server";

import { getUser } from "@/lib/supabase/server";
import { isTheme } from "./theme";

/** Saves the member's theme in profiles.preferences.theme (members may write their own preferences). */
export async function saveThemePreference(theme: string) {
  if (!isTheme(theme)) return { ok: false as const };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false as const };
  const { data } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
  const prefs = (data?.preferences && typeof data.preferences === "object" ? data.preferences : {}) as Record<string, unknown>;
  const { error } = await supabase.from("profiles").update({ preferences: { ...prefs, theme } }).eq("id", user.id);
  return { ok: !error };
}
