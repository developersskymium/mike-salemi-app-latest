import { coverFor, hasCover } from "@/lib/covers";
import type { CatalogProgram, PricingPlan } from "@ms/api";

export type AccessChip = { label: "Free" | "Included" | "Owned" | "Locked" | "Draft" | "Preview"; icon?: "lock" | "check" | "sparkle" };

/** Draft notes that mean "not final yet" (as opposed to editorial notes). */
const DRAFTY = /await|concept|draft|tbc/i;

export function isDraft(p: Pick<CatalogProgram, "draftNote">) {
  return Boolean(p.draftNote && DRAFTY.test(p.draftNote));
}

/** Access chip for a program card: Free · Included · Owned · Locked · Draft. */
export function accessChip(p: Pick<CatalogProgram, "access" | "draftNote">): AccessChip {
  if (isDraft(p) && (p.access === "locked" || p.access === "preview")) return { label: "Draft", icon: "sparkle" };
  switch (p.access) {
    case "free":
      return { label: "Free" };
    case "included":
    case "org":
      return { label: "Included", icon: "check" };
    case "owned":
      return { label: "Owned", icon: "check" };
    case "preview":
      return { label: "Preview" };
    default:
      return { label: "Locked", icon: "lock" };
  }
}

export function canOpen(p: Pick<CatalogProgram, "access">) {
  return p.access === "free" || p.access === "included" || p.access === "owned" || p.access === "org";
}

/** The program's card photo (card → hero → first). */
/** Card photo: the program's own media unless it is a title card (text baked in), with its focal point (lib/covers). */
export function programPhoto(p: Pick<CatalogProgram, "media" | "name" | "slug">) {
  const m = p.media.find((x) => x.role === "card") ?? p.media.find((x) => x.role === "hero") ?? p.media[0];
  if (!m && !hasCover(p.slug)) return null;
  const c = coverFor(p.slug, m?.url ?? null);
  return { src: c.src, alt: m?.alt || c.alt || p.name, position: c.focal };
}

export function heroPhoto(p: Pick<CatalogProgram, "media" | "name" | "slug">) {
  const m = p.media.find((x) => x.role === "hero") ?? p.media.find((x) => x.role === "card") ?? p.media[0];
  if (!m && !hasCover(p.slug)) return null;
  const c = coverFor(p.slug, m?.url ?? null);
  return { src: c.src, alt: m?.alt || c.alt || p.name, position: c.focal };
}

const TYPE_LABEL: Record<string, string> = {
  day_program: "Day-by-day program",
  course: "Video course",
  challenge: "Group challenge",
  live: "Live program",
  retreat: "Retreat",
  coaching: "Coaching",
  tool: "Free tool",
};

/** One line under the title: the outcome (tagline or summary). */
export function outcomeLine(p: Pick<CatalogProgram, "tagline" | "summary">) {
  return p.tagline ?? p.summary ?? null;
}

/** Short meta: format · who it's for. */
export function metaLine(p: Pick<CatalogProgram, "formatLabel" | "durationLabel" | "audience" | "type" | "paths">) {
  const parts = [p.formatLabel ?? TYPE_LABEL[p.type] ?? null];
  if (p.paths.length > 1 && p.paths[0]?.kind === "level") parts.push(`${p.paths.length} levels`);
  else if (p.paths.length > 1) parts.push(`${p.paths.length} focus paths`);
  if (p.audience) parts.push(p.audience);
  return parts.filter(Boolean).join(" · ");
}

export function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** Chip for visitors: Free, Draft, or the lightest paid plan that includes it. */
export function publicChip(p: CatalogProgram, plans: PricingPlan[]): { label: string; icon?: "lock" | "check" | "sparkle" } {
  if (p.isFree || p.access === "free") return { label: "Free" };
  if (isDraft(p)) return { label: "Draft", icon: "sparkle" };
  const plan = includedIn(p.id, plans);
  if (plan) return { label: `In ${plan.name}`, icon: "check" };
  return { label: TYPE_LABEL[p.type] ?? "Program" };
}

/** Lightest paid plan whose benefits include the program. */
export function includedIn(programId: string, plans: PricingPlan[]) {
  return [...plans]
    .filter((pl) => pl.prices.length && pl.benefits.some((b) => b.programId === programId && b.benefit === "included"))
    .sort((a, b) => a.rank - b.rank)[0];
}
