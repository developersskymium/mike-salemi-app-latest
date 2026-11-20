"use server";

import { revalidatePath } from "next/cache";
import { enroll, programOutlineStats } from "@ms/api";
import type { LearningMode } from "@ms/core";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type JoinResult = { ok: true; href: string; name: string } | { ok: false; error: string };

const input = z.object({ programId: z.string().uuid(), pathId: z.string().uuid().nullable() });

/**
 * One-tap Join from Home (legacy "Join program"): enrol in the program (or level), then return the
 * first lesson so the client can open it. Access is checked by the `enroll` function on the server.
 */
export async function joinProgramAction(programId: string, pathId: string | null): Promise<JoinResult> {
  const parsed = input.safeParse({ programId, pathId });
  if (!parsed.success) return { ok: false, error: "Unknown program." };
  if (MOCK) return { ok: false, error: "Preview mode: joining needs the live server." };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Please sign in again." };
    const { data: program } = await supabase
      .from("programs")
      .select("slug, name, program_modes(mode, is_default)")
      .eq("id", programId)
      .maybeSingle();
    if (!program) return { ok: false, error: "That program isn't available." };
    const modes = (program.program_modes ?? []) as { mode: LearningMode; is_default: boolean }[];
    const mode = (modes.find((m) => m.is_default) ?? modes[0])?.mode ?? "immersion";
    await enroll(supabase, programId, pathId, mode);
    const stats = await programOutlineStats(supabase);
    const first = stats.find((s) => s.program_id === programId && (s.path_id ?? null) === (pathId ?? null)) ?? stats.find((s) => s.program_id === programId);
    revalidatePath("/today");
    revalidatePath(`/programs/${program.slug}`);
    return {
      ok: true,
      name: program.name,
      href: first?.first_lesson_id ? `/programs/${program.slug}/learn/${first.first_lesson_id}` : `/programs/${program.slug}`,
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/no access/i.test(m)) return { ok: false, error: "This program needs a membership or purchase." };
    return { ok: false, error: "Couldn't join right now. Try again." };
  }
}
