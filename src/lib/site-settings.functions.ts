import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Announcement = {
  enabled: boolean;
  id: string;
  badge: string;
  text: string;
  linkLabel: string;
  linkTo: string;
};
export type HomeSettings = { heroEyebrow: string; featuredSlug: string; enrolledTitle: string };
export type ProgramsPageSettings = { title: string; intro: string; kblBadge: string; kblTitle: string; kblCopy: string };
export type RetreatCohort = { startsOn: string; endsOn: string; status: "open" | "waitlist" | "past"; capacity: number; datesTbd: boolean };
/** Admin-set cohort dates/status per retreat slug; missing slugs fall back to the static content. */
export type RetreatSettings = { cohorts: Record<string, Partial<RetreatCohort>> };
export type SiteSettings = { announcement: Announcement; home: HomeSettings; programs_page: ProgramsPageSettings; retreats: RetreatSettings };

export const SETTING_DEFAULTS: SiteSettings = {
  announcement: { enabled: false, id: "none", badge: "", text: "", linkLabel: "", linkTo: "" },
  home: { heroEyebrow: "", featuredSlug: "", enrolledTitle: "Your enrolled programs" },
  programs_page: { title: "Choose your next program", intro: "", kblBadge: "Flagship program", kblTitle: "Kettlebell Lifestyle", kblCopy: "" },
  retreats: { cohorts: {} },
};

/** All site-wide editable copy and placement, merged over safe defaults. */
export const getSiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("site_settings").select("key, value");
    if (error) throw new Error(error.message);
    const out = structuredClone(SETTING_DEFAULTS) as Record<string, Record<string, unknown>>;
    for (const row of data ?? []) {
      if (row.key in out) out[row.key] = { ...out[row.key], ...(row.value as Record<string, unknown>) };
    }
    return out as unknown as SiteSettings;
  });

/** Admin-only (enforced by row security) save of one settings group. */
export const saveSiteSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ key: z.enum(["announcement", "home", "programs_page", "retreats"]), value: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const merchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  summary: z.string().max(600).nullable(),
  status: z.enum(["draft", "published", "archived"]),
  price_cents: z.number().int().min(0).nullable(),
  included_in_subscription: z.boolean(),
  sort_order: z.number().int(),
  meta: z.object({
    badge: z.string().max(40).optional(),
    offer: z.string().max(160).optional(),
    catalogGroup: z.string().max(40).optional(),
    featured: z.boolean().optional(),
    ctaLabel: z.string().max(40).optional(),
  }),
});

/** Saves pricing, copy and placement for one program; merges meta so imported fields survive. */
export const saveProgramMerch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => merchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: current, error: readError } = await sb.from("programs").select("meta").eq("id", data.id).single();
    if (readError) throw new Error(readError.message);
    const meta = { ...((current?.meta ?? {}) as Record<string, unknown>), ...data.meta };
    const { error } = await sb
      .from("programs")
      .update({
        name: data.name,
        summary: data.summary,
        status: data.status,
        price_cents: data.price_cents ?? 0,
        included_in_subscription: data.included_in_subscription,
        sort_order: data.sort_order,
        meta: meta as never,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
