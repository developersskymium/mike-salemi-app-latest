import "server-only";
import { cache } from "react";
import type { DB } from "@ms/api";
import { mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/* You (spec 12): strength log per main lift, Stretch Test history, journal. Read-only. */

export interface LiftEntry { at: string; kg: number }
export interface Lift { lift: string; first: LiftEntry; best: LiftEntry; last: LiftEntry; count: number }
export interface StretchTest { label: string; score: number; max: number; answer: string }
export interface StretchEntry { id: string; at: string; score: number; max: number; title: string; tests: StretchTest[] }
export interface JournalEntry { id: string; at: string; kind: "session" | "day"; title: string; body: string; href: string | null }
export interface YouExtras { lifts: Lift[]; stretch: StretchEntry[]; journal: JournalEntry[] }

const LIFTS: [RegExp, string][] = [
  [/swing/i, "Swing"],
  [/press/i, "Press"],
  [/squat|goblet/i, "Squat"],
  [/deadlift/i, "Deadlift"],
  [/clean/i, "Clean"],
  [/snatch/i, "Snatch"],
  [/get[- ]?up/i, "Get-up"],
  [/row/i, "Row"],
];

/** "Went up to the 16kg on swings" → [{lift:"Swing", kg:16}]. Also reads `progress.weights` {exercise: kg}. */
export function liftsFrom(text: string | null | undefined, weights?: Record<string, unknown> | null): { lift: string; kg: number }[] {
  const out: { lift: string; kg: number }[] = [];
  if (weights) {
    for (const [k, v] of Object.entries(weights)) {
      const kg = typeof v === "number" ? v : Number(v);
      const name = LIFTS.find(([re]) => re.test(k))?.[1];
      if (name && kg > 0) out.push({ lift: name, kg });
    }
  }
  if (text) {
    for (const sentence of text.split(/[.;\n]/)) {
      const m = sentence.match(/(\d{1,2}(?:\.\d)?)\s*kg/i);
      if (!m) continue;
      const name = LIFTS.find(([re]) => re.test(sentence))?.[1];
      if (name) out.push({ lift: name, kg: Number(m[1]) });
    }
  }
  return out;
}

export function buildLifts(rows: { at: string; lifts: { lift: string; kg: number }[] }[]): Lift[] {
  const by = new Map<string, LiftEntry[]>();
  for (const r of [...rows].sort((a, z) => a.at.localeCompare(z.at))) for (const l of r.lifts) by.set(l.lift, [...(by.get(l.lift) ?? []), { at: r.at, kg: l.kg }]);
  return [...by].map(([lift, es]) => ({ lift, first: es[0]!, last: es.at(-1)!, best: es.reduce((b, e) => (e.kg > b.kg ? e : b), es[0]!), count: es.length })).sort((a, z) => z.count - a.count);
}

type Raw = {
  sessions: { id: string; started_at: string; title: string | null; notes: string | null; lesson_id: string | null; program_slug: string | null; progress: Record<string, unknown> | null }[];
  dayNotes: { lesson_id: string; body: string; updated_at: string; title: string | null; program_slug: string | null }[];
  stretch: { id: string; created_at: string; result: { score?: number; max?: number; title?: string; headline?: string; tests?: StretchTest[] } | null }[];
  /** Bells logged from the day table (0036 exercise_weights); days already in a session's progress.weights are skipped. */
  weights?: { exercise: string; kg: number; created_at: string }[];
};

export function buildExtras(raw: Raw): YouExtras {
  const sessionRows = raw.sessions.map((s) => ({ at: s.started_at, lifts: liftsFrom(s.notes, (s.progress?.weights ?? null) as Record<string, unknown> | null) }));
  const seen = new Set(sessionRows.flatMap((r) => r.lifts.map((l) => `${r.at.slice(0, 10)}:${l.lift}`)));
  const logRows = (raw.weights ?? [])
    .map((w) => ({ at: w.created_at, lifts: liftsFrom(null, { [w.exercise]: Number(w.kg) }) }))
    .filter((r) => r.lifts.length && !r.lifts.some((l) => seen.has(`${r.at.slice(0, 10)}:${l.lift}`)));
  const lifts = buildLifts([...sessionRows, ...logRows]);
  const stretch = raw.stretch
    .filter((t) => t.result && typeof t.result.score === "number")
    .map((t) => ({ id: t.id, at: t.created_at, score: t.result!.score!, max: t.result!.max ?? 15, title: t.result!.headline ?? t.result!.title ?? "Stretch Test", tests: t.result!.tests ?? [] }))
    .sort((a, z) => z.at.localeCompare(a.at));
  const journal: JournalEntry[] = [
    ...raw.sessions.filter((s) => s.notes?.trim()).map((s) => ({ id: `s:${s.id}`, at: s.started_at, kind: "session" as const, title: s.title ?? "Session", body: s.notes!.trim(), href: null })),
    ...raw.dayNotes.filter((n) => n.body.trim()).map((n) => ({ id: `d:${n.lesson_id}`, at: n.updated_at, kind: "day" as const, title: n.title ?? "Day note", body: n.body.trim(), href: n.program_slug ? `/programs/${n.program_slug}/lesson/${n.lesson_id}` : null })),
  ].sort((a, z) => z.at.localeCompare(a.at));
  return { lifts, stretch, journal };
}

export const loadYouExtras = cache(
  mockable("you-extras", async (): Promise<YouExtras> => {
    const { supabase, user } = await getUser();
    if (!user) return { lifts: [], stretch: [], journal: [] };
    const sb = supabase as unknown as DB;
    const [sessions, notes, stretch, weights] = await Promise.all([
      sb
        .from("training_sessions")
        .select("id, started_at, title, notes, lesson_id, progress, programs(slug)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(300)
        .then((r) => r.data ?? []),
      sb
        .from("day_notes")
        .select("lesson_id, body, updated_at, lessons(title, programs(slug))")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(60)
        .then((r) => r.data ?? []),
      sb.from("tool_results").select("id, created_at, result").eq("user_id", user.id).eq("tool_id", "stretch-test").order("created_at", { ascending: false }).limit(12).then((r) => r.data ?? []),
      (sb as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("exercise_weights")
        .select("exercise, kg, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300)
        .then((r: { data: unknown[] | null }) => (r.data ?? []) as { exercise: string; kg: number; created_at: string }[]),
    ]);
    return buildExtras({
      sessions: sessions.map((s) => ({ ...s, program_slug: (s.programs as unknown as { slug: string } | null)?.slug ?? null, progress: (s.progress ?? null) as Record<string, unknown> | null })),
      dayNotes: notes.map((n) => {
        const l = n.lessons as unknown as { title: string; programs: { slug: string } | null } | null;
        return { lesson_id: n.lesson_id, body: n.body, updated_at: n.updated_at, title: l?.title ?? null, program_slug: l?.programs?.slug ?? null };
      }),
      stretch: stretch as Raw["stretch"],
      weights,
    });
  }),
);
