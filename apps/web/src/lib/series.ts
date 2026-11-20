/**
 * Signature navigation for the journeys-b programs (spec 11, client feedback 2 + 13): Working-In,
 * The Path to Inspired Action (→ The Grounded King), Men of Movement preparation, the free series
 * and any other course that is not MTK or A4L.
 *
 * One calm pattern, a signature per program: chapters (weeks, pillars, steps…) as a strip at the
 * top, a grid of small thumbnail cards below. Pure module: safe in server and client components.
 */
import type { CourseData, CourseLessonNode } from "@/lib/loaders/course";
import { allLessons } from "@/lib/journey";
import { PHOTO, type PhotoName } from "@/lib/photos";
import type { IconName } from "@/components/ui";
import type { Unit, UnitCard } from "@/components/journeys/units";
import type { ShelfLink } from "@/components/journeys/LessonSidebar";

/** MTK and A4L keep their own journeys (journeys-a). Everything else that opens as a course is ours. */
const NOT_SERIES = new Set(["mastering-the-kettlebell", "athleticism-4-life", "kettlebell-roadmap"]);
export const isSeries = (slug: string) => !NOT_SERIES.has(slug);

export type SeriesSignature = "practice" | "journey" | "pillars" | "series";
export type ItemKind = "lesson" | "practice" | "reflection" | "bonus" | "resource" | "call" | "welcome";

export interface SeriesItem {
  id: string;
  title: string;
  kind: ItemKind;
  done: boolean;
  minutes: number | null;
  thumb: string | null;
  /** Fallback photo (text-free, full colour) when the video has no thumbnail. */
  photo: { src: string; position: string };
  /** 1-based position in its chapter. */
  n: number;
  video: boolean;
}

export interface SeriesChapter {
  key: string;
  label: string;
  /** Short name for the strip ("Week 3", "Breathwork"). */
  short: string;
  blurb?: string;
  items: SeriesItem[];
  /** Nothing released yet (a pillar opening soon, the post-retreat module). */
  soon?: string;
}

export interface SeriesMedia {
  /** Vimeo thumbnail and duration by lesson id (real data; empty in preview). */
  thumbs: Record<string, string>;
  minutes: Record<string, number>;
}

/** Text-free photos (lib/photos) for cards whose video has no thumbnail yet, per program. */
const PHOTOS: Record<string, PhotoName[]> = {
  "working-in": ["coaching", "breathwork", "qiGong", "walk", "workingIn"],
  "the-path-to-inspired-action": ["ridgeCircle", "fire", "conversation", "facingShasta", "walk", "breathwork", "valley"],
  "men-of-movement": ["breathwork", "qiGong", "fire", "ridgeCircle", "facingShasta", "groupLand", "summitGroup"],
  "what-your-kettlebell-swing-is-missing": ["swingGym", "goblet", "deadlift", "standing", "hinge"],
  "free-6-video-kettlebell-mini-series": ["coaching", "press", "getup", "windmill", "squat", "swingGym"],
};
const DEFAULT_PHOTOS: PhotoName[] = ["standing", "press", "coaching", "goblet"];

export function photoFor(slug: string, i: number) {
  const pool = PHOTOS[slug] ?? DEFAULT_PHOTOS;
  const ph = PHOTO[pool[i % pool.length]!];
  return { src: ph.src, position: ph.focal };
}

export function signatureOf(slug: string, kind: string): SeriesSignature {
  if (slug === "working-in" || kind === "series") return "practice";
  if (kind === "weeks") return "journey";
  if (kind === "pillars") return "pillars";
  return "series";
}

function kindOf(slug: string, l: CourseLessonNode, sectionTitle: string): ItemKind {
  const t = l.title;
  if (/download|ebook|pdf|playlist|book recommendation/i.test(t) || /ebook|pdf/i.test(sectionTitle)) return "resource";
  if (/bonus/i.test(sectionTitle) || /want to learn more/i.test(t)) return "bonus";
  if (/playwork|inventory|letter of recognition|negations|soft talk/i.test(t)) return "reflection";
  // Only call recordings are calls ("Pre-Course Materials" and recorded presentations are not).
  if (/\bcall\b|guest presenter/i.test(t)) return "call";
  if (/breath|chi generator|meditation|squat|\bprep\b|energy push|values|drc|designing/i.test(t)) return "practice";
  if (slug === "working-in") return "practice";
  return "lesson";
}

export const KIND_LABEL: Record<ItemKind, string> = {
  lesson: "Lesson", practice: "Practice", reflection: "Reflection", bonus: "Bonus", resource: "Resource", call: "Call", welcome: "Start here",
};

