import "server-only";
import { hasAccess, type Offer, type OfferContext } from "@ms/api";
import { mockPersona } from "@/lib/access";

/**
 * Local preview mirror of the offers engine (0024 get_offer): the same seeded rules, evaluated
 * against the fixture persona. One offer per placement, highest priority first; caps/dismissals
 * are server-side only (not simulated).
 */
type Rule = {
  id: string; priority: number; placements: string[];
  when: (p: Awaited<ReturnType<typeof mockPersona>>, ctx: Record<string, unknown>) => boolean;
  target: { kind: Offer["target_kind"]; ref: string; slug?: string; name?: string };
  headline: string; body: string; cta: string; reason: string;
};

const has = (p: Awaited<ReturnType<typeof mockPersona>>, slug: string) => hasAccess(p.states.find((s) => s.slug === slug) ? { state: p.states.find((s) => s.slug === slug)!.state } : null);
const owns = (p: Awaited<ReturnType<typeof mockPersona>>) => p.states.filter((s) => s.state === "owned").length;
const viewing = (ctx: Record<string, unknown>, ...slugs: string[]) => typeof ctx.program_id === "string" && slugs.includes(ctx.program_id);

const RULES: Rule[] = [
  { id: "00000000-0000-4000-8000-0000000000a1", priority: 5, placements: ["today", "day_complete"], when: (p) => p.readinessLow && !has(p, "working-in"),
    target: { kind: "program", ref: "working-in", slug: "working-in", name: "Working-In" }, headline: "Recover with Working-In", body: "Short, calm sessions with Paul Chek and Mike that rebuild energy instead of spending it.", cta: "See Working-In", reason: "Because your readiness was low twice this week" },
  { id: "00000000-0000-4000-8000-0000000000a2", priority: 6, placements: ["today"], when: (p) => p.readinessLow && has(p, "working-in"),
    target: { kind: "url", ref: "/programs/working-in/course/resume" }, headline: "Take a Working-In day", body: "Swap today's session for 15 minutes of restorative work. Training will still be here tomorrow.", cta: "Open Working-In", reason: "Because your readiness was low twice this week" },
  { id: "00000000-0000-4000-8000-0000000000a3", priority: 8, placements: ["today", "program_complete"], when: (p) => owns(p) >= 2 && p.plan !== "max",
    target: { kind: "plan", ref: "max", name: "Max" }, headline: "Your programs, plus everything else", body: "Max includes what you bought and every other program. Purchases from the last 30 days count toward your first payment.", cta: "See plan math", reason: "Because you own 2 programs" },
  { id: "00000000-0000-4000-8000-0000000000a4", priority: 12, placements: ["today", "program_complete", "tool_result"], when: (p) => p.states.some((s) => s.state === "free" && s.completed) && !has(p, "kettlebell-lifestyle"),
    target: { kind: "program", ref: "kettlebell-lifestyle", slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle" }, headline: "Your next step: Kettlebell Lifestyle", body: "A day-by-day plan that adapts to how you feel. Day 1 is open: try it free.", cta: "Try Day 1", reason: "Because you finished a free series" },
  { id: "00000000-0000-4000-8000-0000000000a5", priority: 25, placements: ["today", "program_complete"], when: (p) => p.streakWeeks >= 4,
    target: { kind: "url", ref: "/coaching" }, headline: "Review your progress with Mike", body: "A 45-minute 1:1 on Tuesdays: what's working, what to change, and your next block.", cta: "Book a call", reason: "Because you've trained 4 weeks in a row" },
  { id: "00000000-0000-4000-8000-0000000000b1", priority: 40, placements: ["program_page"], when: (p, c) => viewing(c, "kettlebell-lifestyle") && !has(p, "mastering-the-kettlebell"),
    target: { kind: "program", ref: "mastering-the-kettlebell", slug: "mastering-the-kettlebell", name: "Mastering the Kettlebell" }, headline: "Mastering the Kettlebell", body: "Technique fixes for every lift you train in Kettlebell Lifestyle.", cta: "See the course", reason: "Pairs well with Kettlebell Lifestyle" },
  { id: "00000000-0000-4000-8000-0000000000b2", priority: 40, placements: ["program_page"], when: (p, c) => viewing(c, "mastering-the-kettlebell") && !has(p, "athleticism-4-life"),
    target: { kind: "program", ref: "athleticism-4-life", slug: "athleticism-4-life", name: "Athleticism 4 Life" }, headline: "Athleticism 4 Life", body: "Put your technique to work: a strength and power block.", cta: "See the program", reason: "Pairs well with Mastering the Kettlebell" },
  { id: "00000000-0000-4000-8000-0000000000b3", priority: 40, placements: ["program_page"], when: (p, c) => viewing(c, "athleticism-4-life") && !has(p, "working-in"),
    target: { kind: "program", ref: "working-in", slug: "working-in", name: "Working-In" }, headline: "Working-In", body: "Restorative sessions that balance hard training days.", cta: "See the program", reason: "Pairs well with Athleticism 4 Life" },
  { id: "00000000-0000-4000-8000-0000000000b4", priority: 40, placements: ["program_page"], when: (p, c) => viewing(c, "working-in") && !has(p, "kettlebell-lifestyle"),
    target: { kind: "program", ref: "kettlebell-lifestyle", slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle" }, headline: "Kettlebell Lifestyle", body: "Daily training that adapts to your readiness, the work to Working-In's rest.", cta: "See the program", reason: "Pairs well with Working-In" },
  { id: "00000000-0000-4000-8000-0000000000b5", priority: 40, placements: ["program_page"], when: (p, c) => viewing(c, "what-your-kettlebell-swing-is-missing", "free-6-video-kettlebell-mini-series", "kettlebell-roadmap") && !has(p, "kettlebell-lifestyle"),
    target: { kind: "program", ref: "kettlebell-lifestyle", slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle" }, headline: "Kettlebell Lifestyle", body: "The full day-by-day program. Day 1 is open to try.", cta: "Try Day 1", reason: "The next step after the free series" },
  { id: "00000000-0000-4000-8000-0000000000b6", priority: 41, placements: ["program_page"], when: (_p, c) => viewing(c, "the-path-to-inspired-action", "kettlebell-lifestyle", "mastering-the-kettlebell", "athleticism-4-life", "working-in"),
    target: { kind: "url", ref: "/coaching" }, headline: "1:1 coaching with Mike", body: "A 45-minute session on Tuesdays to review your training and plan the next block.", cta: "See coaching", reason: "Pairs well with this program" },
];

export async function mockOffer(placement: string, context: OfferContext): Promise<Offer | null> {
  const p = await mockPersona();
  const ctx = context as Record<string, unknown>;
  const r = [...RULES].sort((a, b) => a.priority - b.priority).find((x) => x.placements.includes(placement) && x.when(p, ctx));
  if (!r) return null;
  return {
    id: r.id, placement, headline: r.headline, body: r.body, cta_label: r.cta, image_url: null, target_kind: r.target.kind, target_ref: r.target.ref,
    priority: r.priority, coupon_code: null, reason: r.reason,
    target: r.target.kind === "program" ? { slug: r.target.slug, name: r.target.name } : r.target.kind === "plan" ? { id: r.target.ref, name: r.target.name } : { url: r.target.ref },
  };
}
