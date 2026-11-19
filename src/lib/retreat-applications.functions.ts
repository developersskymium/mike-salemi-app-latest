import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
// The applications table is added with this draft; loosen typing until types regenerate.
const loose = (sb: unknown) => sb as { from: (t: string) => any };

export type RetreatApplication = {
  id: string;
  user_id: string;
  retreat_slug: string;
  cohort_starts_on: string | null;
  cohort_ends_on: string | null;
  answers: Record<string, string | boolean | null>;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const answersSchema = z.object({
  intention: z.string().min(1).max(200),
  calling: z.string().trim().min(10).max(2000),
  experience: z.string().min(1).max(200),
  health: z.string().max(2000).optional().default(""),
  sweatLodgeOk: z.boolean(),
  diet: z.string().max(500).optional().default(""),
  fullAttendance: z.boolean(),
  agreements: z.boolean(),
  phone: z.string().trim().min(5).max(40),
  emergencyName: z.string().trim().min(2).max(120),
  emergencyPhone: z.string().trim().min(5).max(40),
});
export type RetreatAnswers = z.infer<typeof answersSchema>;

export const getMyRetreatApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await loose(context.supabase)
      .from("retreat_applications")
      .select("*")
      .eq("user_id", context.userId)
      .eq("retreat_slug", data.slug)
      .maybeSingle();
    if (error) return null;
    return (row ?? null) as RetreatApplication | null;
  });

export const submitRetreatApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: z.string().min(1).max(80),
        startsOn: z.string().max(40).nullable(),
        endsOn: z.string().max(40).nullable(),
        waitlist: z.boolean(),
        answers: answersSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.answers.fullAttendance || !data.answers.agreements) {
      throw new Error("Please confirm full attendance and the circle agreements.");
    }
    const { error } = await loose(context.supabase).from("retreat_applications").insert({
      user_id: context.userId,
      retreat_slug: data.slug,
      cohort_starts_on: data.startsOn,
      cohort_ends_on: data.endsOn,
      answers: data.answers,
      status: data.waitlist ? "waitlist" : "submitted",
    });
    if (error) {
      if (error.code === "23505") throw new Error("You've already applied for this retreat.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

/** Admin list — row security returns everything only to admins. */
export const listRetreatApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await loose(context.supabase)
      .from("retreat_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [] as RetreatApplication[];
    return (data ?? []) as RetreatApplication[];
  });

export const updateRetreatApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["submitted", "waitlist", "call_scheduled", "accepted", "declined", "withdrawn"]),
        admin_notes: z.string().max(4000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await loose(context.supabase)
      .from("retreat_applications")
      .update({ status: data.status, admin_notes: data.admin_notes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
