import "server-only";
import {
  getForm,
  myBadgeProgress,
  myEnrollments,
  myOrders,
  myPassportStats,
  myRewards,
  referralTiers,
  type BadgeProgress,
  type DB,
  type Order,
  type PassportProgram,
  type PassportStats,
  type ReferralTier,
  type Rewards,
} from "@ms/api";
import { embedUrl, type WorkoutTable } from "@ms/core";
import { toolDef } from "@/components/discover/tools/defs";
import { lessonHrefOf } from "@/lib/hrefs";
import { MOCK, mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import type { Badge, Certificate, Enrollment } from "./today-plan-you";
import { dayProgress, pctOf, streakCount, withTrainingDays } from "./day-progress";

/* ============================================================== shared */

export interface YouProfile {
  id: string;
  email: string;
  firstName: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  createdAt: string;
}

async function session() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  return { sb: supabase as unknown as DB, user };
}

async function profileOf(sb: DB, user: { id: string; email?: string | null; created_at?: string }): Promise<YouProfile> {
  const { data } = await sb.from("profiles").select("display_name, first_name, avatar_url, timezone, created_at").eq("id", user.id).maybeSingle();
  const display = data?.display_name || data?.first_name || user.email?.split("@")[0] || "Member";
  return {
    id: user.id,
    email: user.email ?? "",
    firstName: data?.first_name || display.split(" ")[0]!,
    displayName: display,
    avatarUrl: data?.avatar_url ?? null,
    timezone: data?.timezone || "UTC",
    createdAt: data?.created_at ?? user.created_at ?? new Date().toISOString(),
  };
}

export interface PastRun {
  id: string;
  program_name: string;
  path_name: string | null;
  run_number: number;
  started_at: string | null;
  archived_at: string;
  completed: boolean;
  lessons_completed: number;
  steps_completed: number;
}

/** Runs the member finished or restarted (run_archive). Live progress resets; this record never does. */
async function pastRuns(sb: DB, userId: string): Promise<PastRun[]> {
  const { data } = await sb
    .from("run_archive")
    .select("id, run_number, started_at, archived_at, completed, lessons_completed, steps_completed, programs(name), program_paths(name)")
    .eq("user_id", userId)
    .order("archived_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => ({
    id: r.id,
    program_name: (r.programs as unknown as { name: string } | null)?.name ?? "",
    path_name: (r.program_paths as unknown as { name: string } | null)?.name ?? null,
    run_number: r.run_number,
    started_at: r.started_at,
    archived_at: r.archived_at,
    completed: r.completed,
    lessons_completed: r.lessons_completed,
    steps_completed: r.steps_completed,
  }));
}

