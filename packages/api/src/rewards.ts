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
