import "server-only";
import {
  getCatalog,
  getIntakeForm,
  myEnrollments,
  myExperiences,
  myGoals,
  myRewards,
  myToolResults,
  planTemplates,
  savedVideos,
  type DB,
  type IntakeForm,
  type MyExperiences,
  type Rewards,
  type WeekEntry,
  myWeek,
} from "@ms/api";
import { addDays, isoDate, type IsoDate } from "@ms/core";
import { mockable } from "@/lib/mock";
import { pickContinue } from "@/lib/continue";
import { introLessonIds } from "./intro-lessons";
import { withTrainingDays } from "./day-progress";
import { getUser } from "@/lib/supabase/server";
import { markLockedEntries } from "./locked";
import { startOfWeek } from "@/components/today/dates";

/* ============================================================== shared */

export type Enrollment = Awaited<ReturnType<typeof myEnrollments>>[number];

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
  preferences: { theme?: string; autoplay?: boolean };
  onboarding: { goal_skipped?: boolean; completed_at?: string; skipped_at?: string };
}

export interface Goal {
  id: string;
  kind: string;
  title: string;
  approach: string;
  status: string;
  target_date: string | null;
  program_ids: string[];
  created_at: string;
}

export interface MemberPlan {
  id: string;
  name: string;
  source: string;
  status: string;
  starts_on: string;
  overview: string | null;
  goal_id: string | null;
  template_id: string | null;
  inputs: Record<string, unknown>;
}

export interface PlanCount {
  plan_id: string;
  total: number;
  done: number;
}

export interface Template {
  id: string;
  slug: string;
  name: string;
  goal_kind: string;
  weeks: number;
  days_per_week: number;
  description: string | null;
  sessions: number;
}

export interface OpenRun {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  program_slug: string;
  program_name: string;
  image: { url: string; alt: string } | null;
}

/** Today's date in the member's time zone (the server runs in UTC). */
function memberToday(tz: string): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return isoDate(new Date());
  }
}

async function session() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  return { sb: supabase as unknown as DB, user };
}

async function loadProfile(sb: DB, user: { id: string; email?: string | null; created_at?: string }): Promise<Profile> {
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const prefs = (data?.preferences ?? {}) as Profile["preferences"];
  const onboarding = (data?.onboarding ?? {}) as Profile["onboarding"];
  const display = data?.display_name || data?.first_name || user.email?.split("@")[0] || "Member";
  return {
    id: user.id,
    email: user.email ?? "",
    firstName: data?.first_name || display.split(" ")[0]!,
    displayName: display,
    avatarUrl: data?.avatar_url ?? null,
    timezone: data?.timezone || "UTC",
    createdAt: data?.created_at ?? user.created_at ?? new Date().toISOString(),
    preferences: prefs,
    onboarding,
  };
}

async function planCounts(sb: DB, planIds: string[]): Promise<PlanCount[]> {
  if (!planIds.length) return [];
  const { data } = await sb.from("plan_items").select("plan_id, done_at, kind").in("plan_id", planIds);
  const m = new Map<string, PlanCount>();
  for (const r of data ?? []) {
    if (r.kind === "rest") continue;
    const c = m.get(r.plan_id) ?? { plan_id: r.plan_id, total: 0, done: 0 };
    c.total++;
    if (r.done_at) c.done++;
    m.set(r.plan_id, c);
  }
  return [...m.values()];
}

async function activePlans(sb: DB, userId: string): Promise<MemberPlan[]> {
  const { data } = await sb.from("member_plans").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ ...p, inputs: (p.inputs ?? {}) as Record<string, unknown> }));
}

async function plansWithStatus(sb: DB, userId: string, status: "paused"): Promise<MemberPlan[]> {
  const { data } = await sb.from("member_plans").select("*").eq("user_id", userId).eq("status", status).order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ ...p, inputs: (p.inputs ?? {}) as Record<string, unknown> }));
}