async function certificatesOf(sb: DB, userId: string): Promise<Certificate[]> {
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

const allBadges = (sb: DB) => sb.from("badges").select("id, name, tier, icon, description, points").order("position").then((r) => (r.data ?? []) as Badge[]);

/**
 * Fallback passport when `my_training_stats` (training_sessions, branch ui/selfguided) is not deployed:
 * activity days from step progress, levels from enrollments, readiness from readiness_results.
 * TODO(lead): drop once 0011_training_sessions is merged everywhere.
 */
async function passportFallback(sb: DB, userId: string, rewards: Rewards, enrollments: Enrollment[]): Promise<PassportStats> {
  const since = new Date(Date.now() - 26 * 7 * 864e5).toISOString();
  const [{ data: steps }, { data: ready }] = await Promise.all([
    sb.from("step_progress").select("completed_at").eq("user_id", userId).gte("completed_at", since),
    sb.from("readiness_results").select("created_at, score, band, band_name").eq("user_id", userId).order("created_at", { ascending: false }).limit(14),
  ]);
  const byDay = new Map<string, number>();
  for (const s of steps ?? []) byDay.set(s.completed_at.slice(0, 10), (byDay.get(s.completed_at.slice(0, 10)) ?? 0) + 1);
  const today = new Date().toISOString().slice(0, 10);
  return {
    today,
    from: since.slice(0, 10),
    timezone: "UTC",
    minutes: 0,
    sessions: 0,
    completions: 0,
    active_days: byDay.size,
    week: { minutes: 0, sessions: 0, starts: today },
    streak: { current: rewards.streak_current, best: rewards.streak_best },
    heatmap: [...byDay].sort().map(([date, n]) => ({ date, minutes: 0, sessions: 0, steps: n })),
    programs: enrollments.map((e) => ({
      program_id: e.program_id, slug: e.program_slug, name: e.program_name, path_id: e.path_id, path_name: e.path_name,
      done: e.lessons_done, total: e.lessons_total, pct: e.lessons_total ? Math.round((100 * e.lessons_done) / e.lessons_total) : 0, minutes: 0, phases: [],
    })),
    completions_by_lesson: [],
    readiness: [...(ready ?? [])].reverse().map((r) => ({ at: r.created_at, score: r.score, band: r.band, band_name: r.band_name })),
    intents: {},
  };
}

async function passport(sb: DB, userId: string, rewards: Rewards, enrollments: Enrollment[]) {
  const stats = await myPassportStats(sb, 26);
  return stats ? { stats, source: "sessions" as const } : { stats: await passportFallback(sb, userId, rewards, enrollments), source: "steps" as const };
}

/* ============================================================== Saves (also used by You › History) */

export interface SavedVideo {
  saved_at: string;
  id: string;
  title: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
  embed: string | null;
}

export interface SavedTool {
  id: string;
  tool_id: string;
  tool_name: string;
  created_at: string;
  title: string;
  summary: string | null;
  score: { value: number; max: number } | null;
  /** Recommended bells (Kettlebell Selector) or highlights. */
  chips: string[];
  answers: { question: string; answer: string }[];
}

export interface SessionPlan {
  id: string;
  created_at: string;
  lesson_id: string;
  lesson_title: string;
  section_title: string | null;
  program_name: string;
  program_slug: string;
  path_name: string | null;
  score: number;
  band: string;
  band_name: string;
  outcome: string;
  table: WorkoutTable | null;
}

async function savedVideosOf(sb: DB, userId: string): Promise<SavedVideo[]> {
  const { data } = await sb
    .from("saved_videos")
    .select("created_at, videos(id, provider, provider_id, privacy_hash, title, duration_seconds, thumbnail_url, level, category)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((v) => {
      const x = v.videos as unknown as {
        id: string; provider: string; provider_id: string; privacy_hash: string | null; title: string;
        duration_seconds: number | null; thumbnail_url: string | null; level: string | null; category: string | null;
      } | null;
      if (!x) return null;
      return {
        saved_at: v.created_at, id: x.id, title: x.title, duration_seconds: x.duration_seconds, thumbnail_url: x.thumbnail_url,
        category: x.category, level: x.level,
        embed: x.provider === "vimeo" && x.provider_id ? embedUrl({ providerId: x.provider_id, privacyHash: x.privacy_hash }) : null,
      };
    })
    .filter((v): v is SavedVideo => !!v);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

async function savedToolsOf(sb: DB, userId: string): Promise<SavedTool[]> {
  const [{ data: results }, { data: tools }] = await Promise.all([
    sb.from("tool_results").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    sb.from("tools").select("id, name, config"),
  ]);
  if (!results?.length) return [];
  const cfg = new Map((tools ?? []).map((t) => [t.id, t]));
  const formIds = new Set((tools ?? []).map((t) => str((t.config as Record<string, unknown>)?.form_id)).filter(Boolean) as string[]);
  const forms = new Map(await Promise.all([...formIds].map(async (id) => [id, await getForm(sb, id).catch(() => null)] as const)));
  return results.map((r) => {
    const t = cfg.get(r.tool_id);
    const config = (t?.config ?? {}) as Record<string, unknown>;
    const res = (r.result ?? {}) as Record<string, unknown>;
    const ans = (r.answers ?? {}) as Record<string, string>;
    const def = t ? toolDef(t.id, config, forms.get(str(config.form_id) ?? "") ?? null) : null;
    const steps = def ? def.steps(ans) : [];
    const answers = Object.entries(ans).map(([k, v]) => {
      const q = steps.find((s) => s.id === k);
      return { question: q?.question ?? k.replace(/[_-]/g, " "), answer: q?.options.find((o) => o.value === v)?.label ?? String(v) };
    });
    const bells = Array.isArray(res.bells) ? (res.bells as { label?: string; size?: number }[]).map((b) => `${b.size ?? b.label} kg`) : [];
    const movements = Array.isArray(res.movements) ? (res.movements as string[]).slice(0, 6) : [];
    return {
      id: r.id,
      tool_id: r.tool_id,
      tool_name: t?.name ?? r.tool_id,
      created_at: r.created_at,
      title: str(res.title) ?? str(res.headline) ?? t?.name ?? "Result",
      summary: str(res.summary),
      score: typeof res.score === "number" && typeof res.max === "number" ? { value: res.score, max: res.max } : null,
      chips: bells.length ? bells : movements,
      answers,
    };
  });
}

async function sessionPlansOf(sb: DB, userId: string): Promise<SessionPlan[]> {
  const { data } = await sb
    .from("readiness_results")
    .select("id, created_at, lesson_id, score, band, band_name, outcome, prescription, lessons(title, sections(title), programs(name, slug), program_paths(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => {
    const l = r.lessons as unknown as { title: string; sections: { title: string } | null; programs: { name: string; slug: string } | null; program_paths: { name: string } | null } | null;
    const p = r.prescription as unknown as WorkoutTable | null;
    return {
      id: r.id, created_at: r.created_at, lesson_id: r.lesson_id, lesson_title: l?.title ?? "", section_title: l?.sections?.title ?? null,
      program_name: l?.programs?.name ?? "", program_slug: l?.programs?.slug ?? "", path_name: l?.program_paths?.name ?? null,
      score: r.score, band: r.band, band_name: r.band_name, outcome: r.outcome,
      table: p && Array.isArray(p.rows) && p.rows.length ? p : null,
    };
  });
}

