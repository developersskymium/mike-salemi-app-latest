import type { LibraryIndex, LibraryIndexVideo } from "@ms/api";
import type { MoveName } from "@/components/graphics";

/* Library model (legacy src/routes/_authenticated/library.index.tsx): level → category → tag cascade,
   saved, "In the program", search tokens, sort, source tabs. Pure, shared by the page and tests. */

export type Sort = "program" | "title-asc" | "title-desc" | "in-program-first" | "level";
export type Source = "all" | "videos" | "programs";

export const SORTS: { value: Sort; label: string }[] = [
  { value: "program", label: "Program order" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "in-program-first", label: "In the program first" },
  { value: "level", label: "By level" },
];

export const SOURCES: { value: Source; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "videos", label: "Technique videos" },
  { value: "programs", label: "Program lessons" },
];

/** Order of the level chips (legacy libraryLevels). */
const LEVEL_ORDER = ["on-ramp", "phase-1", "phase-2", "phase-3", "level-1", "level-2"];

export interface LibState {
  q: string;
  level: string; // "all" or a level slug
  cats: string[]; // category slugs (any)
  tags: string[]; // topic slugs (all)
  sort: Sort;
  saved: boolean;
  inProgram: boolean;
  source: Source;
}

export const EMPTY: LibState = { q: "", level: "all", cats: [], tags: [], sort: "program", saved: false, inProgram: false, source: "all" };

export type Term = { slug: string; name: string };

export const cleanTitle = (t: string) => t.replace(/^\*+|\*+$/g, "").replace(/\*\*/g, "").trim();

const slugsOf = (v: LibraryIndexVideo, ns: string) => v.g.filter((k) => k.startsWith(`${ns}:`)).map((k) => k.slice(ns.length + 1));

export function levelsOf(v: LibraryIndexVideo) {
  return slugsOf(v, "level");
}
export function catsOf(v: LibraryIndexVideo) {
  return slugsOf(v, "category");
}
export function topicsOf(v: LibraryIndexVideo) {
  return slugsOf(v, "topic");
}

export function terms(index: LibraryIndex) {
  const by = (ns: string) => index.tags.filter((t) => t.ns === ns).map((t) => ({ slug: t.slug, name: t.name }));
  const levels = by("level").sort((a, b) => rank(a.slug) - rank(b.slug));
  return { levels, categories: by("category").sort((a, b) => rank(a.slug) - rank(b.slug)), topics: by("topic") };
}

function rank(slug: string) {
  const i = LEVEL_ORDER.indexOf(slug);
  return i === -1 ? LEVEL_ORDER.length : i;
}

/** Categories that occur inside the chosen level. */
export function categoriesFor(videos: LibraryIndexVideo[], all: Term[], level: string) {
  if (level === "all") return all;
  const ids = new Set(videos.filter((v) => levelsOf(v).includes(level)).flatMap(catsOf));
  return all.filter((c) => ids.has(c.slug));
}

/** Tags that occur inside the chosen level + categories. */
export function tagsFor(videos: LibraryIndexVideo[], all: Term[], level: string, cats: string[]) {
  const ids = new Set(
    videos
      .filter((v) => (level === "all" || levelsOf(v).includes(level)) && (!cats.length || cats.some((c) => catsOf(v).includes(c))))
      .flatMap(topicsOf),
  );
  return all.filter((t) => ids.has(t.slug));
}

/** Technique videos = the tagged KBL library; Everything adds every program lesson video. */
export const isTechnique = (v: LibraryIndexVideo) => v.g.length > 0;

