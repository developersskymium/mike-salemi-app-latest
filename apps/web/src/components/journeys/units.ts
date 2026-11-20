/**
 * Navigator model for the program main pages and lesson navigation of Kettlebell Lifestyle, MTK and
 * Athleticism 4 Life (spec 11 §2): a strip of units across the top (weeks / movements / blocks) and
 * a grid of small cards for the selected unit. Pure module: safe in server and client components.
 */
import type { DayType, MoveName } from "@/components/graphics";
import type { CourseData, CourseLessonNode } from "@/lib/loaders/course";
import { dayGlyph, dayTypeShort, lessonName } from "@/components/training/model";
import type { LessonLite, ProgressRow, SectionLite } from "@/lib/loaders/training";
import type { LessonExtra } from "@/lib/loaders/selfguided";

export type CardStatus = "done" | "next" | "open" | "locked";

export interface CardArt {
  /** A photo (real Mike photo, never with baked-in text) … */
  photo?: { src: string; focal: string };
  /** … or a drawn tile: day-type glyph or an MTK movement figure. */
  glyph?: DayType;
  move?: MoveName;
}

export interface UnitCard {
  id: string;
  href: string;
  title: string;
  eyebrow?: string;
  meta?: string;
  status: CardStatus;
  art: CardArt;
  /** Bonus / resource cards sit after the day cards and read lighter. */
  kind?: "day" | "lesson" | "bonus" | "resource";
  external?: boolean;
}

export interface UnitRow {
  title?: string;
  cards: UnitCard[];
}

export interface Unit {
  id: string;
  /** Short strip label ("Week 3", "Deadlift"). */
  label: string;
  /** Small line under the label ("Phase 1", "Grinds"). */
  sub?: string;
  /** Strip group heading (phases, tiers, blocks). */
  group?: string;
  done: number;
  total: number;
  rows: UnitRow[];
  /** One line about the unit shown above its grid. */
  blurb?: string;
}

/* ------------------------------------------------------------------ photos */

const P = (src: string, focal: string) => ({ src: `/media/summit/${src}`, focal });
export const PHOTOS = {
  press: P("mike-press.jpg", "60% 14%"),
  squat: P("mike-squat.jpg", "40% 8%"),
  deadlift: P("mike-deadlift.jpg", "45% 6%"),
  getup: P("mike-getup.jpg", "35% 30%"),
  goblet: P("mike-goblet.jpg", "52% 12%"),
  windmill: P("mike-windmill.jpg", "70% 34%"),
  coaching: P("mike-coaching.jpg", "26% 20%"),
  standing: P("mike-standing.jpg", "52% 22%"),
  breath: P("breathwork.jpg", "50% 40%"),
  workingIn: P("working-in.jpg", "42% 30%"),
  ridge: P("shasta-ridge.jpg", "50% 50%"),
  bag: { src: "/media/l5e/f9cc9459-fd95-4602-9ba0-1137217fdbfa/athleticism-4-life.png", focal: "60% 40%" },
  bagShop: { src: "/media/shop/bulgarian-bag.jpg", focal: "50% 50%" },
};
const WORK_POOL = [PHOTOS.press, PHOTOS.squat, PHOTOS.deadlift, PHOTOS.goblet, PHOTOS.getup, PHOTOS.windmill];

/* ------------------------------------------------------------------ Kettlebell Lifestyle */

const weeksIn = (subtitle: string | null) => {
  const m = (subtitle ?? "").match(/(\d+)\s*[–-]\s*(\d+)/);
  if (m) return { from: +m[1]!, to: +m[2]! };
  const one = (subtitle ?? "").match(/(\d+)/);
  return one ? { from: +one[1]!, to: +one[1]! } : null;
};

/**
 * KBL Immersion weeks: each phase's subtitle ("Weeks 4–6") splits its days into weeks; the phase's
 * overview pages and PDF guide land in its first week as bonus cards.
 */
