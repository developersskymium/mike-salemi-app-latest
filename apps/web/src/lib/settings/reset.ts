"use server";

import { revalidatePath } from "next/cache";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Admin testing tool: wipe the signed-in admin's own member progress (programs, plans, intakes, badges,
 * points, notes, tool results) so they start again from the welcome intake. The database function only
 * touches the caller's rows and refuses non-admins; admin role, plan, purchases and billing are kept.
 */
export async function resetMyProgressAction(confirm: string): Promise<{ ok: true; rows: number } | { ok: false; error: string }> {
  if (confirm.trim().toUpperCase() !== "RESET") return { ok: false, error: "Type RESET to confirm." };
  if (MOCK) return { ok: true, rows: 0 };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Please sign in again." };
    const { data, error } = await supabase.rpc("reset_my_progress" as never);
    if (error) return { ok: false, error: error.message === "admins only" ? "Only admins can reset." : error.message };
    revalidatePath("/", "layout");
    return { ok: true, rows: Number((data as { rows?: number } | null)?.rows ?? 0) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}
