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
}

type ProgramRow = Tables<"programs"> & {
  program_modes: Pick<Tables<"program_modes">, "mode" | "is_default">[];
  program_paths: Pick<Tables<"program_paths">, "id" | "key" | "name" | "short_name" | "kind" | "position">[];
  program_media: Pick<Tables<"program_media">, "role" | "url" | "alt" | "position">[];
};

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
  };
}

const PROGRAM_SELECT =
  "*, program_modes(mode, is_default), program_paths(id, key, name, short_name, kind, position), program_media(role, url, alt, position)";

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
