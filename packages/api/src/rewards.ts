import type { DB } from "./client";

export interface EarnedBadge {
  id: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  icon: string | null;
  earned_at: string;
}

export interface Rewards {
  points_total: number;
  /** 1-based; a new level every 1000 points */
  level: number;
  /** Initiate, Apprentice, Practitioner, Adept, Master, Master II … */
  level_name: string;
  next_level_at: number;
  streak_current: number;
  streak_best: number;
  badges: EarnedBadge[];
}

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;
function rpc(sb: DB, fn: string, args?: Record<string, unknown>): RpcResult {
  return (sb as unknown as { rpc: (f: string, a?: Record<string, unknown>) => RpcResult }).rpc(fn, args);
}

export async function myRewards(sb: DB): Promise<Rewards> {
  const { data, error } = await rpc(sb, "my_rewards");
  if (error) throw new Error(`myRewards: ${error.message}`);
  return data as Rewards;
}

export type ClaimReferralResult = { ok: true } | { ok: false; error: "invalid_code" | "own_code" | "already_claimed" | "too_late" };

/** Claim a friend's referral code (once per account, within 30 days of signing up). */
export async function claimReferral(sb: DB, code: string): Promise<ClaimReferralResult> {
  const { data, error } = await rpc(sb, "claim_referral", { p_code: code });
  if (error) throw new Error(`claimReferral: ${error.message}`);
  return data as ClaimReferralResult;
}

/* ------------------------------------------------------------------ W4: medals, passport, referrals */

export interface BadgeProgress {
  id: string;
  current: number;
  target: number;
  earned: boolean;
}

/** How far the member is towards every medal (same rules as the awarder). */
export async function myBadgeProgress(sb: DB): Promise<BadgeProgress[]> {
  const { data, error } = await rpc(sb, "my_badge_progress");
  if (error) throw new Error(`myBadgeProgress: ${error.message}`);
  return (data ?? []) as BadgeProgress[];
}

export interface PassportPhase {
  section_id: string;
  title: string;
  done: number;
  total: number;
  pct: number;
}
export interface PassportProgram {
  program_id: string;
  slug: string;
  name: string;
  path_id: string | null;
  path_name: string | null;
  done: number;
  total: number;
  pct: number;
  minutes: number;
  phases: PassportPhase[];
}
export interface PassportStats {
  today: string;
  from: string;
  timezone: string;
  minutes: number;
  sessions: number;
  completions: number;
  active_days: number;
  week: { minutes: number; sessions: number; starts: string };
  streak: { current: number; best: number };
  /** One entry per day with any training (minutes from the session log, steps from progress). */
  heatmap: { date: string; minutes: number; sessions: number; steps: number }[];
  programs: PassportProgram[];
  completions_by_lesson: { lesson_id: string; count: number; last_at: string }[];
  readiness: { at: string; score: number; band: string; band_name: string }[];
  intents: Record<string, number>;
}

/**
 * The training passport: totals, heat map, per-level progress and readiness trend, from the
 * `my_training_stats` function (training_sessions log). Returns null when the function is not
 * deployed yet, so callers can fall back to step progress.
 */
export async function myPassportStats(sb: DB, weeks = 26): Promise<PassportStats | null> {
  const { data, error } = await rpc(sb, "my_training_stats", { p_program: null, p_weeks: weeks });
  if (error) return null;
  return (data ?? null) as PassportStats | null;
}

export type ShareChannel = "link" | "copy" | "native" | "whatsapp" | "email" | "x";

/** Logs that the member shared their invite (funnel stats). Never throws. */
export async function logReferralShare(sb: DB, channel: ShareChannel): Promise<void> {
  await rpc(sb, "log_referral_share", { p_channel: channel });
}

/** Logs a visit to an invite link (/join?ref=CODE); callable signed out. Never throws. */
export async function logReferralVisit(sb: DB, code: string): Promise<void> {
  await rpc(sb, "log_referral_visit", { p_code: code });
}

export interface ReferralTier {
  points: number;
  reward: string;
}

/** What referral points unlock (site_settings `referral_tiers`). */
export async function referralTiers(sb: DB): Promise<ReferralTier[]> {
  const { data } = await sb.from("site_settings").select("value").eq("key", "referral_tiers").maybeSingle();
  const v = data?.value;
  return Array.isArray(v) ? (v as unknown as ReferralTier[]).filter((t) => typeof t.points === "number").sort((a, b) => a.points - b.points) : [];
}