export interface SavesV2 {
  videos: SavedVideo[];
  tools: SavedTool[];
  plans: SessionPlan[];
}

export const loadSavesV2 = mockable("you-saves", async (): Promise<SavesV2> => {
  const { sb, user } = await session();
  const [videos, tools, plans] = await Promise.all([savedVideosOf(sb, user.id), savedToolsOf(sb, user.id), sessionPlansOf(sb, user.id)]);
  return { videos, tools, plans };
});

/* ============================================================== You (training passport + tabs) */

export interface PassportData {
  profile: YouProfile;
  enrollments: Enrollment[];
  rewards: Rewards;
  stats: PassportStats;
  /** "sessions" = training_sessions log; "steps" = fallback from step progress. */
  statsSource: "sessions" | "steps";
  runs: PastRun[];
  badges: Badge[];
  progress: BadgeProgress[];
  certificates: Certificate[];
  orders: Order[];
  saves: SavesV2;
  referrals: number;
}

const loadPassportRaw = mockable("you-passport", async (): Promise<PassportData> => {
  const { sb, user } = await session();
  const [profile, enrollments, rewards, badges, progress, certificates, orders, runs, videos, tools, plans, refs] = await Promise.all([
    profileOf(sb, user),
    myEnrollments(sb),
    myRewards(sb),
    allBadges(sb),
    myBadgeProgress(sb).catch(() => [] as BadgeProgress[]),
    certificatesOf(sb, user.id),
    myOrders(sb).catch(() => [] as Order[]),
    pastRuns(sb, user.id),
    savedVideosOf(sb, user.id),
    savedToolsOf(sb, user.id),
    sessionPlansOf(sb, user.id),
    sb.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id).then((r) => r.count ?? 0),
  ]);
  const { stats, source } = await passport(sb, user.id, rewards, enrollments);
  return { profile, enrollments, rewards, stats, statsSource: source, runs, badges, progress, certificates, orders, saves: { videos, tools, plans }, referrals: refs };
});

