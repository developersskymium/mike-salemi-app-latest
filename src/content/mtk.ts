/**
 * Mastering the Kettlebell — the 11-module technique course (plus a bonus
 * module) that sits alongside Kettlebell Lifestyle.
 *
 * Module names, ordering and video counts mirror the real course. Lesson
 * videos resolve against the existing library catalogue where a matching
 * title exists; anything unmatched renders as "video coming soon" rather
 * than breaking the player.
 */

import { libraryVideos } from "@/content/library";

export type MtkLesson = {
  id: string;
  title: string;
  vimeoId?: string;
};

export type MtkModule = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  videoCount: number;
  /** Which purchase tier unlocks this module. */
  tier: MtkTierId;
  lessons: MtkLesson[];
};

export type MtkTierId = "full" | "ballistic" | "overhead" | "lower";

export type MtkTier = {
  id: MtkTierId;
  name: string;
  price: number;
  lessonsLabel: string;
  summary: string;
  includes: string[];
  featured?: boolean;
};

export const MTK_COURSE_ID = "mtk";

export const mtkTiers: MtkTier[] = [
  {
    id: "full",
    name: "Full Program",
    price: 997,
    lessonsLabel: "400+ lessons",
    summary: "Every module, every lift, plus the bonus lectures and expert talks.",
    includes: [
      "Ballistic, overhead, lower body and pulling modules",
      "Expert talks with Paul Chek and Dr. Drew Vercellino",
      "Program design and posture lectures",
      "Lifetime membership access",
    ],
    featured: true,
  },
  {
    id: "ballistic",
    name: "Ballistic Movements",
    price: 597,
    lessonsLabel: "150+ lessons",
    summary: "Swing, clean, snatch and deadlift — Russian and pendulum styles.",
    includes: [
      "Russian & pendulum swing, clean, snatch",
      "Two-hand and single leg deadlift",
      "Common errors and variations",
      "Readiness assessments",
    ],
  },
  {
    id: "overhead",
    name: "Overhead Movements",
    price: 497,
    lessonsLabel: "80+ lessons",
    summary: "Press, jerk, get up and windmill with full error correction.",
    includes: [
      "Overhead press and jerk",
      "Turkish get up and windmill",
      "Common errors and variations",
      "Readiness assessments",
    ],
  },
  {
    id: "lower",
    name: "Lower Body & Pulling",
    price: 297,
    lessonsLabel: "90+ lessons",
    summary: "Squat, lunge and row patterns from the ground up.",
    includes: [
      "Squat and row progressions",
      "Front, reverse and lateral lunge",
      "Common errors and variations",
      "Readiness assessments",
    ],
  },
];

/** Loose title match against the library so lessons get a real video where possible. */
function findVideo(...keywords: string[]): string | undefined {
  const match = libraryVideos.find((video) => {
    const title = video.title.toLowerCase();
    return keywords.every((k) => title.includes(k.toLowerCase()));
  });
  return match?.vimeoId;
}

function lessons(moduleId: string, entries: [string, string[]][]): MtkLesson[] {
  return entries.map(([title, keywords], index) => ({
    id: `${moduleId}-l${index + 1}`,
    title,
    vimeoId: keywords.length ? findVideo(...keywords) : undefined,
  }));
}

