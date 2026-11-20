import "server-only";
import { cache } from "react";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/** A member's named saved list ("Morning mobility", "Travel workouts") and the videos in it. */
export interface SavedList {
  id: string;
  name: string;
  videoIds: string[];
}

type Loose = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The member's named saved lists (0036 saved_lists / saved_list_items, own rows). Preview mode: two sample lists. */
export const loadSavedLists = cache(async (sampleIds: string[] = []): Promise<SavedList[]> => {
  if (MOCK)
    return [
      { id: "00000000-0000-4000-8000-00000000a001", name: "Morning mobility", videoIds: sampleIds.slice(0, 3) },
      { id: "00000000-0000-4000-8000-00000000a002", name: "Travel workouts", videoIds: sampleIds.slice(3, 5) },
    ];
  try {
    const { supabase, user } = await getUser();
    if (!user) return [];
    const sb = supabase as unknown as Loose;
    const [lists, items] = await Promise.all([
      sb.from("saved_lists").select("id, name, created_at").eq("user_id", user.id).order("created_at"),
      sb.from("saved_list_items").select("list_id, video_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2000),
    ]);
    const by = new Map<string, string[]>();
    for (const it of (items.data ?? []) as { list_id: string; video_id: string }[]) by.set(it.list_id, [...(by.get(it.list_id) ?? []), it.video_id]);
    return ((lists.data ?? []) as { id: string; name: string }[]).map((l) => ({ id: l.id, name: l.name, videoIds: by.get(l.id) ?? [] }));
  } catch {
    return [];
  }
});