async function openRuns(sb: DB): Promise<OpenRun[]> {
  const { data } = await sb
    .from("program_runs")
    .select("id, name, status, starts_at, ends_at, location, programs(slug, name, program_media(role, url, alt, position))")
    .in("status", ["open", "waitlist"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(3);
  return (data ?? []).map((r) => {
    const p = r.programs as unknown as { slug: string; name: string; program_media: { role: string; url: string; alt: string; position: number }[] } | null;
    const media = [...(p?.program_media ?? [])].sort((a, b) => a.position - b.position);
    const img = media.find((m) => m.role === "gallery" && /venue/.test(m.url)) ?? media.find((m) => m.role === "hero") ?? media[0];
    const loc = (r.location ?? {}) as { city?: string; region?: string };
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      place: [loc.city, loc.region].filter(Boolean).join(", ") || null,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      image: img ? { url: img.url, alt: img.alt } : null,
    };
  });
}

/* ============================================================== Today */

export interface CurrentLesson {
  lessonId: string;
  dayType: string | null;
  sectionTitle: string | null;
  steps: { title: string; done: boolean; duration?: string | null }[];
  /** The day's focus line (shown as Mike's note on Home). */
  focus?: string | null;
  minutes?: number | null;
}

export interface TodayRaw {
  today: IsoDate;
  profile: Profile;
  enrollments: Enrollment[];
  currentLesson: CurrentLesson | null;
  /** my_week from two weeks back to the end of this week (missed items + this week). */
  entries: WeekEntry[];
  goals: Goal[];
  plans: MemberPlan[];
  planCounts: PlanCount[];
  rewards: Rewards;
  experiences: MyExperiences;
  openRuns: OpenRun[];
  /** Lessons in intro sections (0015), so "Continue" skips them; absent in older preview fixtures. */
  introLessonIds?: string[] | null;
}

async function currentLesson(sb: DB, userId: string, lessonId: string | null): Promise<CurrentLesson | null> {
  if (!lessonId) return null;
  const { data } = await sb.from("lessons").select("id, day_type, focus, estimated_minutes, sections(title), steps(id, title, position, duration_label)").eq("id", lessonId).maybeSingle();
  if (!data) return null;
  const steps = [...((data.steps ?? []) as { id: string; title: string; position: number; duration_label: string | null }[])].sort((a, b) => a.position - b.position);
  const { data: done } = steps.length
    ? await sb.from("step_progress").select("step_id").eq("user_id", userId).in("step_id", steps.map((s) => s.id))
    : { data: [] as { step_id: string }[] };
  const doneSet = new Set((done ?? []).map((d) => d.step_id));
  return {
    lessonId: data.id,
    dayType: data.day_type,
    sectionTitle: (data.sections as unknown as { title: string } | null)?.title ?? null,
    steps: steps.map((s) => ({ title: s.title, done: doneSet.has(s.id), duration: s.duration_label })),
    focus: data.focus,
    minutes: data.estimated_minutes,
  };
}

const loadTodayRaw = mockable("tpy-today", async (): Promise<TodayRaw> => {
  const { sb, user } = await session();
  const profile = await loadProfile(sb, user);
  const today = memberToday(profile.timezone);
  const ws = startOfWeek(today);
  const [enrollments, entries, goals, plans, rewards, experiences, runs, intro] = await Promise.all([
    myEnrollments(sb),
    myWeek(sb, addDays(ws, -14), addDays(ws, 6)),
    myGoals(sb, user.id) as Promise<Goal[]>,
    activePlans(sb, user.id),
    myRewards(sb),
    myExperiences(sb) as Promise<MyExperiences>,
    openRuns(sb),
    introLessonIds(sb),
  ]);
  const primary = pickContinue(enrollments, intro);
  const [current, counts] = await Promise.all([currentLesson(sb, user.id, primary?.current_lesson_id ?? null), planCounts(sb, plans.map((p) => p.id))]);
  return { today, profile, enrollments, currentLesson: current, entries: entries ?? [], goals, plans, planCounts: counts, rewards, experiences, openRuns: runs, introLessonIds: intro };
});

/** Today's data, with day programs counted in training days (one source with the rail and You). */
export async function loadToday(): Promise<TodayRaw> {
  const raw = await loadTodayRaw();
  const [enrollments, entries] = await Promise.all([withTrainingDays(raw.enrollments), markLockedEntries(raw.entries)]);
  return { ...raw, enrollments, entries };
}

/* ============================================================== Onboarding */

export interface OnboardingData {
  today: IsoDate;
  firstName: string;
  form: IntakeForm;
  templates: Template[];
}

function toTemplate(t: { id: string; slug: string; name: string; goal_kind: string; weeks: number; days_per_week: number; description: string | null; items: unknown }): Template {
  return { id: t.id, slug: t.slug, name: t.name, goal_kind: t.goal_kind, weeks: t.weeks, days_per_week: t.days_per_week, description: t.description, sessions: Array.isArray(t.items) ? t.items.length : 0 };
}

export const loadOnboarding = mockable("tpy-onboarding", async (): Promise<OnboardingData | null> => {
  const { sb, user } = await session();
  const [profile, form, templates] = await Promise.all([loadProfile(sb, user), getIntakeForm(sb, "goal-setting"), planTemplates(sb)]);
  if (!form) return null;
  return { today: memberToday(profile.timezone), firstName: profile.firstName, form, templates: templates.map(toTemplate) };
});

/* ============================================================== Plan */

export interface PlanRaw {
  today: IsoDate;
  from: IsoDate;
  to: IsoDate;
  entries: WeekEntry[];
  plans: MemberPlan[];
  /** Paused plans: off the calendar, listed under "Paused" on Manage plans with Resume. */
  pausedPlans?: MemberPlan[];
  planCounts: PlanCount[];
  goals: Goal[];
  templates: Template[];
}

/** Loads a window around `anchor` that covers its week, its month grid and the last two weeks (missed days). */
const loadPlanRaw = mockable("tpy-plan", async (anchor?: IsoDate): Promise<PlanRaw> => {
  const { sb, user } = await session();
  const profile = await loadProfile(sb, user);
  const today = memberToday(profile.timezone);
  const a = anchor ?? today;
  const gridStart = startOfWeek(`${a.slice(0, 8)}01`);
  const from = [gridStart, addDays(startOfWeek(today), -14)].sort()[0]!;
  const to = addDays(from, 91) < addDays(gridStart, 41) ? addDays(from, 91) : addDays(gridStart, 41);
  const [entries, plans, goals, templates, pausedPlans] = await Promise.all([
    myWeek(sb, from, to),
    activePlans(sb, user.id),
    myGoals(sb, user.id) as Promise<Goal[]>,
    planTemplates(sb),
    plansWithStatus(sb, user.id, "paused"),
  ]);
  return { today, from, to, entries: entries ?? [], plans, pausedPlans, planCounts: await planCounts(sb, [...plans, ...pausedPlans].map((p) => p.id)), goals, templates: templates.map(toTemplate) };
});

/** The plan window, with sessions of programs the member can no longer open marked `locked`. */
export async function loadPlan(anchor?: IsoDate): Promise<PlanRaw> {
  const raw = await loadPlanRaw(anchor);
  return { ...raw, entries: await markLockedEntries(raw.entries) };
}

export interface PlanDetail {
  today: IsoDate;
  plan: MemberPlan;
  goal: Goal | null;
  items: { id: string; on_date: string; kind: string; title: string; lesson_id: string | null; program_slug: string | null; program_name: string | null; done: boolean; skipped: boolean }[];
}

export const loadPlanDetail = mockable("tpy-plan-detail", async (planId: string): Promise<PlanDetail | null> => {
  const { sb, user } = await session();
  const profile = await loadProfile(sb, user);
  const { data: plan } = await sb.from("member_plans").select("*").eq("id", planId).eq("user_id", user.id).maybeSingle();
  if (!plan) return null;
  const { data: items } = await sb
    .from("plan_items")
    .select("id, on_date, kind, title, lesson_id, done_at, skipped_at, lessons(title, programs(slug, name))")
    .eq("plan_id", planId)
    .order("on_date")
    .order("position");
  const goal = plan.goal_id ? ((await sb.from("goals").select("*").eq("id", plan.goal_id).maybeSingle()).data as Goal | null) : null;
  return {
    today: memberToday(profile.timezone),
    plan: { ...plan, inputs: (plan.inputs ?? {}) as Record<string, unknown> },
    goal,
    items: (items ?? []).map((i) => {
      const l = i.lessons as unknown as { title: string; programs: { slug: string; name: string } | null } | null;
      return {
        id: i.id, on_date: i.on_date, kind: i.kind, title: l?.title ?? i.title ?? i.kind, lesson_id: i.lesson_id,
        program_slug: l?.programs?.slug ?? null, program_name: l?.programs?.name ?? null, done: !!i.done_at, skipped: !!i.skipped_at,
      };
    }),
  };
});

export interface CatalogLesson {
  id: string;
  title: string;
  section: string;
  dayType: string | null;
}
export interface LessonCatalog {
  programs: { id: string; slug: string; name: string; lessons: CatalogLesson[] }[];
}

/** Lessons from every program the member can open, for "Build my own" (drag onto days). */
export const loadLessonCatalog = mockable("tpy-lessons", async (): Promise<LessonCatalog> => {
  const { sb } = await session();
  const catalog = await getCatalog(sb);
  const open = catalog.filter((p) => ["included", "owned", "free"].includes(p.access) && p.type !== "tool" && p.type !== "retreat");
  if (!open.length) return { programs: [] };
  const { data } = await sb
    .from("lessons")
    .select("id, title, day_type, program_id, position, sections(title, position)")
    .in("program_id", open.map((p) => p.id))
    .is("page_type", null);
  const rows = (data ?? []).map((l) => {
    const s = l.sections as unknown as { title: string; position: number } | null;
    return { ...l, section: s?.title ?? "", spos: s?.position ?? 0 };
  });
  return {
    programs: open
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        lessons: rows
          .filter((l) => l.program_id === p.id)
          .sort((a, b) => a.spos - b.spos || a.position - b.position)
          .map((l) => ({ id: l.id, title: l.title, section: l.section, dayType: l.day_type })),
      }))
      .filter((p) => p.lessons.length),
  };
});