export function filterSort(videos: LibraryIndexVideo[], s: LibState, names: Map<string, string>, savedOverride: Record<string, boolean>) {
  const tokens = s.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = videos.filter((v) => {
    if (s.source === "videos" && !isTechnique(v)) return false;
    const saved = savedOverride[v.id] ?? v.s;
    if (s.saved && !saved) return false;
    if (s.level !== "all" && !levelsOf(v).includes(s.level)) return false;
    if (s.cats.length && !s.cats.some((c) => catsOf(v).includes(c))) return false;
    if (s.tags.length && !s.tags.every((t) => topicsOf(v).includes(t))) return false;
    if (s.inProgram && !v.ip) return false;
    if (!tokens.length) return true;
    const hay = `${v.t} ${v.g.map((k) => names.get(k) ?? k).join(" ")}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
  switch (s.sort) {
    case "title-asc":
      return list.sort((a, b) => cleanTitle(a.t).localeCompare(cleanTitle(b.t)));
    case "title-desc":
      return list.sort((a, b) => cleanTitle(b.t).localeCompare(cleanTitle(a.t)));
    case "in-program-first":
      return list.sort((a, b) => Number(b.ip) - Number(a.ip) || a.o - b.o);
    case "level": {
      const r = (v: LibraryIndexVideo) => Math.min(...levelsOf(v).map(rank), LEVEL_ORDER.length);
      return list.sort((a, b) => r(a) - r(b) || cleanTitle(a.t).localeCompare(cleanTitle(b.t)));
    }
    default:
      return list.sort((a, b) => a.o - b.o || a.t.localeCompare(b.t));
  }
}

/* ------------------------------------------------------------ URL state */

export function fromParams(sp: Record<string, string | undefined>): LibState {
  const list = (v?: string) => (v ? v.split(",").map((x) => x.replace(/^(topic|category|level):/, "")).filter(Boolean).slice(0, 12) : []);
  const sort = SORTS.some((x) => x.value === sp.sort) ? (sp.sort as Sort) : "program";
  const source = SOURCES.some((x) => x.value === sp.src) ? (sp.src as Source) : "all";
  return {
    q: (sp.q ?? "").slice(0, 80),
    level: sp.level?.replace(/^level:/, "") || "all",
    cats: list(sp.cat),
    tags: list(sp.tags),
    sort,
    saved: sp.saved === "1",
    inProgram: sp.inprog === "1",
    source,
  };
}

export function toQuery(s: LibState, playing: string | null) {
  const sp = new URLSearchParams();
  if (s.q.trim()) sp.set("q", s.q.trim());
  if (s.level !== "all") sp.set("level", s.level);
  if (s.cats.length) sp.set("cat", s.cats.join(","));
  if (s.tags.length) sp.set("tags", s.tags.join(","));
  if (s.sort !== "program") sp.set("sort", s.sort);
  if (s.saved) sp.set("saved", "1");
  if (s.inProgram) sp.set("inprog", "1");
  if (s.source !== "all") sp.set("src", s.source);
  if (playing) sp.set("v", playing);
  return sp.toString();
}

/* ------------------------------------------------------------ posters */

const TOPIC_MOVE: Record<string, MoveName> = {
  swing: "swing", clean: "clean", press: "press", "push-press": "press", "turkish-get-up": "getup", squat: "squat", lunge: "lunge",
  row: "row", deadlift: "deadlift", halo: "halo", windmill: "getup", stretching: "breathing", "working-in": "breathing", "bodyweight-warm-ups": "walking",
};

export function moveOf(v: Pick<LibraryIndexVideo, "g" | "t">): MoveName {
  for (const k of v.g) {
    const m = TOPIC_MOVE[k.split(":")[1] ?? ""];
    if (m) return m;
  }
  const t = v.t.toLowerCase();
  for (const [k, m] of Object.entries(TOPIC_MOVE)) if (t.includes(k.replace(/-/g, " "))) return m;
  if (/breath|bolt/.test(t)) return "breathing";
  return "swing";
}

export function clock(s: number | null | undefined) {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/* ------------------------------------------------------------ saved views (P2, this device) */

export type SavedView = { id: string; name: string; state: LibState };
export const VIEWS_KEY = "ms:library:views";
