import type { DB } from "./client";

/**
 * Access model (spec 11). One state per (member, program), computed on the server by `public.access_states`
 * (0024_access_offers.sql) on top of `private.has_access` / `can_access`:
 *   owned     bought à la carte, granted, or admin
 *   included  the member's current plan (or organization) covers it
 *   upgrade   only a higher plan covers it (no one-off price)
 *   buy       one-off purchase; `amountCents` is the member's server-computed price (plan discounts applied)
 *   free      free program
 *   apply     coaching, retreats, Executive Edge, live/challenges: application or booking
 *   unavailable  nothing to buy yet (draft pricing)
 */
export type ProgramAccessState = "owned" | "included" | "upgrade" | "buy" | "free" | "apply" | "unavailable";

export interface ProgramAccess {
  programId: string;
  slug: string;
  state: ProgramAccessState;
  /** Plan that includes it (state = included). */
  planId: string | null;
  planName: string | null;
  /** The lightest higher plan that includes it (state = upgrade, also offered beside buy). */
  upgradePlanId: string | null;
  upgradePlanName: string | null;
  /** Member's price in cents (state = buy) and the list price before plan discounts. */
  amountCents: number | null;
  baseCents: number | null;
  currency: string;
  enrolled: boolean;
  started: boolean;
  completed: boolean;
}

/** Can the member open the content (not just a preview)? */
export function hasAccess(a: Pick<ProgramAccess, "state"> | null | undefined) {
  return !!a && (a.state === "owned" || a.state === "included" || a.state === "free");
}

type Row = {
  program_id: string;
  slug: string;
  state: ProgramAccessState;
  plan_id: string | null;
  plan_name: string | null;
  upgrade_plan_id: string | null;
  upgrade_plan_name: string | null;
  amount_cents: number | null;
  base_cents: number | null;
  currency: string | null;
  enrolled: boolean;
  started: boolean;
  completed: boolean;
};

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;
function rpc(sb: DB, fn: string, args?: Record<string, unknown>): RpcResult {
  return (sb as unknown as { rpc: (f: string, a?: Record<string, unknown>) => RpcResult }).rpc(fn, args);
}

export function toProgramAccess(r: Row): ProgramAccess {
  return {
    programId: r.program_id,
    slug: r.slug,
    state: r.state,
    planId: r.plan_id,
    planName: r.plan_name,
    upgradePlanId: r.upgrade_plan_id,
    upgradePlanName: r.upgrade_plan_name,
    amountCents: r.amount_cents,
    baseCents: r.base_cents,
    currency: r.currency ?? "usd",
    enrolled: !!r.enrolled,
    started: !!r.started,
    completed: !!r.completed,
  };
}

/** Access state of every published program for the signed-in member (works signed out). */
export async function accessStates(sb: DB, programId?: string): Promise<ProgramAccess[]> {
  const { data, error } = await rpc(sb, "access_states", programId ? { p_program: programId } : {});
  if (error) throw new Error(`accessStates: ${error.message}`);
  return ((data ?? []) as Row[]).map(toProgramAccess);
}

/** Is this lesson a free taste (first lesson of its program/path, or flagged `meta.preview`)? */
export async function lessonIsPreview(sb: DB, lessonId: string): Promise<boolean> {
  const { data, error } = await rpc(sb, "lesson_is_preview", { p_lesson: lessonId });
  if (error) return false;
  return data === true;
}

/* ------------------------------------------------------------------ CTA */

export type CtaKind = "start" | "continue" | "buy" | "upgrade" | "apply" | "none";
export interface Cta {
  kind: CtaKind;
  label: string;
  /** Short line under/beside the CTA (e.g. "Included in your Max plan", "Or included in Max"). */
  note: string | null;
}

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** The one primary action for a program, from its access state. Labels follow spec 11. */
export function ctaFor(a: ProgramAccess | null | undefined): Cta {
  if (!a) return { kind: "start", label: "Start", note: null };
  const going = a.enrolled || a.started;
  switch (a.state) {
    case "owned":
      return { kind: going ? "continue" : "start", label: going ? "Continue" : "Start", note: null };
    case "included":
      return going
        ? { kind: "continue", label: "Continue", note: null }
        : { kind: "start", label: "Included in your plan — Start", note: a.planName ? `Included in ${a.planName}` : "Included in your plan" };
    case "free":
      return going ? { kind: "continue", label: "Continue", note: null } : { kind: "start", label: "Free — Start", note: null };
    case "buy":
      return {
        kind: "buy",
        label: a.amountCents != null ? `Buy — ${money(a.amountCents, a.currency)}` : "Buy",
        note: a.upgradePlanName ? `Or included in ${a.upgradePlanName}` : a.baseCents && a.amountCents != null && a.baseCents > a.amountCents ? "Your plan discount applied" : null,
      };
    case "upgrade":
      return { kind: "upgrade", label: `Upgrade to ${a.upgradePlanName ?? "a plan"}`, note: null };
    case "apply":
      return { kind: "apply", label: "Apply", note: null };
    default:
      return { kind: "none", label: "Coming soon", note: null };
  }
}

/* --------------------------------------------------------- plan & savings */

export interface SavingsProgram {
  programId: string;
  slug: string;
  name: string;
  listCents: number | null;
  owned: boolean;
}
export interface SavingsPlan {
  id: string;
  name: string;
  rank: number;
  tagline: string | null;
  current: boolean;
  monthCents: number | null;
  yearCents: number | null;
  includes: SavingsProgram[];
  discounts: { slug: string; name: string; percent: number | null }[];
  /** À-la-carte purchases from the last 30 days that this plan includes: credited toward it. */
  creditCents: number;
}
export interface PlanSavings {
  plan: { id: string; name: string; rank: number } | null;
  owned: { programId: string; slug: string; name: string; paidCents: number | null; paidAt: string | null; listCents: number | null }[];
  plans: SavingsPlan[];
}

type SavingsRaw = {
  plan: PlanSavings["plan"];
  owned: { program_id: string; slug: string; name: string; paid_cents: number | null; paid_at: string | null; list_cents: number | null }[];
  plans: {
    id: string; name: string; rank: number; tagline: string | null; current: boolean; month_cents: number | null; year_cents: number | null;
    includes: { program_id: string; slug: string; name: string; list_cents: number | null; owned: boolean }[];
    discounts: { slug: string; name: string; percent: number | null }[];
    credit_cents: number;
  }[];
};

export function toPlanSavings(r: SavingsRaw): PlanSavings {
  return {
    plan: r.plan,
    owned: r.owned.map((o) => ({ programId: o.program_id, slug: o.slug, name: o.name, paidCents: o.paid_cents, paidAt: o.paid_at, listCents: o.list_cents })),
    plans: r.plans.map((p) => ({
      id: p.id, name: p.name, rank: p.rank, tagline: p.tagline, current: p.current, monthCents: p.month_cents, yearCents: p.year_cents,
      includes: p.includes.map((i) => ({ programId: i.program_id, slug: i.slug, name: i.name, listCents: i.list_cents, owned: i.owned })),
      discounts: p.discounts, creditCents: p.credit_cents ?? 0,
    })),
  };
}

/** Plan math for the You page: what the member's plan includes vs what they bought à la carte. */
export async function planSavings(sb: DB): Promise<PlanSavings | null> {
  const { data, error } = await rpc(sb, "my_plan_savings");
  if (error) throw new Error(`planSavings: ${error.message}`);
  return data ? toPlanSavings(data as SavingsRaw) : null;
}