/* ============================================================== You */

export interface Certificate {
  id: string;
  issued_at: string;
  program_name: string;
  path_name: string | null;
  verify_code: string;
}

export interface YouData {
  profile: Profile;
  enrollments: Enrollment[];
  rewards: Rewards;
  certificates: Certificate[];
  counts: { saves: number; toolResults: number; readiness: number; referrals: number };
  goal: Goal | null;
}

async function certificates(sb: DB, userId: string): Promise<Certificate[]> {
  const { data } = await sb
    .from("certificates")
    .select("id, issued_at, verify_code, programs(name), program_paths(name)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    issued_at: c.issued_at,
    verify_code: c.verify_code,
    program_name: (c.programs as unknown as { name: string } | null)?.name ?? "",
    path_name: (c.program_paths as unknown as { name: string } | null)?.name ?? null,
  }));
}

async function count(sb: DB, table: "saved_videos" | "tool_results" | "readiness_results", userId: string) {
  const { count: n } = await sb.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  return n ?? 0;
}

export const loadYou = mockable("tpy-you", async (): Promise<YouData> => {
  const { sb, user } = await session();
  const [profile, enrollments, rewards, certs, saves, tools, readiness, refs, goals] = await Promise.all([
    loadProfile(sb, user),
    myEnrollments(sb),
    myRewards(sb),
    certificates(sb, user.id),
    count(sb, "saved_videos", user.id),
    count(sb, "tool_results", user.id),
    count(sb, "readiness_results", user.id),
    sb.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id).then((r) => r.count ?? 0),
    myGoals(sb, user.id) as Promise<Goal[]>,
  ]);
  return {
    profile, enrollments, rewards, certificates: certs,
    counts: { saves, toolResults: tools, readiness, referrals: refs },
    goal: goals.find((g) => g.status === "active") ?? null,
  };
});

