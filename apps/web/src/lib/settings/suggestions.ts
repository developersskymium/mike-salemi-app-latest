import "server-only";
import { cookies } from "next/headers";
import type { ProgramAccess } from "@ms/api";
import { money } from "@/components/commerce/format";
import { getAccessMap } from "@/lib/access";
import { MOCK } from "@/lib/mock";
import { programCover } from "@/lib/photos";
import { programPhoto } from "@/lib/program-photos";
import { MOCK_SUGGEST_COOKIE, SUGGESTABLE } from "./model";

/** What it takes to start a program, in one or two words: Free · Included · Owned · Buy · $X · Upgrade to Pro · Apply. */
export type SuggestAccess = { label: string; tone: "open" | "buy" | "upgrade" };

export function accessLabel(a: ProgramAccess | null | undefined): SuggestAccess {
  if (!a) return { label: "Free", tone: "open" };
  switch (a.state) {
    case "free":
      return { label: "Free", tone: "open" };
    case "included":
      return { label: "Included", tone: "open" };
    case "owned":
      return { label: "Owned", tone: "open" };
    case "buy":
      return { label: a.amountCents != null ? `Buy · ${money(a.amountCents, a.currency)}` : "Buy", tone: "buy" };
    case "upgrade":
      return { label: a.upgradePlanName ? `Upgrade to ${a.upgradePlanName}` : "Upgrade", tone: "upgrade" };
    case "apply":
      return { label: "Apply", tone: "buy" };
    default:
      return { label: "Coming soon", tone: "buy" };
  }
}

/** Access words for every program onboarding can suggest. */
export async function suggestAccess(): Promise<Record<string, SuggestAccess>> {
  const map = await getAccessMap();
  return Object.fromEntries(Object.keys(SUGGESTABLE).map((slug) => [slug, accessLabel(map.get(slug))]));
}

export type Photo = { src: string; position: string; alt: string };

/** The real cover for a program (program_media framing), falling back to its program photo. */
export function suggestPhoto(slug: string): Photo {
  const c = programCover(slug);
  return c ? { src: c.src, position: c.focal, alt: c.alt } : programPhoto(slug);
}

export interface SuggestedProgram {
  slug: string;
  title: string;
  reason: string;
  href: string;
  photo: Photo;
  access: SuggestAccess;
  enrolled: boolean;
}

type Stored = { slug?: unknown; reason?: unknown }[];

/**
 * Home's "Suggested for you" row: the ranked onboarding suggestions (profiles.onboarding.suggestions),
 * or only the best fit (onboarding.recommended) for members who finished before suggestions existed.
 * Local preview reads them from a cookie.
 */
export async function loadSuggestions(onboarding: { suggestions?: unknown; recommended?: unknown } | null | undefined): Promise<SuggestedProgram[]> {
  let raw: Stored = Array.isArray(onboarding?.suggestions) ? (onboarding!.suggestions as Stored) : [];
  if (!raw.length && typeof onboarding?.recommended === "string") raw = [{ slug: onboarding.recommended, reason: "" }];
  if (MOCK && !raw.length) {
    try {
      const c = (await cookies()).get(MOCK_SUGGEST_COOKIE)?.value;
      if (c) raw = JSON.parse(c) as Stored;
    } catch {
      raw = [];
    }
  }
  const list = raw.filter((x) => typeof x?.slug === "string" && SUGGESTABLE[x.slug as string]).slice(0, 3);
  if (!list.length) return [];
  const map = await getAccessMap();
  return list.map((x) => {
    const slug = x.slug as string;
    const a = map.get(slug);
    return {
      slug,
      title: SUGGESTABLE[slug]!.title,
      reason: typeof x.reason === "string" ? x.reason : "",
      href: `/programs/${slug}`,
      photo: suggestPhoto(slug),
      access: accessLabel(a),
      enrolled: Boolean(a?.enrolled || a?.started),
    };
  });
}