/** "Step 1 - Feet" → "Feet"; "#3 Bottoms Up…" → "Bottoms Up…"; "Week 2 Playwork" → "Playwork". */
export function cleanTitle(t: string, chapterShort?: string) {
  let s = t.trim().replace(/^#\d+\s*/, "").replace(/^step\s+\d+\s*[-–:]\s*/i, "");
  if (chapterShort && /^week\s+\d+/i.test(chapterShort)) s = s.replace(new RegExp(`^${chapterShort}\\s*`, "i"), "");
  return s ? s[0]!.toUpperCase() + s.slice(1) : t;
}

/** The program's chapters, in order, with every lesson as a card. */
export function buildChapters(data: CourseData, media: SeriesMedia): SeriesChapter[] {
  const slug = data.program.slug;
  const cfg = data.program.journey;
  const sig = signatureOf(slug, cfg.kind);
  let photoI = 0;
  const item = (l: CourseLessonNode, sectionTitle: string, n: number, short?: string): SeriesItem => ({
    id: l.id,
    title: cleanTitle(l.title, short),
    kind: kindOf(slug, l, sectionTitle),
    done: l.done,
    minutes: media.minutes[l.id] ?? l.minutes,
    thumb: media.thumbs[l.id] ?? null,
    photo: photoFor(slug, photoI++),
    n,
    video: l.video,
  });
  const welcome = (): SeriesItem | null =>
    data.intro ? { id: "start", title: "Welcome", kind: "welcome", done: false, minutes: null, thumb: media.thumbs[data.intro.lessonId] ?? null, photo: photoFor(slug, photoI++), n: 0, video: true } : null;

  if (sig === "pillars" && cfg.pillars?.length) {
    const lessons = allLessons(data.groups);
    const used = new Set<string>();
    const chapters: SeriesChapter[] = cfg.pillars.map((p) => {
      const rx = p.lessons ? new RegExp(p.lessons, "i") : null;
      const mine = rx ? lessons.filter((l) => !used.has(l.id) && rx.test(l.title)) : [];
      mine.forEach((l) => used.add(l.id));
      return { key: p.key, label: p.label, short: p.label, blurb: p.blurb, items: mine.map((l, i) => item(l, "", i + 1)), soon: mine.length ? undefined : "Opening soon" };
    });
    const rest = lessons.filter((l) => !used.has(l.id));
    if (rest.length) chapters[1]?.items.push(...rest.map((l, i) => item(l, "", (chapters[1]?.items.length ?? 0) + i + 1)));
    const w = welcome();
    if (w) chapters.unshift({ key: "start", label: "Start here", short: "Start here", blurb: "What the preparation is for, and how to use it.", items: [w] });
    chapters.push({ key: "after", label: "After the retreat", short: "After", blurb: "Integration, once you're home.", items: [], soon: "Unlocks after your retreat" });
    return chapters;
  }

  const sections = data.groups.flatMap((g) => g.sections.map((s) => ({ ...s, groupName: g.name })));
  // Thin sections (one lesson each, e.g. Working-In) read better as one numbered series.
  const thin = sections.length > 1 && sections.every((s) => s.lessons.length <= 1) && sig !== "journey";
  let chapters: SeriesChapter[];
  if (thin) {
    const lessons = sections.flatMap((s) => s.lessons.map((l) => ({ l, title: s.title })));
    chapters = [{ key: "all", label: cfg.unit.many[0]!.toUpperCase() + cfg.unit.many.slice(1), short: "All", items: lessons.map((x, i) => item(x.l, x.title, i + 1)) }];
  } else {
    chapters = [];
    for (const s of sections) {
      const short = s.title.replace(/\s*-\s*.*$/, "").trim();
      // Bonus sections fold into one "Bonuses" chapter; downloads into "Resources".
      const bucket = /^bonus/i.test(s.title) ? "Bonuses" : /ebook|pdf|download/i.test(s.title) ? "Resources" : null;
      const key = bucket ?? s.id;
      let ch = chapters.find((c) => c.key === key);
      if (!ch) {
        ch = { key, label: bucket ?? s.title, short: bucket ?? short, items: [] };
        chapters.push(ch);
      }
      for (const l of s.lessons) ch.items.push(item(l, s.title, ch.items.length + 1, short));
    }
    // Resources go last.
    chapters.sort((a, b) => Number(a.key === "Resources") - Number(b.key === "Resources"));
  }
  const w = welcome();
  if (w && chapters[0]) {
    chapters[0].items.unshift(w);
  }
  return chapters;
}

export const chapterProgress = (c: SeriesChapter) => {
  const items = c.items.filter((i) => i.kind !== "welcome");
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, pct: items.length ? done / items.length : 0 };
};

/** Days until an ISO date (≥ 0), in whole days. */
export const daysUntil = (iso: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86400000));