export interface Badge {
  id: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  icon: string | null;
  description: string;
  points: number;
}

export interface RewardsData {
  rewards: Rewards;
  badges: Badge[];
  ledger: { id: number; amount: number; reason: string; created_at: string }[];
}

export const loadRewards = mockable("tpy-rewards", async (): Promise<RewardsData> => {
  const { sb, user } = await session();
  const [rewards, badges, ledger] = await Promise.all([
    myRewards(sb),
    sb.from("badges").select("id, name, tier, icon, description, points").order("position").then((r) => (r.data ?? []) as Badge[]),
    sb.from("points_ledger").select("id, amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30).then((r) => r.data ?? []),
  ]);
  return { rewards, badges, ledger };
});

export interface SavesData {
  videos: { saved_at: string; id: string; title: string; duration_seconds: number | null; thumbnail_url: string | null; category: string | null }[];
  toolResults: { id: string; tool_id: string; tool_name: string; created_at: string; result: Record<string, unknown> }[];
  readiness: { id: string; created_at: string; score: number; band_name: string; outcome: string; lesson_title: string }[];
}

export const loadSaves = mockable("tpy-saves", async (): Promise<SavesData> => {
  const { sb, user } = await session();
  const [videos, results, tools, readiness] = await Promise.all([
    savedVideos(sb, user.id),
    myToolResults(sb, user.id),
    sb.from("tools").select("id, name").then((r) => r.data ?? []),
    sb
      .from("readiness_results")
      .select("id, created_at, score, band_name, outcome, lessons(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then((r) => r.data ?? []),
  ]);
  const names = new Map(tools.map((t) => [t.id, t.name]));
  return {
    videos: videos.map((v) => {
      const x = v.videos as unknown as { id: string; title: string; duration_seconds: number | null; thumbnail_url: string | null; category: string | null };
      return { saved_at: v.created_at, id: x.id, title: x.title, duration_seconds: x.duration_seconds, thumbnail_url: x.thumbnail_url, category: x.category };
    }),
    toolResults: results.map((r) => ({ id: r.id, tool_id: r.tool_id, tool_name: names.get(r.tool_id) ?? r.tool_id, created_at: r.created_at, result: (r.result ?? {}) as Record<string, unknown> })),
    readiness: readiness.map((r) => ({
      id: r.id, created_at: r.created_at, score: r.score, band_name: r.band_name, outcome: r.outcome,
      lesson_title: (r.lessons as unknown as { title: string } | null)?.title ?? "",
    })),
  };
});

export interface NotificationPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  reminder_time: string;
  reminder_days: number[];
  quiet_start: string | null;
  quiet_end: string | null;
  streak_nudge: boolean;
  weekly_recap: boolean;
  offers_email: boolean;
}

/** Column defaults of notification_prefs (a member without a row gets these). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_enabled: true, push_enabled: false, reminder_time: "07:00:00", reminder_days: [1, 2, 3, 4, 5],
  quiet_start: null, quiet_end: null, streak_nudge: true, weekly_recap: true, offers_email: true,
};

export interface SettingsData {
  profile: Profile;
  notifications: NotificationPrefs;
}

export const loadSettings = mockable("tpy-settings", async (): Promise<SettingsData> => {
  const { sb, user } = await session();
  const [profile, prefs] = await Promise.all([loadProfile(sb, user), sb.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle()]);
  const p = prefs.data;
  return {
    profile,
    notifications: p
      ? { email_enabled: p.email_enabled, push_enabled: p.push_enabled, reminder_time: p.reminder_time, reminder_days: p.reminder_days, quiet_start: p.quiet_start, quiet_end: p.quiet_end, streak_nudge: p.streak_nudge, weekly_recap: p.weekly_recap, offers_email: p.offers_email }
      : DEFAULT_NOTIFICATION_PREFS,
  };
});

export interface ReferralsData {
  code: string;
  firstName: string;
  referrals: { id: string; status: string; created_at: string; paid_at: string | null }[];
  rewards: Pick<Rewards, "points_total">;
}

export const loadReferrals = mockable("tpy-referrals", async (): Promise<ReferralsData> => {
  const { sb, user } = await session();
  const [profile, code, refs, rewards] = await Promise.all([
    loadProfile(sb, user),
    sb.rpc("my_referral_code").then((r) => {
      if (r.error) throw new Error(r.error.message);
      return r.data as string;
    }),
    sb.from("referrals").select("id, status, created_at, paid_at").eq("referrer_id", user.id).order("created_at", { ascending: false }).then((r) => r.data ?? []),
    myRewards(sb),
  ]);
  return { code, firstName: profile.firstName, referrals: refs, rewards: { points_total: rewards.points_total } };
});
