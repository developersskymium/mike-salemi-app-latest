import type { CatalogProgram } from "@ms/api";
import type { Enrollment } from "@/lib/loaders/discover";

/**
 * Smart, non-pushy recommendations (spec 10 §8): every reason is tied to what the member is
 * actually doing (their Kettlebell Lifestyle phase, what they already own, what they finished).
 * Returns a reason per program and the single "best next step".
 */
export type Reco = { reason: string; score: number };

const KBL = "kettlebell-lifestyle";

export function recommend(catalog: CatalogProgram[], enrollments: Enrollment[]): { reasons: Map<string, Reco>; best: string | null } {
  const bySlug = new Map(enrollments.map((e) => [e.program_slug, e]));
  const kbl = enrollments.filter((e) => e.program_slug === KBL).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0];
  const kblActive = Boolean(kbl && !kbl.completed_at);
  const kblPct = kbl && kbl.lessons_total ? kbl.lessons_done / kbl.lessons_total : 0;
  const phase = kbl?.current_section_title?.trim() || null;
  const level = kbl?.path_name?.split("·")[0]?.trim() || "Level I";
  const reasons = new Map<string, Reco>();
  const set = (slug: string, reason: string, score: number) => {
    if (catalog.some((p) => p.slug === slug)) reasons.set(slug, { reason, score });
  };

  // Programs the member is already in: no pitch, just where they are.
  if (!bySlug.has("mastering-the-kettlebell")) {
    set("mastering-the-kettlebell", kblActive && phase ? `Matched to the ${phase} lifts you're training now` : "Every lift broken down, with a fix for each common error", kblActive ? 92 : 60);
  }
  if (!bySlug.has("what-your-kettlebell-swing-is-missing")) {
    set("what-your-kettlebell-swing-is-missing", kblActive ? "Free · tighten your swing set-up before the next heavy day" : "Free · the 7-step set-up Mike sends every new swinger", kblActive ? 84 : 70);
  }
  if (!bySlug.has("working-in")) set("working-in", kblActive ? "Pairs with every Recovery Day in your plan" : "Short sessions that restore energy instead of draining it", kblActive ? 78 : 50);
  if (!bySlug.has("athleticism-4-life")) set("athleticism-4-life", kblPct > 0.5 || kbl?.completed_at ? `Built for after ${level}: power and conditioning blocks` : "Thirty days of bag and kettlebell conditioning", kblPct > 0.5 ? 76 : 40);
  if (!bySlug.has("free-6-video-kettlebell-mini-series")) set("free-6-video-kettlebell-mini-series", "Free · six videos that sharpen a coach's eye", 38);
  if (!bySlug.has("the-path-to-inspired-action")) set("the-path-to-inspired-action", "Ten weeks of inner work alongside your training", 32);
  if (!bySlug.has("men-of-movement-retreats")) set("men-of-movement-retreats", kblPct > 0.3 ? "The in-person summit of the path you're on" : "Four days on Mount Shasta with Mike", kblPct > 0.3 ? 55 : 30);
  if (!bySlug.has("coaching")) set("coaching", "Stuck on a lift? Mike reviews your own footage", 34);

  let best: string | null = null;
  let top = 0;
  for (const [slug, r] of reasons) {
    const p = catalog.find((x) => x.slug === slug);
    if (!p || /draft/i.test(p.draftNote ?? "") || r.score <= top) continue;
    best = slug;
    top = r.score;
  }
  return { reasons, best: top >= 50 ? best : null };
}
