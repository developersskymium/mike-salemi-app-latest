"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { accessStates, enroll, hasAccess, programOutlineStats } from "@ms/api";
import type { LearningMode } from "@ms/core";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type StartResult = { ok: true; href: string; name: string } | { ok: false; error: string; href?: string };

const input = z.object({ programId: z.string().uuid(), pathId: z.string().uuid().nullable() });

/**
 * Start / enroll in a program. Re-checks access on the server (access_states → has_access) before
 * enrolling; `enroll` checks again in the database. No access → the program's sales sheet.
 */
export async function startProgramAction(programId: string, pathId: string | null): Promise<StartResult> {
  const parsed = input.safeParse({ programId, pathId });
  if (!parsed.success) return { ok: false, error: "Unknown program." };
  if (MOCK) {
    const { programAccess } = await import("@/lib/access");
    const a = await programAccess(programId);
    if (!a) return { ok: false, error: "That program isn't available." };
    if (!hasAccess(a)) return { ok: false, error: "This program needs a plan or purchase.", href: `/programs/${a.slug}/unlock` };
    return { ok: true, name: a.slug, href: `/programs/${a.slug}` };
  }
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "Please sign in again.", href: "/signin" };
    const [state] = await accessStates(supabase, programId);
    if (!state) return { ok: false, error: "That program isn't available." };
    if (!hasAccess(state)) return { ok: false, error: "This program needs a plan or purchase.", href: `/programs/${state.slug}/unlock` };
    const { data: program } = await supabase.from("programs").select("slug, name, program_modes(mode, is_default)").eq("id", programId).maybeSingle();
    if (!program) return { ok: false, error: "That program isn't available." };
    const modes = (program.program_modes ?? []) as { mode: LearningMode; is_default: boolean }[];
    const mode = (modes.find((m) => m.is_default) ?? modes[0])?.mode ?? "immersion";
    await enroll(supabase, programId, pathId, mode);
    const stats = await programOutlineStats(supabase);
    const first = stats.find((s) => s.program_id === programId && (s.path_id ?? null) === (pathId ?? null)) ?? stats.find((s) => s.program_id === programId);
    revalidatePath("/today");
    revalidatePath("/programs");
    revalidatePath(`/programs/${program.slug}`);
    return { ok: true, name: program.name, href: first?.first_lesson_id ? `/programs/${program.slug}/learn/${first.first_lesson_id}` : `/programs/${program.slug}` };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (/no access/i.test(m)) return { ok: false, error: "This program needs a plan or purchase." };
    return { ok: false, error: "Couldn't start right now. Try again." };
  }
}

/** Local preview only: switch the fixture persona (free · pro · max · owner · collector · admin). */
export async function setMockPersonaAction(key: string) {
  if (!MOCK) return;
  (await cookies()).set("ms_persona", key.replace(/[^a-z]/g, "").slice(0, 20), { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
