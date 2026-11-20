import "server-only";
import { myTrainingProfile, type DB, type TrainingProfile } from "@ms/api";
import { MOCK, mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { loadProgramPage } from "@/lib/loaders/training";
import { loadIntakePage } from "@/lib/loaders/course";

/** Every session of the member's active plans (all dates), for the overview, upcoming list and next session. */
export interface ScheduleItem {
  id: string;
  plan_id: string;
  on_date: string;
  kind: "training" | "recovery" | "rest";
  title: string;
  lesson_id: string | null;
  program_slug: string | null;
  program_name: string | null;
  minutes: number | null;
  done: boolean;
  skipped: boolean;
}

export interface ScheduleData {
  items: ScheduleItem[];
  /** plan id → chosen "If you miss a day" rule. */
  rules: Record<string, "shift" | "skip" | "weekend">;
  /** plan id → training weekdays (0 = Sunday) when known. */
  days: Record<string, number[]>;
  /** Self-Guided plans saved "No dates — just the order": kept off the calendar, shown as an ordered queue. */
  queues?: PlanQueue[];
}

export interface PlanQueue {
  plan_id: string;
  name: string;
  program_slug: string | null;
  program_name: string | null;
  /** The next session in order (null when every session is done). */
  next: { title: string; lesson_id: string | null; minutes: number | null } | null;
  left: number;
  total: number;
}

export const loadSchedule = mockable("plan-schedule", async (): Promise<ScheduleData> => {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const { data: plans } = await sb.from("member_plans").select("id, source, inputs").eq("user_id", user.id).eq("status", "active");
  const ids = (plans ?? []).map((p) => p.id);
  if (!ids.length) return { items: [], rules: {}, days: {}, queues: [] };
  const undated = new Set((plans ?? []).filter((p) => (p.inputs as { undated?: boolean } | null)?.undated === true).map((p) => p.id));
  const [{ data: items }, { data: enr }] = await Promise.all([
    sb
      .from("plan_items")
      .select("id, plan_id, on_date, kind, title, lesson_id, done_at, skipped_at, position, lessons(title, estimated_minutes, programs(slug, name))")
      .in("plan_id", ids)
      .order("on_date")
      .order("position")
      .limit(600),
    sb.from("enrollments").select("id, missed_day_rule, training_days").eq("user_id", user.id),
  ]);
  const rules: ScheduleData["rules"] = {};
  const days: ScheduleData["days"] = {};
  for (const p of plans ?? []) {
    const inputs = (p.inputs ?? {}) as { missed_day_rule?: string; days?: number[]; trainingDays?: number[]; enrollment_id?: string };
    const e = inputs.enrollment_id ? enr?.find((x) => x.id === inputs.enrollment_id) : undefined;
    rules[p.id] = (inputs.missed_day_rule ?? (p.source === "immersion_schedule" ? e?.missed_day_rule : null) ?? "shift") as "shift" | "skip" | "weekend";
    const d = inputs.days ?? inputs.trainingDays ?? (e?.training_days as number[] | undefined);
    if (d?.length) days[p.id] = d;
  }
  const all: ScheduleItem[] = (items ?? []).map((i) => {
      const l = i.lessons as unknown as { title: string; estimated_minutes: number | null; programs: { slug: string; name: string } | null } | null;
      return {
        id: i.id, plan_id: i.plan_id, on_date: i.on_date, kind: i.kind as ScheduleItem["kind"], title: l?.title ?? i.title ?? "Session", lesson_id: i.lesson_id,
        program_slug: l?.programs?.slug ?? null, program_name: l?.programs?.name ?? null, minutes: l?.estimated_minutes ?? null, done: !!i.done_at, skipped: !!i.skipped_at,
      };
    });
  const queues: PlanQueue[] = [...undated].map((id) => {
    const list = all.filter((i) => i.plan_id === id && i.kind !== "rest");
    const open = list.filter((i) => !i.done && !i.skipped);
    const nx = open[0] ?? null;
    const meta = (plans ?? []).find((p) => p.id === id);
    return {
      plan_id: id, name: ((meta?.inputs ?? {}) as { name?: string }).name ?? nx?.program_name ?? "Self-Guided", program_slug: list[0]?.program_slug ?? null, program_name: list[0]?.program_name ?? null,
      next: nx ? { title: nx.title, lesson_id: nx.lesson_id, minutes: nx.minutes } : null, left: open.length, total: list.length,
    };
  });
  return { rules, days, queues, items: all.filter((i) => !undated.has(i.plan_id)) };
});

/** The member's one training profile (shared intake answers). Preview fixture: fixtures/training-profile.json. */
export const loadTrainingProfile = mockable("training-profile", async (): Promise<TrainingProfile> => {
  const { supabase: sb, user } = await getUser();
  if (!user) return {};
  return myTrainingProfile(sb as unknown as DB, user.id);
});

/* ------------------------------------------------------------------ whole programs you can schedule */

/** One level of a day-by-day program (Kettlebell Lifestyle: Level I = "beginner", Level II = "intermediate"). */
export interface SchedLevel {
  pathId: string | null;
  key: string | null;
  name: string;
  shortName: string;
  tagline: string | null;
  /** Training days in the level (overview pages don't use a day). */
  total: number;
  /** Training days not done yet: what `schedule_immersion` puts on the calendar. */
  left: number;
  /** The member's enrollment in this level, if any. */
  mode: string | null;
}

/** A day-by-day program the member can open, with its levels: what "Schedule <program>" offers on /plan. */
export interface Schedulable {
  programId: string;
  slug: string;
  name: string;
  levels: SchedLevel[];
  /** The level the member is enrolled in (the one they're on), else null. */
  currentKey: string | null;
  /** The level the intake recommended, else null. */
  recommendedKey: string | null;
}

/** Day-by-day programs (type `day_program`, today only Kettlebell Lifestyle) the member has access to, per level. */
export async function loadSchedulable(): Promise<Schedulable[]> {
  let slugs: string[];
  if (MOCK) slugs = ["kettlebell-lifestyle"];
  else {
    const { supabase: sb, user } = await getUser();
    if (!user) return [];
    const { data } = await sb.from("programs").select("slug").eq("type", "day_program").order("slug");
    slugs = (data ?? []).map((p) => p.slug);
  }
  const out = await Promise.all(
    slugs.map(async (slug): Promise<Schedulable | null> => {
      const first = await loadProgramPage(slug, null).catch(() => null);
      if (!first || first.locked || first.program.access === "locked") return null;
      const paths = first.paths.filter((p) => p.kind === "level");
      const pages = paths.length
        ? await Promise.all(paths.map((p) => (p.id === first.path?.id ? Promise.resolve(first) : loadProgramPage(slug, p.key ?? p.id).catch(() => null))))
        : [first];
      const levels: SchedLevel[] = pages.flatMap((pg, i) => {
        if (!pg) return [];
        const p = paths[i] ?? null;
        const done = new Set(pg.progress.filter((r) => r.complete).map((r) => r.lessonId));
        const days = pg.lessons.filter((l) => !l.pageType);
        return [{
          pathId: p?.id ?? null, key: p?.key ?? null, name: p?.name ?? pg.program.name, shortName: p?.shortName ?? p?.name ?? pg.program.name, tagline: p?.tagline ?? null,
          total: days.length, left: days.filter((l) => !done.has(l.id)).length, mode: pg.enrollment?.mode ?? null,
        }];
      });
      const intake = await loadIntakePage(slug).catch(() => null);
      return {
        programId: first.program.id, slug, name: first.program.name, levels,
        currentKey: first.enrollment ? first.path?.key ?? null : null,
        recommendedKey: (intake?.latest?.result as { path_key?: string } | null | undefined)?.path_key ?? null,
      };
    }),
  );
  return out.filter((x): x is Schedulable => !!x && x.levels.length > 0);
}
