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

const PHOTOS: Record<string, [string, string][]> = {
  "working-in": [["working-in.jpg", "50% 42%"], ["breathwork.jpg", "50% 40%"], ["summit-clouds.jpg", "50% 50%"], ["mike-coaching.jpg", "26% 20%"]],
  "the-path-to-inspired-action": [["tgk.jpg", "50% 35%"], ["ridge-circle.jpg", "50% 50%"], ["fire.jpg", "50% 50%"], ["shasta-ridge.jpg", "50% 50%"], ["summit-clouds.jpg", "50% 50%"]],
  "men-of-movement": [["summit-group.jpg", "50% 40%"], ["breathwork.jpg", "50% 40%"], ["shasta-ridge.jpg", "50% 50%"], ["fire.jpg", "50% 50%"], ["ridge-circle.jpg", "50% 50%"]],
  "what-your-kettlebell-swing-is-missing": [["mike-goblet.jpg", "52% 10%"], ["mike-deadlift.jpg", "45% 4%"], ["mike-standing.jpg", "52% 22%"], ["mike-press.jpg", "60% 14%"]],
  "free-6-video-kettlebell-mini-series": [["mike-deadlift.jpg", "45% 4%"], ["mike-coaching.jpg", "26% 20%"], ["mike-press.jpg", "60% 14%"], ["mike-getup.jpg", "35% 30%"], ["mike-windmill.jpg", "70% 38%"], ["mike-squat.jpg", "40% 6%"]],
};
const DEFAULT_PHOTOS: [string, string][] = [["mike-standing.jpg", "52% 22%"], ["mike-press.jpg", "60% 14%"], ["mike-coaching.jpg", "26% 20%"], ["mike-goblet.jpg", "52% 10%"]];

export function photoFor(slug: string, i: number) {
  const pool = PHOTOS[slug] ?? DEFAULT_PHOTOS;
  const [file, position] = pool[i % pool.length]!;
  return { src: `/media/summit/${file}`, position };
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
  if (/call|presentation|presenter|pre-course/i.test(t)) return "call";
  if (/breath|chi generator|meditation|squat|prep|energy push|values|drc|designing/i.test(t)) return "practice";
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
