import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeCode(seed: string) {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const head = (clean.slice(0, 4) || "KBL").padEnd(4, "X");
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${head}-${tail}`;
}

/** Returns the caller's referral row, creating it on first visit. */
export const getReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error } = await context.supabase
      .from("referrals")
      .select("id, code, points, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (existing) return existing;

    const { data: created, error: insertError } = await context.supabase
      .from("referrals")
      .insert({ user_id: context.userId, code: makeCode(context.userId) })
      .select("id, code, points, created_at")
      .single();
    if (insertError) throw new Error(insertError.message);
    return created;
  });

export const getReferralEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("referral_events")
      .select("id, code, stage, label, points, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const STAGE_POINTS: Record<string, number> = {
  visit: 0,
  signup: 50,
  purchase: 250,
};

export const recordReferralEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage: "visit" | "signup" | "purchase"; label?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: referral, error: refError } = await context.supabase
      .from("referrals")
      .select("id, code, points")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (refError) throw new Error(refError.message);
    if (!referral) throw new Error("No referral code yet");

    const points = STAGE_POINTS[data.stage] ?? 0;

    const { error } = await context.supabase.from("referral_events").insert({
      user_id: context.userId,
      code: referral.code,
      stage: data.stage,
      label: data.label ?? null,
      points,
    });
    if (error) throw new Error(error.message);

    if (points) {
      const { error: pointsError } = await context.supabase
        .from("referrals")
        .update({ points: (referral.points ?? 0) + points })
        .eq("id", referral.id);
      if (pointsError) throw new Error(pointsError.message);
    }

    return { ok: true, points };
  });