export const mtkModules: MtkModule[] = [
  {
    id: "starting-up",
    slug: "starting-up",
    title: "Starting Up",
    blurb: "Choose your bell, understand the tool, and warm up properly before the first rep.",
    videoCount: 6,
    tier: "full",
    lessons: lessons("starting-up", [
      ["Choosing Your Weight", ["warm"]],
      ["Kettlebell Types", []],
      ["Safety and Chalking", []],
      ["History of the Kettlebell", []],
      ["Benefits of Kettlebell Training", []],
      ["Pre-Training Warm Up", ["warm up"]],
    ]),
  },
  {
    id: "grips",
    slug: "grips-and-positions",
    title: "Grips and Positions",
    blurb: "The six positions every other lift is built on, plus two bonus grip drills.",
    videoCount: 6,
    tier: "full",
    lessons: lessons("grips", [
      ["Hook Grip", []],
      ["Goblet Position", ["goblet"]],
      ["Crush Grip", []],
      ["Rack Position", ["rack"]],
      ["Overhead Lockout", ["overhead"]],
      ["Bottoms Up", ["bottoms"]],
    ]),
  },
  {
    id: "deadlift",
    slug: "deadlift",
    title: "Deadlift",
    blurb: "The hinge that underwrites every ballistic lift — from pre-check to single leg.",
    videoCount: 53,
    tier: "ballistic",
    lessons: lessons("deadlift", [
      ["Deadlift Pre-Check", ["deadlift"]],
      ["Two-Hand Deadlift", ["deadlift"]],
      ["Common Errors", []],
      ["Deadlift Variations", []],
      ["Bonus: Single Leg Deadlift", ["single leg"]],
    ]),
  },
  {
    id: "swing",
    slug: "swing",
    title: "Swing",
    blurb: "Russian and pendulum swings, broken down frame by frame.",
    videoCount: 77,
    tier: "ballistic",
    lessons: lessons("swing", [
      ["Swing Pre-Check", ["swing"]],
      ["Russian Swing", ["swing"]],
      ["Pendulum Swing", ["swing"]],
      ["Common Errors", []],
      ["Swing Variations", []],
    ]),
  },
  {
    id: "clean",
    slug: "clean",
    title: "Clean",
    blurb: "A quiet clean into a settled rack — the gateway to press, jerk and long cycle.",
    videoCount: 57,
    tier: "ballistic",
    lessons: lessons("clean", [
      ["Clean Pre-Check", ["clean"]],
      ["Russian Clean", ["clean"]],
      ["Pendulum Clean", ["clean"]],
      ["Common Errors", []],
      ["Clean Variations", []],
    ]),
  },
  {
    id: "snatch",
    slug: "snatch",
    title: "Snatch",
    blurb: "Ground to overhead in one motion, without punishing the forearm.",
    videoCount: 76,
    tier: "ballistic",
    lessons: lessons("snatch", [
      ["Snatch Pre-Check", ["snatch"]],
      ["Russian Snatch", ["snatch"]],
      ["Pendulum Snatch", ["snatch"]],
      ["Common Errors", []],
      ["Snatch Variations", []],
    ]),
  },
  {
    id: "press-jerk",
    slug: "presses-and-jerks",
    title: "Presses and Jerks",
    blurb: "Strict strength and elastic power overhead, with shoulder-safe mechanics.",
    videoCount: 63,
    tier: "overhead",
    lessons: lessons("press-jerk", [
      ["Press Pre-Check", ["press"]],
      ["Overhead Press", ["press"]],
      ["Jerk", ["jerk"]],
      ["Common Errors", []],
      ["Press and Jerk Variations", []],
    ]),
  },
  {
    id: "get-up",
    slug: "get-up",
    title: "Get Up",
    blurb: "The Turkish get up plus the windmill family, step by step.",
    videoCount: 73,
    tier: "overhead",
    lessons: lessons("get-up", [
      ["Get Up Pre-Check", ["get up"]],
      ["Turkish Get Up", ["get up"]],
      ["Common Errors", []],
      ["Get Up Variations", []],
      ["Bonus: Windmill", ["windmill"]],
    ]),
  },
  {
    id: "squat",
    slug: "squat",
    title: "Squat",
    blurb: "Loaded squatting that keeps the spine long and the hips honest.",
    videoCount: 43,
    tier: "lower",
    lessons: lessons("squat", [
      ["Squat Pre-Check", ["squat"]],
      ["Kettlebell Squat", ["squat"]],
      ["Common Errors", []],
      ["Squat Variations", []],
    ]),
  },
  {
    id: "lunge",
    slug: "lunge",
    title: "Lunge",
    blurb: "Multi-directional lunging for single-leg strength and control.",
    videoCount: 51,
    tier: "lower",
    lessons: lessons("lunge", [
      ["Lunge Pre-Check", ["lunge"]],
      ["Multi-Directional Lunges", ["lunge"]],
      ["Common Errors", []],
      ["Lunge Variations", []],
    ]),
  },
  {
    id: "row",
    slug: "row",
    title: "Row",
    blurb: "Pulling strength to balance everything you press and swing.",
    videoCount: 40,
    tier: "lower",
    lessons: lessons("row", [
      ["Row Pre-Check", ["row"]],
      ["Kettlebell Row", ["row"]],
      ["Common Errors", []],
      ["Row Variations", []],
    ]),
  },
  {
    id: "bonus",
    slug: "bonus",
    title: "Bonus: Expert Talks",
    blurb: "Lectures with Paul Chek and Dr. Drew Vercellino on programming, posture and the spine.",
    videoCount: 21,
    tier: "full",
    lessons: lessons("bonus", [
      ["Expert Talk — Paul Chek", []],
      ["Expert Talk — Dr. Drew Vercellino", []],
      ["Program Design Lecture", []],
      ["Posture and the Spine", []],
    ]),
  },
];

export const mtkTotalVideos = mtkModules.reduce((sum, m) => sum + m.videoCount, 0);

export function findMtkModule(slug: string) {
  return mtkModules.find((m) => m.slug === slug) ?? null;
}

export function modulesForTier(tier: MtkTierId) {
  if (tier === "full") return mtkModules;
  return mtkModules.filter((m) => m.tier === tier || m.tier === "full");
}
