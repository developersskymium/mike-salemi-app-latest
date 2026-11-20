import "server-only";
import { unstable_rethrow } from "next/navigation";
import { MOCK, fixture } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { safePhoto } from "@/lib/covers";

/* ================================================================ Retreats index (legacy L24) */

export interface RetreatCard {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  draft_note: string | null;
  season: string | null;
  tagline: string | null;
  cover: string | null;
  location: string | null;
  /** The member's application status for this run, if any. */
  mine: string | null;
  /** Call booked / call done, so the card can show the right step. */
  mineCallAt?: string | null;
  mineCallDone?: boolean;
  track?: string | null;
  durationLabel?: string | null;
  /** Up to four real (non-stock) photos for the card carousel. */
  photos?: string[];
  price?: { amountCents: number; currency: string; compareLabel: string | null; draftNote: string | null } | null;
}
export interface RetreatsData {
  program: { slug: string; name: string; tagline: string | null } | null;
  runs: RetreatCard[];
  tracks?: { name: string; focus: string; venue: string }[];
  tracksDraftNote?: string | null;
  pillars?: string[];
  pillarsDraftNote?: string | null;
}

async function realRetreats(): Promise<RetreatsData> {
  const { supabase: sb, user } = await getUser();
  const { data: programs } = await sb.from("programs").select("id, slug, name, tagline, meta").eq("type", "retreat").eq("status", "published").order("position");
  const ids = (programs ?? []).map((p) => p.id);
  if (!ids.length) return { program: null, runs: [] };
  const [{ data: runs }, { data: apps }, { data: prep }] = await Promise.all([
    sb.from("program_runs").select("id, name, status, starts_at, ends_at, timezone, capacity, draft_note, details, location, gallery").in("program_id", ids).neq("status", "draft").neq("status", "cancelled").order("starts_at", { ascending: false }),
    user ? sb.from("run_applications").select("run_id, status, call_at, call_done_at").eq("user_id", user.id) : Promise.resolve({ data: [] as { run_id: string; status: string; call_at: string | null; call_done_at: string | null }[] }),
    sb.from("programs").select("meta").eq("slug", "men-of-movement").maybeSingle(),
  ]);
  const runIds = (runs ?? []).map((r) => r.id);
  const { data: prices } = runIds.length
    ? await sb.from("prices").select("ref_id, amount_cents, currency, draft_note").eq("kind", "run").in("ref_id", runIds).eq("interval", "one_time")
    : { data: [] as { ref_id: string; amount_cents: number; currency: string; draft_note: string | null }[] };
  const mine = new Map((apps ?? []).map((a) => [a.run_id, a]));
  const p = programs![0]!;
  const pmeta = (p.meta ?? {}) as { tracks?: { name: string; focus: string; venue: string }[]; tracks_draft_note?: string; pillars_draft_note?: string };
  return {
    program: { slug: p.slug, name: p.name, tagline: p.tagline },
    tracks: pmeta.tracks ?? [],
    tracksDraftNote: pmeta.tracks_draft_note ?? null,
    pillars: ((prep?.meta ?? {}) as { pillars?: string[] }).pillars ?? [],
    pillarsDraftNote: pmeta.pillars_draft_note ?? null,
    runs: (runs ?? []).map((r) => {
      const d = (r.details ?? {}) as { season?: string; tagline?: string; cover?: string; track?: string; duration_label?: string; price_compare_label?: string };
      const loc = (r.location ?? {}) as { label?: string; city?: string };
      const gallery = (r.gallery ?? []) as { url: string; stock?: boolean }[];
      const real = gallery.filter((g) => !g.stock).map((g) => g.url);
      const cover = d.cover ?? real[0] ?? null;
      const price = (prices ?? []).filter((x) => x.ref_id === r.id).sort((a, b) => a.amount_cents - b.amount_cents)[0];
      const a = mine.get(r.id);
      return {
        id: r.id, name: r.name, status: r.status, starts_at: r.starts_at, ends_at: r.ends_at, timezone: r.timezone, capacity: r.capacity, draft_note: r.draft_note,
        season: d.season ?? null, tagline: d.tagline ?? null, cover, location: loc.label ?? loc.city ?? null,
        mine: a?.status ?? null, mineCallAt: a?.call_at ?? null, mineCallDone: Boolean(a?.call_done_at),
        track: d.track ?? null, durationLabel: d.duration_label ?? null,
        photos: [...new Set([cover, ...real].filter(Boolean) as string[])].slice(0, 4),
        price: price ? { amountCents: price.amount_cents, currency: price.currency, compareLabel: d.price_compare_label ?? null, draftNote: price.draft_note } : null,
      };
    }).sort((a, b) => Number(a.status === "past") - Number(b.status === "past") || a.starts_at.localeCompare(b.starts_at)),
  };
}

