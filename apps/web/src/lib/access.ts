import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  accessStates, hasAccess, lessonIsPreview, planSavings, toPlanSavings, toProgramAccess,
  type PlanSavings, type ProgramAccess,
} from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";

/**
 * Web wrapper over the access model (packages/api/src/access.ts, 0024_access_offers.sql).
 * One RPC per request (React cache), shared by guards, CTAs, the catalog and offers.
 *
 * Local preview (MOCK_DATA=1): the member is a fixture persona (fixtures/access-personas.json):
 * free · pro · max · owner (bought MTK) · collector (bought MTK + A4L) · admin.
 * Switch with /api/mock/persona?as=<key> (sets the `ms_persona` cookie).
 */

export const PERSONA_COOKIE = "ms_persona";

type RawRow = Parameters<typeof toProgramAccess>[0];
type PersonaFile = {
  default: string;
  previews: Record<string, string[]>;
  personas: Record<string, { label: string; plan: string; admin: boolean; states: RawRow[]; savings: Parameters<typeof toPlanSavings>[0]; readinessLow: boolean; streakWeeks: number }>;
};

const personas = cache(async () => fixture<PersonaFile>("access-personas"));

/** The current mock persona (local preview only). */
export const mockPersona = cache(async () => {
  const file = await personas();
  const key = (await cookies()).get(PERSONA_COOKIE)?.value;
  const k = key && file.personas[key] ? key : file.default;
  return { key: k, ...file.personas[k]!, previews: file.previews };
});

/** Every program's access state for the signed-in member, keyed by slug and by id. */
export const getAccessMap = cache(async (): Promise<Map<string, ProgramAccess>> => {
  let rows: ProgramAccess[];
  if (MOCK) rows = (await mockPersona()).states.map(toProgramAccess);
  else {
    try {
      rows = await accessStates(await createClient());
    } catch {
      rows = [];
    }
  }
  const map = new Map<string, ProgramAccess>();
  for (const r of rows) {
    map.set(r.slug, r);
    map.set(r.programId, r);
  }
  return map;
});

/** Access for one program (slug or id), or null if unknown. */
export async function programAccess(ref: string): Promise<ProgramAccess | null> {
  return (await getAccessMap()).get(ref) ?? null;
}

/** Is the member an admin (admins always have access)? Mock: the admin persona. */
export const isAdminViewer = cache(async () => {
  if (MOCK) return (await mockPersona()).admin;
  const all = [...(await getAccessMap()).values()];
  // access_states marks every paid program owned for admins; a member can't own experiences.
  return all.some((a) => a.slug === "coaching" && a.state === "owned");
});

/** Course tokens that open the program's introduction (always a taste). */
const INTRO_TOKENS = new Set(["start", "intro"]);

/** Is this lesson a free taste: course intro, first lesson of its program/path, or flagged meta.preview? */
export async function isPreview(slug: string, lesson: string): Promise<boolean> {
  if (INTRO_TOKENS.has(lesson)) return true;
  if (MOCK) return ((await mockPersona()).previews[slug] ?? []).includes(lesson);
  if (!/^[0-9a-f-]{36}$/i.test(lesson)) return false;
  return lessonIsPreview(await createClient(), lesson);
}

export function unlockHref(slug: string, from?: string | null) {
  return `/programs/${slug}/unlock${from ? `?from=${encodeURIComponent(from)}` : ""}`;
}

/**
 * Server-side guard for lesson/day/session routes. No access → the program's sales sheet
 * (/programs/<slug>/unlock). Previews (first lesson, flagged lessons, course intro) stay watchable.
 * Unknown programs fall through so the page can 404 normally.
 */
export async function guardLesson(slug: string, lesson: string | null) {
  const a = await programAccess(slug);
  if (!a || hasAccess(a)) return;
  if (lesson && (await isPreview(slug, decodeURIComponent(lesson)))) return;
  redirect(unlockHref(slug, lesson ? `lesson:${lesson}` : null));
}

/** Plan math for the You page (current plan vs à-la-carte purchases). */
export const getPlanSavings = cache(async (): Promise<PlanSavings | null> => {
  if (MOCK) return toPlanSavings((await mockPersona()).savings);
  try {
    return await planSavings(await createClient());
  } catch {
    return null;
  }
});

/** First preview lesson of a program (for "Watch a free preview" on the sales sheet). Mock only knows fixtures. */
export async function previewLessonFor(slug: string): Promise<string | null> {
  if (MOCK) return (await mockPersona()).previews[slug]?.[0] ?? null;
  const sb = await createClient();
  const { data } = await (sb as unknown as { rpc: (f: string) => PromiseLike<{ data: unknown }> }).rpc("program_outline_stats");
  const a = await programAccess(slug);
  const row = ((data ?? []) as { program_id: string; first_lesson_id: string | null }[]).find((r) => r.program_id === a?.programId);
  return row?.first_lesson_id ?? null;
}
