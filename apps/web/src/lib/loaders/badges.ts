import "server-only";
import { cache } from "react";
import { badgeDefinitions, myBadgeProgress, myPerks, myRewards, type BadgeDefinition, type BadgeProgress, type DB, type MemberPerk } from "@ms/api";
import { mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/** Badges & rewards (0023): every definition, what the member earned (id → date), progress and perks. */
export interface BadgesData {
  defs: BadgeDefinition[];
  earned: Record<string, string>;
  progress: BadgeProgress[];
  perks: MemberPerk[];
}

const EMPTY: BadgesData = { defs: [], earned: {}, progress: [], perks: [] };

export const loadBadges = cache(
  mockable("badges", async (): Promise<BadgesData> => {
    const { supabase, user } = await getUser();
    const sb = supabase as unknown as DB;
    const defs = await badgeDefinitions(sb).catch(() => [] as BadgeDefinition[]);
    if (!user) return { ...EMPTY, defs };
    const [rewards, progress, perks] = await Promise.all([
      myRewards(sb).catch(() => null),
      myBadgeProgress(sb).catch(() => [] as BadgeProgress[]),
      myPerks(sb).catch(() => [] as MemberPerk[]),
    ]);
    const earned = Object.fromEntries((rewards?.badges ?? []).map((b) => [b.id, b.earned_at]));
    return { defs, earned, progress, perks };
  }),
);
