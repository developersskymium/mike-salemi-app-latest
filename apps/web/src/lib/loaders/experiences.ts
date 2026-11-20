import "server-only";
import { MOCK, fixture } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

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
}
export interface RetreatsData {
  program: { slug: string; name: string; tagline: string | null } | null;
  runs: RetreatCard[];
}

async function realRetreats(): Promise<RetreatsData> {
  const { supabase: sb, user } = await getUser();
  const { data: programs } = await sb.from("programs").select("id, slug, name, tagline").eq("type", "retreat").eq("status", "published").order("position");
  const ids = (programs ?? []).map((p) => p.id);
  if (!ids.length) return { program: null, runs: [] };
  const [{ data: runs }, { data: apps }] = await Promise.all([
    sb.from("program_runs").select("id, name, status, starts_at, ends_at, timezone, capacity, draft_note, details, location, gallery").in("program_id", ids).neq("status", "draft").neq("status", "cancelled").order("starts_at", { ascending: false }),
    user ? sb.from("run_applications").select("run_id, status").eq("user_id", user.id) : Promise.resolve({ data: [] as { run_id: string; status: string }[] }),
  ]);
  const mine = new Map((apps ?? []).map((a) => [a.run_id, a.status]));
  const p = programs![0]!;
  return {
    program: { slug: p.slug, name: p.name, tagline: p.tagline },
    runs: (runs ?? []).map((r) => {
      const d = (r.details ?? {}) as { season?: string; tagline?: string; cover?: string };
      const loc = (r.location ?? {}) as { label?: string; city?: string };
      const gallery = (r.gallery ?? []) as { url: string; stock?: boolean }[];
      return {
        id: r.id, name: r.name, status: r.status, starts_at: r.starts_at, ends_at: r.ends_at, timezone: r.timezone, capacity: r.capacity, draft_note: r.draft_note,
        season: d.season ?? null, tagline: d.tagline ?? null, cover: d.cover ?? gallery.find((g) => !g.stock)?.url ?? null, location: loc.label ?? loc.city ?? null,
        mine: mine.get(r.id) ?? null,
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
    hero: { url: string; alt: string } | null;
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
  if (MOCK) return fixture<ConceptProgram>(`commerce-concept-${slug}`).catch(() => null);
  return realConcept(slug);
}