/** Retreats index. Local preview: `fixtures/commerce-retreats.json` (real runs). */
export async function loadRetreats(): Promise<RetreatsData> {
  return MOCK ? fixture<RetreatsData>("commerce-retreats") : realRetreats();
}

/* ================================================================ Concept / experience program page (legacy L3) */

export interface ConceptSection { heading: string; body: string; points?: string[] }
export interface ConceptProgram {
  program: {
    id: string; slug: string; name: string; type: string; status: string; tagline: string | null; summary: string | null; description: string | null;
    highlights: string[]; format_label: string | null; duration_label: string | null; draft_note: string | null;
    price_label: string | null; commitment: string | null; route: string | null; route_label: string | null; note: string | null;
    sections: ConceptSection[]; faq: { q: string; a: string }[];
    hero: { url: string; alt: string; focal?: string; focalPhone?: string } | null;
  };
  /** Open runs of this program (live, challenge, retreat): the CTA goes to the soonest. */
  nextRun: { id: string; name: string; status: string } | null;
  others: { slug: string; name: string; tagline: string | null; type: string; image: string | null }[];
}

/** The lede only: concept descriptions carry their sections and FAQ as markdown, which the page renders from meta. */
export function lede(text: string | null, hasSections: boolean): string | null {
  if (!text) return null;
  const cut = hasSections ? text.split(/\n\s*##\s/)[0]! : text;
  return cut.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim() || null;
}

const KIND: Record<string, string> = { coaching: "Coaching", live: "Program", challenge: "Program", retreat: "Retreat", course: "Course", day_program: "Program", tool: "Tool", bundle: "Bundle" };
export const kindLabel = (t: string) => KIND[t] ?? "Program";
export const CONCEPT_TYPES = new Set(["coaching", "live", "challenge", "retreat"]);

async function realConcept(slug: string): Promise<ConceptProgram | null> {
  const { supabase: sb } = await getUser();
  const { data: p } = await sb.from("programs").select("*").eq("slug", slug).maybeSingle();
  if (!p || p.status === "archived") return null;
  const [{ data: media }, { data: runs }, { data: others }] = await Promise.all([
    sb.from("program_media").select("program_id, role, url, alt, position").order("position"),
    sb.from("program_runs").select("id, name, status, starts_at").eq("program_id", p.id).in("status", ["open", "waitlist", "upcoming", "full"]).order("starts_at"),
    sb.from("programs").select("id, slug, name, tagline, type, catalog_group").eq("status", "published").eq("is_listed", true).neq("id", p.id).order("position"),
  ]);
  const img = (pid: string) => {
    const m = (media ?? []).filter((x) => x.program_id === pid);
    return m.find((x) => x.role === "hero") ?? m.find((x) => x.role === "card") ?? m[0] ?? null;
  };
  const meta = (p.meta ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : null);
  const hero = img(p.id);
  const sections = Array.isArray(meta.sections) ? (meta.sections as ConceptSection[]) : [];
  const same = (others ?? []).filter((o) => o.catalog_group === p.catalog_group);
  const pick = [...same, ...(others ?? []).filter((o) => o.catalog_group !== p.catalog_group)].slice(0, 3);
  return {
    program: {
      id: p.id, slug: p.slug, name: p.name, type: p.type, status: p.status, tagline: p.tagline, summary: p.summary, description: lede(p.description, sections.length > 0),
      highlights: p.highlights ?? [], format_label: p.format_label, duration_label: p.duration_label, draft_note: p.draft_note,
      price_label: str("price_label"), commitment: str("commitment") ?? p.duration_label, route: str("route"), route_label: str("route_label"), note: str("note"),
      sections,
      faq: Array.isArray(meta.faq) ? (meta.faq as { q: string; a: string }[]) : [],
      hero: hero ? { url: hero.url, alt: hero.alt } : null,
    },
    nextRun: runs?.[0] ? { id: runs[0].id, name: runs[0].name, status: runs[0].status } : null,
    others: pick.map((o) => ({ slug: o.slug, name: o.name, tagline: o.tagline, type: o.type, image: img(o.id)?.url ?? null })),
  };
}

/** Program detail for coaching / live / challenge / retreat programs. Local preview: `fixtures/commerce-concept-<slug>.json`. */
export async function loadConceptProgram(slug: string): Promise<ConceptProgram | null> {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const data = MOCK ? await fixture<ConceptProgram>(`commerce-concept-${slug}`).catch(() => null) : await realConcept(slug);
  return data ? withPhotos(data) : null;
}

/**
 * Summit photo rule for concept pages: the hero and the "Keep looking" cards never show a title card,
 * a black-and-white/graded photo or a stock stranger; those fall back to the program's photo of Mike.
 */
function withPhotos(d: ConceptProgram): ConceptProgram {
  const hero = safePhoto(d.program.hero?.url, d.program.slug, d.program.hero?.alt);
  return {
    ...d,
    program: { ...d.program, hero: { url: hero.src, alt: hero.alt || d.program.name, focal: hero.focal, focalPhone: hero.focalPhone } },
    others: d.others.map((o) => ({ ...o, image: safePhoto(o.image, o.slug).src })),
  };
}

/* ================================================================ Home: the member's retreat journey */

export interface RetreatJourney {
  runId: string;
  name: string;
  cover: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  runStatus: string;
  location: string | null;
  application: { status: string; call_at: string | null; call_done_at: string | null };
  checklist: { done: number; total: number };
}

async function realJourney(): Promise<RetreatJourney | null> {
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const { data } = await sb.rpc("my_experiences");
  const runs = ((data ?? {}) as { runs?: { run_id: string; status: string; ends_at: string | null; starts_at: string; phase: string; checklist: { done: number; total: number } }[] }).runs ?? [];
  const now = Date.now();
  // The live or next retreat first; a finished one stays for two weeks (integration).
  const pick = runs
    .filter((r) => !["declined", "cancelled"].includes(r.status))
    .filter((r) => r.phase !== "after" || (r.ends_at && now - Date.parse(r.ends_at) < 14 * 86400000 && r.status === "booked"))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  if (!pick) return null;
  const [{ data: run }, { data: app }] = await Promise.all([
    sb.from("program_runs").select("id, name, starts_at, ends_at, timezone, status, details, location, gallery").eq("id", pick.run_id).maybeSingle(),
    sb.from("run_applications").select("status, call_at, call_done_at").eq("run_id", pick.run_id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!run || !app) return null;
  const d = (run.details ?? {}) as { cover?: string };
  const loc = (run.location ?? {}) as { city?: string; label?: string };
  return {
    runId: run.id, name: run.name, cover: d.cover ?? ((run.gallery ?? []) as { url: string; stock?: boolean }[]).find((g) => !g.stock)?.url ?? null,
    startsAt: run.starts_at, endsAt: run.ends_at, timezone: run.timezone, runStatus: run.status, location: loc.city ?? loc.label ?? null,
    application: { status: app.status, call_at: app.call_at, call_done_at: app.call_done_at },
    checklist: pick.checklist,
  };
}

/** The member's live or next retreat for Home (null when there is none). Local preview: `commerce-journey.json`. */
export async function loadRetreatJourney(): Promise<RetreatJourney | null> {
  try {
    if (MOCK) return await fixture<RetreatJourney | null>("commerce-journey").catch(() => null);
    return await realJourney();
  } catch (e) {
    unstable_rethrow(e);
    return null;
  }
}
