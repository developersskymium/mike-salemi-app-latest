import "server-only";
import { homeMikeNote, type DB, type MikeNote } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/** Mike's weekly note for Home (admin-set in site_settings `home_mike_note`). */
export async function loadMikeNote(): Promise<MikeNote | null> {
  if (MOCK)
    return { text: "Small, honest sessions beat heroic ones. Give me twenty good minutes a day this week and let the bell do the teaching.", photo: "press", week_of: "2026-11-16" };
  const { supabase, user } = await getUser();
  if (!user) return null;
  return homeMikeNote(supabase as unknown as DB);
}