/* ============================================================== Rewards */

export interface RewardsV2 {
  name: string;
  rewards: Rewards;
  badges: Badge[];
  progress: BadgeProgress[];
  ledger: { id: number; amount: number; reason: string; created_at: string }[];
  levels: YouLevel[];
  runs: PastRun[];
  certificates: Certificate[];
}

const loadRewardsRaw = mockable("you-rewards", async (): Promise<RewardsV2> => {
  const { sb, user } = await session();
  const [profile, rewards, badges, progress, ledger, enrollments, runs, certificates] = await Promise.all([
    profileOf(sb, user),
    myRewards(sb),
    allBadges(sb),
    myBadgeProgress(sb).catch(() => [] as BadgeProgress[]),
    sb.from("points_ledger").select("id, amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40).then((r) => r.data ?? []),
    myEnrollments(sb),
    pastRuns(sb, user.id),
    certificatesOf(sb, user.id),
  ]);
  const { stats } = await passport(sb, user.id, rewards, enrollments);
  return { name: profile.displayName, rewards, badges, progress, ledger, levels: await levelsInDays(stats.programs, enrollments), runs, certificates };
});

/* ============================================================== One source of truth (D09) */

/** A level on You: the passport counts plus how to read them (days or lessons) and where to pick up. */
export type YouLevel = PassportProgram & { unit?: "day" | "lesson"; href?: string };

/** Day-program levels in training days (the same counts as the rail, Today and the program page). */
async function levelsInDays(levels: PassportProgram[], enrollments: Enrollment[]): Promise<YouLevel[]> {
  const dayPrograms = new Set(enrollments.filter((e) => e.program_type === "day_program").map((e) => e.program_id));
  return Promise.all(
    levels.map(async (p): Promise<YouLevel> => {
      const e = enrollments.find((x) => x.program_id === p.program_id && (x.path_id ?? null) === (p.path_id ?? null)) ?? enrollments.find((x) => x.program_id === p.program_id);
      const href = lessonHrefOf(p.slug, e?.current_lesson_id, { type: e?.program_type, mode: e?.mode });
      if (!dayPrograms.has(p.program_id)) return { ...p, unit: "lesson", href };
      const d = await dayProgress(p.program_id, p.path_id ?? null);
      if (!d) return { ...p, unit: "lesson", href };
      const phases = d.sections.filter((s) => s.days > 0).map((s) => ({ section_id: s.id, title: s.title, done: s.daysDone, total: s.days, pct: pctOf(s.daysDone, s.days) }));
      return { ...p, done: d.done, total: d.total, pct: pctOf(d.done, d.total), phases, unit: "day", href };
    }),
  );
}

/** You: enrollments and levels counted in training days, the streak from my_rewards. */
export async function loadPassport(): Promise<PassportData> {
  const [raw, streak] = await Promise.all([loadPassportRaw(), streakCount()]);
  const enrollments = await withTrainingDays(raw.enrollments);
  const programs = await levelsInDays(raw.stats.programs, raw.enrollments);
  return {
    ...raw,
    enrollments,
    rewards: { ...raw.rewards, streak_current: streak.current, streak_best: Math.max(streak.best, streak.current) },
    stats: { ...raw.stats, programs, streak: { current: streak.current, best: Math.max(streak.best, streak.current) } },
  };
}

export async function loadRewardsV2(): Promise<RewardsV2> {
  const raw = await loadRewardsRaw();
  if (!MOCK) return raw;
  // Preview snapshot: its only level is the day program (the real loader passes the enrollments).
  const enrollments = raw.levels.map((l) => ({ program_id: l.program_id, program_type: "day_program" }) as Enrollment);
  return { ...raw, levels: await levelsInDays(raw.levels, enrollments) };
}

/* ============================================================== Referrals */

export interface ReferralsV2 {
  code: string;
  firstName: string;
  referrals: { id: string; status: string; created_at: string; paid_at: string | null }[];
  events: { id: number; kind: "share" | "visit"; channel: string | null; created_at: string }[];
  /** Points earned from referrals (points_ledger reason 'referral'). */
  points: number;
  tiers: ReferralTier[];
  /** "Give a month, get a month": the free first month this member got for joining through a friend (member_credits). */
  welcome?: { label: string; detail: string | null; expiresAt: string | null; redeemedAt: string | null } | null;
}

export const loadReferralsV2 = mockable("you-referrals", async (): Promise<ReferralsV2> => {
  const { sb, user } = await session();
  const [profile, code, refs, events, points, tiers, welcome] = await Promise.all([
    profileOf(sb, user),
    sb.rpc("my_referral_code").then((r) => {
      if (r.error) throw new Error(r.error.message);
      return r.data as string;
    }),
    sb.from("referrals").select("id, status, created_at, paid_at").eq("referrer_id", user.id).order("created_at", { ascending: false }).then((r) => r.data ?? []),
    // referral_events is newer than the generated types
    (sb as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: unknown }> } } } } })
      .from("referral_events")
      .select("id, kind, channel, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then((r: { data: unknown }) => (r.data ?? []) as ReferralsV2["events"]),
    sb.from("points_ledger").select("amount").eq("user_id", user.id).eq("reason", "referral").then((r) => (r.data ?? []).reduce((n, x) => n + x.amount, 0)),
    referralTiers(sb),
    // member_credits (0036) is newer than the generated types
    (sb as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("member_credits")
      .select("label, detail, expires_at, redeemed_at")
      .eq("user_id", user.id)
      .eq("kind", "free_month")
      .eq("source", "referral")
      .maybeSingle()
      .then((r: { data: { label: string; detail: string | null; expires_at: string | null; redeemed_at: string | null } | null }) =>
        r.data ? { label: r.data.label, detail: r.data.detail, expiresAt: r.data.expires_at, redeemedAt: r.data.redeemed_at } : null,
      ),
  ]);
  return { code, firstName: profile.firstName, referrals: refs, events, points, tiers, welcome };
});