export function kblUnits(args: {
  slug: string;
  sections: SectionLite[];
  lessons: LessonLite[];
  progress: ProgressRow[];
  extras?: Record<string, LessonExtra>;
  resources: { id: string; title: string; url: string; sectionId: string | null }[];
  currentId: string | null;
  orderLocked: boolean;
  locked: boolean;
  href: (l: LessonLite) => string;
}): Unit[] {
  const { sections, lessons, progress, extras, resources, currentId, orderLocked, locked, href } = args;
  const byId = new Map(progress.map((p) => [p.lessonId, p]));
  const units: Unit[] = [];
  for (const s of [...sections].sort((a, b) => a.position - b.position)) {
    const ls = lessons.filter((l) => l.sectionId === s.id).sort((a, b) => a.position - b.position);
    const days = ls.filter((l) => l.dayNumber != null && !l.pageType);
    const pages = ls.filter((l) => !(l.dayNumber != null && !l.pageType));
    const w = weeksIn(s.subtitle);
    const nWeeks = w ? w.to - w.from + 1 : 1;
    const per = Math.max(1, Math.ceil(days.length / nWeeks));
    const phase = s.title.replace(/\s+phase$/i, "");
    const card = (l: LessonLite, i: number): UnitCard => {
      const p = byId.get(l.id);
      const glyph = dayGlyph(l.dayType, l.pageType);
      const ex = extras?.[l.id];
      const status: CardStatus = p?.complete ? "done" : l.id === currentId ? "next" : locked || (orderLocked && p && !p.unlocked) ? "locked" : "open";
      const photo = glyph.startsWith("workout") || glyph === "challenge" || glyph === "on-ramp" ? WORK_POOL[((l.dayNumber ?? i) + i) % WORK_POOL.length] : glyph === "skill" ? PHOTOS.windmill : glyph === "recovery" ? PHOTOS.breath : undefined;
      const isDay = l.dayNumber != null && !l.pageType;
      return {
        id: l.id,
        href: href(l),
        title: isDay ? lessonName(l) : l.title,
        eyebrow: isDay ? `Day ${l.dayNumber}` : dayTypeShort(l.dayType) || "Guide",
        meta: ex?.minutes ? `${ex.minutes} min` : undefined,
        status,
        art: photo ? { photo, glyph } : { glyph },
        kind: isDay ? "day" : "bonus",
      };
    };
    for (let k = 0; k < nWeeks; k++) {
      const chunk = days.slice(k * per, (k + 1) * per);
      if (!chunk.length && k > 0) continue;
      const extra = k === 0 ? pages : [];
      const guides = k === 0 ? resources.filter((r) => r.sectionId === s.id) : [];
      const all = [...chunk, ...extra];
      const weekNo = w ? w.from + k : null;
      units.push({
        id: `${s.id}:${k}`,
        label: weekNo != null ? `Week ${weekNo}` : phase,
        sub: chunk.length ? `Days ${chunk[0]!.dayNumber}–${chunk[chunk.length - 1]!.dayNumber}` : undefined,
        group: phase,
        done: all.filter((l) => byId.get(l.id)?.complete).length,
        total: all.length,
        rows: [
          { cards: chunk.map(card) },
          ...(extra.length || guides.length
            ? [{
                title: "Guides & bonuses",
                cards: [
                  ...extra.map(card),
                  ...guides.map((r): UnitCard => ({ id: r.id, href: r.url, title: r.title, eyebrow: "PDF guide", status: locked ? "locked" : "open", art: { glyph: "overview" }, kind: "resource", external: true })),
                ],
              }]
            : []),
        ],
      });
    }
  }
  return units;
}

/* ------------------------------------------------------------------ course programs (MTK, A4L) */

type Lesson = CourseLessonNode;

function courseCard(l: Lesson, href: string, nextId: string | null, locked: boolean, art: CardArt, eyebrow?: string): UnitCard {
  const day = l.title.match(/^day\s*(\d+)$/i);
  return {
    id: l.id,
    href,
    title: day ? `Day ${day[1]}` : l.title.replace(/^\*+/, ""),
    eyebrow,
    meta: l.minutes ? `${l.minutes} min` : l.video ? undefined : "Reading",
    status: l.done ? "done" : l.id === nextId ? "next" : locked ? "locked" : "open",
    art,
    kind: "lesson",
  };
}