/** Finish line (spec 12 program idea 10): the second "choose next" card beside journey.next. */
export const FINISH_ALT: Record<string, { slug: string; href: string; label: string; reason: string }> = {
  "working-in": { slug: "kettlebell-lifestyle", href: "/programs/kettlebell-lifestyle", label: "Kettlebell Lifestyle", reason: "Put Working-In on your recovery days inside a day-by-day plan." },
  "the-path-to-inspired-action": { slug: "coaching", href: "/coaching", label: "1:1 with Mike", reason: "Tuesdays, 45 minutes: turn the ten weeks into your next ninety days." },
  "men-of-movement": { slug: "the-grounded-king", href: "/programs/the-grounded-king", label: "The Grounded King", reason: "Keep the retreat's work going with the brothers you trained with." },
  "what-your-kettlebell-swing-is-missing": { slug: "kettlebell-lifestyle", href: "/programs/kettlebell-lifestyle", label: "Kettlebell Lifestyle", reason: "Your swing, programmed: Level I starts with it on day one." },
  "free-6-video-kettlebell-mini-series": { slug: "kettlebell-lifestyle", href: "/programs/kettlebell-lifestyle", label: "Kettlebell Lifestyle", reason: "Train the lifts you just coached, day by day." },
};

/* ------------------------------------------------------------------ lesson sidebar (shared shell with MTK / A4L) */

/** Small row icon by what the lesson is: video, audio, reading, call recording or download. */
export function itemIcon(i: Pick<SeriesItem, "kind" | "video" | "title">): IconName {
  if (i.kind === "resource") return "download";
  if (i.kind === "call") return "people";
  if (!i.video) return /meditation|audio/i.test(i.title) ? "speaker" : "file";
  return "video";
}

const SHELF_KEYS = new Set(["Bonuses", "Resources"]);

/**
 * The series' chapters as LessonSidebar units: weeks / modules / pillars become collapsible groups,
 * a one-chapter series a plain numbered list. Bonuses and resources become shelf units (bottom grid).
 * The welcome video maps to the course intro (`intro`, opened at `/course/start`).
 */
export function seriesUnits(data: CourseData, media: SeriesMedia, href: (id: string) => string, nextId: string | null): Unit[] {
  const chapters = buildChapters(data, media).filter((c) => c.items.length);
  const path = chapters.filter((c) => !SHELF_KEYS.has(c.key));
  const flat = path.length === 1;
  return chapters.map((c): Unit => {
    const shelf = SHELF_KEYS.has(c.key);
    const card = (i: SeriesItem): UnitCard => {
      const welcome = i.kind === "welcome";
      return {
        id: welcome ? "intro" : i.id,
        href: href(welcome ? "start" : i.id),
        title: i.title,
        meta: i.minutes ? `${i.minutes} min` : !i.video && i.kind !== "resource" ? "Reading" : undefined,
        status: i.done ? "done" : i.id === nextId ? "next" : data.locked ? "locked" : "open",
        art: {},
        icon: flat && !shelf && i.kind !== "welcome" ? undefined : itemIcon(i),
        kind: shelf ? (c.key === "Resources" ? "resource" : "bonus") : "lesson",
      };
    };
    const welcome = c.items.filter((i) => i.kind === "welcome");
    const rest = c.items.filter((i) => i.kind !== "welcome");
    const p = chapterProgress(c);
    return {
      id: `s:${c.key}`,
      label: c.label,
      group: shelf ? "Open any time" : undefined,
      done: p.done,
      total: p.total,
      // Welcome on its own row so a numbered list starts at 1 with the first real lesson.
      rows: [...(welcome.length ? [{ cards: welcome.map(card) }] : []), { cards: rest.map(card) }],
    };
  });
}

/** Bottom-grid cards for the series' bonuses and resources, plus the library. */
export function seriesShelf(units: Unit[]): ShelfLink[] {
  const out: ShelfLink[] = units
    .filter((u) => u.group === "Open any time")
    .flatMap((u) => {
      const cards = u.rows.flatMap((r) => r.cards);
      const first = cards.find((c) => c.status !== "done") ?? cards[0];
      if (!first) return [];
      const res = u.label === "Resources";
      const n = cards.length;
      return [{ id: u.id, label: u.label, sub: res ? `${n} ${n === 1 ? "download" : "downloads"}` : `${n} ${n === 1 ? "bonus" : "bonuses"}`, href: first.href, icon: (res ? "download" : "gift") as IconName }];
    });
  out.push({ id: "library", label: "Library", sub: "All videos", href: "/library", icon: "library" });
  return out;
}

/** The notes prompt for a series lesson. */
export function seriesQuestion(slug: string, kind: string, title: string): string {
  const sig = signatureOf(slug, kind);
  if (/playwork|inventory|letter of recognition|negations/i.test(title)) return "What came up for you in this week's playwork, and what will you do differently?";
  if (sig === "journey") return "What's one thing from this you'll act on before next week?";
  if (sig === "pillars") return "What do you want to carry with you to the retreat from this practice?";
  if (sig === "practice") return "How did your energy feel before and after this practice?";
  return "What's one thing you'll do differently after this lesson?";
}