/* ============================================================== Certificate PDF */

export interface CertificatePdfData {
  id: string;
  name: string;
  program: string;
  path: string | null;
  phases: string[];
  issuedAt: string;
  run: number;
  verifyCode: string;
}

/** A certificate the signed-in member owns (RLS), with the phase names of its level. */
export async function loadCertificatePdf(id: string, sbOverride?: DB): Promise<CertificatePdfData | null> {
  const sb = sbOverride ?? (await session()).sb;
  const { data: c } = await sb
    .from("certificates")
    .select("id, name_on_certificate, issued_at, run_number, verify_code, program_id, path_id, programs(name), program_paths(name)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  let q = sb.from("sections").select("title, key, position, parent_id").eq("program_id", c.program_id).is("parent_id", null).order("position");
  q = c.path_id ? q.eq("path_id", c.path_id) : q;
  const { data: secs } = await q;
  const phases = (secs ?? []).map((s) => s.title).filter((t) => !/^(home|start here|welcome|intro)/i.test(t));
  return {
    id: c.id,
    name: c.name_on_certificate,
    program: (c.programs as unknown as { name: string } | null)?.name ?? "",
    path: (c.program_paths as unknown as { name: string } | null)?.name ?? null,
    phases,
    issuedAt: c.issued_at,
    run: c.run_number,
    verifyCode: c.verify_code,
  };
}