const A4L_UNIT_ART: [RegExp, CardArt][] = [
  [/breath/i, { photo: PHOTOS.breath }],
  [/working in|stretch|mobility|warm/i, { photo: PHOTOS.workingIn }],
  [/check.?in|overview|brief|what'?s next|certif|q ?& ?a|archive/i, { glyph: "overview" }],
  [/bag/i, { photo: PHOTOS.bagShop }],
];
const A4L_DAY_POOL = [PHOTOS.bag, PHOTOS.deadlift, PHOTOS.squat, PHOTOS.press, PHOTOS.goblet, PHOTOS.getup];

function a4lArt(l: Lesson, i: number): CardArt {
  for (const [re, art] of A4L_UNIT_ART) if (re.test(l.title)) return art;
  const d = l.title.match(/^day\s*(\d+)/i);
  if (d) return { photo: A4L_DAY_POOL[+d[1]! % A4L_DAY_POOL.length]!, glyph: "workout-1" };
  return { photo: A4L_DAY_POOL[i % A4L_DAY_POOL.length]! };
}

/** A4L: Get ready → Week 1–4 → Final days (Block 1 / Block 2), then the libraries as their own tabs. */
export function a4lUnits(data: CourseData, href: (id: string) => string, nextId: string | null): Unit[] {
  const units: Unit[] = [];
  const shelfLabel: Record<string, string> = {
    "Workout Library": "Workouts",
    "Exercise Library": "Exercises",
    "Preparation & Recovery Series": "Prep & recovery",
    "What's Next": "What's next",
    "2025 Archives": "Q&A",
  };
  for (const g of data.groups) {
    const path = /30-day/i.test(g.name);
    if (path) {
      for (const s of g.sections) {
        const wk = s.title.match(/week\s*(\d+)/i);
        const block = wk ? (+wk[1]! <= 2 ? "Block 1 · Foundations" : "Block 2 · Performance") : /final/i.test(s.title) ? "Block 2 · Performance" : "Before Day 1";
        const label = wk ? `Week ${wk[1]}` : /getting started/i.test(s.title) ? "Get ready" : s.title;
        const days = s.lessons.filter((l) => /^day\s*\d+/i.test(l.title));
        const other = s.lessons.filter((l) => !/^day\s*\d+/i.test(l.title));
        const mk = (l: Lesson, i: number) => courseCard(l, href(l.id), nextId, data.locked, a4lArt(l, i), /check.?in/i.test(l.title) ? "Check-in" : /overview/i.test(l.title) ? "Week brief" : undefined);
        units.push({
          id: s.id,
          label,
          sub: days.length ? `Days ${days[0]!.title.replace(/\D+/g, "")}–${days[days.length - 1]!.title.replace(/\D+/g, "")}` : `${s.lessons.length} lessons`,
          group: block,
          done: s.lessons.filter((l) => l.done).length,
          total: s.lessons.length,
          rows: days.length
            ? [{ cards: days.map(mk) }, { title: "Brief & check-in", cards: other.map(mk) }]
            : [{ cards: s.lessons.map(mk) }],
        });
      }
    } else {
      const lessons = g.sections.flatMap((s) => s.lessons);
      units.push({
        id: `g:${g.name}`,
        label: shelfLabel[g.name] ?? g.name,
        sub: `${lessons.length} lessons`,
        group: "Open any time",
        done: lessons.filter((l) => l.done).length,
        total: lessons.length,
        rows: g.sections.map((s) => ({ title: g.sections.length > 1 ? s.title : undefined, cards: s.lessons.map((l, i) => ({ ...courseCard(l, href(l.id), nextId, data.locked, a4lArt(l, i)), kind: "bonus" as const })) })),
      });
    }
  }
  return units;
}

const MTK_PHOTO: Record<string, { src: string; focal: string }> = {
  "Getting Started": PHOTOS.goblet,
  Deadlift: PHOTOS.deadlift,
  Squat: PHOTOS.squat,
  Lunge: PHOTOS.squat,
  Row: PHOTOS.deadlift,
  Swing: PHOTOS.standing,
  Clean: PHOTOS.goblet,
  Snatch: PHOTOS.press,
  "Presses and Jerks": PHOTOS.press,
  "Get Up": PHOTOS.getup,
  Bonus: PHOTOS.coaching,
};

/** MTK: the skill tree as a stage strip (tiers → movements); each movement's sections become rows. */
export function mtkUnits(data: CourseData, href: (id: string) => string, nextId: string | null, planIds: Set<string>): Unit[] {
  const cfg = data.program.journey;
  const fam = new Map<string, { label: string; tier: string; move?: MoveName }>();
  for (const t of cfg.tiers ?? []) for (const f of t.families) fam.set(f.group, { label: f.label, tier: t.label, move: f.move });
  const order = (cfg.tiers ?? []).flatMap((t) => t.families.map((f) => f.group));
  const groups = [...data.groups].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return groups.map((g) => {
    const f = fam.get(g.name);
    const lessons = g.sections.flatMap((s) => s.lessons);
    const photo = MTK_PHOTO[g.name] ?? PHOTOS.standing;
    return {
      id: `g:${g.name}`,
      label: f?.label ?? (g.name === "Bonus" ? "Bonus" : g.name),
      sub: `${lessons.filter((l) => l.done).length}/${lessons.length}`,
      group: f?.tier ?? "Beyond the lifts",
      done: lessons.filter((l) => l.done).length,
      total: lessons.length,
      rows: g.sections.map((s) => ({
        title: s.title.replace(/\s+/g, " ").replace(/^([A-Z\s-]+)$/, (m) => m.charAt(0) + m.slice(1).toLowerCase()),
        cards: s.lessons.map((l, i) => {
          const c = courseCard(l, href(l.id), nextId, data.locked, i === 0 || !f?.move ? { photo } : { move: f.move }, planIds.has(l.id) ? "In your plan" : undefined);
          return c;
        }),
      })),
    };
  });
}

/** The unit that holds a lesson (or the first unfinished one). */
export function unitOf(units: Unit[], lessonId: string | null) {
  if (lessonId) {
    const u = units.find((x) => x.rows.some((r) => r.cards.some((c) => c.id === lessonId)));
    if (u) return u;
  }
  return units.find((u) => u.done < u.total) ?? units[0] ?? null;
}
