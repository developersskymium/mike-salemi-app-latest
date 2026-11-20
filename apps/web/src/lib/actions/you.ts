"use server";

import { logReferralShare, myRewards, type DB, type ShareChannel } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type YouResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export interface AchievementSnapshot {
  userId: string;
  badges: { id: string; name: string; tier: "bronze" | "silver" | "gold" | "platinum"; icon: string | null; description: string; earned_at: string }[];
  certificates: { id: string; program: string; path: string | null; issued_at: string }[];
  /** Programs where every level (path) has a certificate: the "program complete" milestone. */
  programsComplete: { id: string; slug: string; name: string }[];
  level: number;
  levelName: string;
}

/**
 * What the member has earned so far. The CelebrationHost compares it with what it saw last time and
 * celebrates the difference (badges, certificates, finished programs, new levels). Read-only.
 */
export async function syncAchievements(): Promise<YouResult<AchievementSnapshot>> {
  if (MOCK) return { ok: false, error: "offline" };
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "signed_out" };
    const sb = supabase as unknown as DB;
    const [rewards, badges, certs, paths] = await Promise.all([
      myRewards(sb),
      sb.from("badges").select("id, description").then((r) => r.data ?? []),
      sb
        .from("certificates")
        .select("id, issued_at, program_id, path_id, programs(name, slug), program_paths(name)")
        .eq("user_id", user.id)
        .then((r) => r.data ?? []),
      sb.from("program_paths").select("id, program_id").then((r) => r.data ?? []),
    ]);
    const desc = new Map(badges.map((b) => [b.id, b.description]));
    const byProgram = new Map<string, { slug: string; name: string; paths: Set<string> }>();
    for (const c of certs) {
      const p = c.programs as unknown as { name: string; slug: string } | null;
      const e = byProgram.get(c.program_id) ?? { slug: p?.slug ?? "", name: p?.name ?? "", paths: new Set<string>() };
      e.paths.add(c.path_id ?? "none");
      byProgram.set(c.program_id, e);
    }
    const programsComplete = [...byProgram]
      .filter(([pid, e]) => {
        const all = paths.filter((p) => p.program_id === pid).map((p) => p.id);
        return all.length ? all.every((id) => e.paths.has(id)) : e.paths.has("none");
      })
      .map(([id, e]) => ({ id, slug: e.slug, name: e.name }));
    return {
      ok: true,
      data: {
        userId: user.id,
        badges: rewards.badges.map((b) => ({ ...b, description: desc.get(b.id) ?? "" })),
        certificates: certs.map((c) => ({
          id: c.id,
          issued_at: c.issued_at,
          program: (c.programs as unknown as { name: string } | null)?.name ?? "",
          path: (c.program_paths as unknown as { name: string } | null)?.name ?? null,
        })),
        programsComplete,
        level: rewards.level,
        levelName: rewards.level_name,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

const CHANNELS: ShareChannel[] = ["link", "copy", "native", "whatsapp", "email", "x"];

/** Logs an invite share for the referral funnel. Fire and forget. */
export async function logShare(channel: ShareChannel): Promise<void> {
  if (MOCK || !CHANNELS.includes(channel)) return;
  const { supabase, user } = await getUser();
  if (!user) return;
  await logReferralShare(supabase as unknown as DB, channel).catch(() => {});
}
