import type { AccessState, LearningMode, ProgramType } from "@ms/core";
import type { DB, Tables } from "./client";

export interface CatalogProgram {
  id: string;
  slug: string;
  name: string;
  type: ProgramType;
  tagline: string | null;
  audience: string | null;
  summary: string | null;
  formatLabel: string | null;
  durationLabel: string | null;
  level: string | null;
  catalogGroup: string;
  isFree: boolean;
  draftNote: string | null;
  modes: LearningMode[];
  paths: { id: string; key: string | null; name: string; shortName: string | null; kind: string; position: number }[];
  media: { role: string; url: string; alt: string }[];
  access: AccessState;
  position: number;
  /** Ticked outcome lines (programs.highlights). */
  highlights: string[];
  /** Merchandising from programs.meta (Studio): card badge, offer line, CTA label, instructor, catalog vertical, featured on Home. */
  badge: string | null;
  offer: string | null;
  ctaLabel: string | null;
  instructor: string | null;
  vertical: string | null;
  featured: boolean;
  priceLabel: string | null;
  sectionCount: number;
  lessonCount: number;
}

type ProgramRow = Tables<"programs"> & {
  program_modes: Pick<Tables<"program_modes">, "mode" | "is_default">[];
  program_paths: Pick<Tables<"program_paths">, "id" | "key" | "name" | "short_name" | "kind" | "position">[];
  program_media: Pick<Tables<"program_media">, "role" | "url" | "alt" | "position">[];
  sections?: { count: number }[];
  lessons?: { count: number }[];
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function toCatalog(p: ProgramRow, access: Map<string, string>): CatalogProgram {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    tagline: p.tagline,
    audience: p.audience,
    summary: p.summary,
    formatLabel: p.format_label,
    durationLabel: p.duration_label,
    level: p.level,
    catalogGroup: p.catalog_group,
    isFree: p.is_free,
    draftNote: p.draft_note,
    modes: p.program_modes.sort((a, b) => Number(b.is_default) - Number(a.is_default)).map((m) => m.mode),
    paths: p.program_paths
      .sort((a, b) => a.position - b.position)
      .map((x) => ({ id: x.id, key: x.key, name: x.name, shortName: x.short_name, kind: x.kind, position: x.position })),
    media: p.program_media.sort((a, b) => a.position - b.position).map((m) => ({ role: m.role, url: m.url, alt: m.alt })),
    access: ((access.get(p.id) as AccessState | undefined) ?? (p.is_free ? "free" : "locked")),
    position: p.position,
    highlights: p.highlights ?? [],
    ...merch((p.meta ?? {}) as Record<string, unknown>),
    sectionCount: p.sections?.[0]?.count ?? 0,
    lessonCount: p.lessons?.[0]?.count ?? 0,
  };
}

function merch(meta: Record<string, unknown>) {
  return {
    badge: str(meta.badge),
    offer: str(meta.offer) ?? str(meta.offer_line),
    ctaLabel: str(meta.ctaLabel) ?? str(meta.cta_label),
    instructor: str(meta.instructor),
    vertical: str(meta.vertical) ?? str(meta.catalogGroup),
    featured: meta.featured === true,
    priceLabel: str(meta.price_label),
  };
}

const PROGRAM_SELECT =
  "*, program_modes(mode, is_default), program_paths(id, key, name, short_name, kind, position), program_media(role, url, alt, position), sections(count), lessons(count)";

/** Every published program with its access state for the current member (works signed out too). */
export async function getCatalog(sb: DB, opts: { listedOnly?: boolean } = {}): Promise<CatalogProgram[]> {
  let q = sb.from("programs").select(PROGRAM_SELECT).eq("status", "published");
  if (opts.listedOnly) q = q.eq("is_listed", true);
  const [{ data, error }, states] = await Promise.all([q.order("position"), sb.rpc("program_access_states")]);
  if (error) throw new Error(`catalog: ${error.message}`);
  const access = new Map((states.data ?? []).map((s) => [s.program_id, s.state]));
  return ((data ?? []) as unknown as ProgramRow[]).map((p) => toCatalog(p, access));
}

/** One program by slug with description and highlights. */
export async function getProgram(sb: DB, slug: string) {
  const [{ data, error }, states] = await Promise.all([
    sb.from("programs").select(PROGRAM_SELECT).eq("slug", slug).maybeSingle(),
    sb.rpc("program_access_states"),
  ]);
  if (error) throw new Error(`program: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as ProgramRow;
  const access = new Map((states.data ?? []).map((s) => [s.program_id, s.state]));
  return {
    ...toCatalog(row, access),
    description: row.description,
    highlights: row.highlights,
    sectionLabel: row.section_label,
    lessonLabel: row.lesson_label,
    sequenceLocked: row.sequence_locked,
  };
}

export interface OutlineStat {
  program_id: string;
  path_id: string | null;
  sections: number;
  lessons: number;
  first_lesson_id: string | null;
  first_lesson_title: string | null;
}

type UntypedRpc = { rpc: (f: string, a?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

/** Size and first lesson of every published program (per level path where the program has levels). See 0016_w1_home_library.sql. */
export async function programOutlineStats(sb: DB): Promise<OutlineStat[]> {
  const { data, error } = await (sb as unknown as UntypedRpc).rpc("program_outline_stats");
  if (error) throw new Error(`outline: ${error.message}`);
  return (data ?? []) as OutlineStat[];
}
