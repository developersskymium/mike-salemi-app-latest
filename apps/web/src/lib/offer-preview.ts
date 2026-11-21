import type { VideoRef } from "@ms/core";

/**
 * The day player's "Struggling with the <move>?" card points at one Mastering the Kettlebell
 * lesson per movement: its "Progressing into the Movement" breakdown. Ids are the live lesson ids;
 * the bullets are a short, member-facing summary of that lesson's key points (the lesson body
 * itself is only readable with access, so the glimpse can't read it for members without access).
 */
export interface OfferMove {
  key: string;
  match: RegExp;
  lessonId: string;
  /** The MTK section the lesson lives in ("Squat"). */
  section: string;
  title: string;
  description: string;
  bullets: string[];
  photo: string;
}

export const OFFER_MOVES: OfferMove[] = [
  {
    key: "single-leg-deadlift", match: /single.?leg/i, lessonId: "3844733c-c037-4fc1-8148-3019d10f9045", section: "Single-Leg Deadlift",
    title: "Progressing into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "Balance, hinge and stay square, from bodyweight to a two-hand bell.",
    bullets: ["Root through one foot and hinge from the hip", "Keep your shoulders and pelvis square", "Build a long line of tension from heel to head"],
  },
  {
    key: "get-up", match: /get.?up/i, lessonId: "059b499b-e9ff-451e-8bca-eea683bf84b0", section: "Turkish Get Up",
    title: "Progressing Into the Movement", photo: "/media/summit/mike-getup.jpg",
    description: "Every position of the get up, set up and practised with your bodyweight first.",
    bullets: ["Set up on the floor the right way", "Roll to the elbow with your shoulder away from your ear", "Move through each position with control"],
  },
  {
    key: "windmill", match: /windmill/i, lessonId: "ce557337-3f55-4d60-b57e-b5dc9daba291", section: "Windmill",
    title: "Progressing into the Movement", photo: "/media/summit/mike-windmill.jpg",
    description: "Pattern the windmill, then load it with the low windmill.",
    bullets: ["Set your stance and foot angle", "Shift your weight into the rear hip", "Hinge along the line of your toes"],
  },
  {
    key: "jerk", match: /jerk|push.?press/i, lessonId: "f14c768c-40b0-4e84-8a7c-e9973ffda26e", section: "Jerk",
    title: "Progressing into the Movement", photo: "/media/summit/mike-press.jpg",
    description: "Use your legs to send the bell overhead, from push press to triple extension.",
    bullets: ["Rest the elbow on your hip in the rack", "Dip straight down and drive with the legs", "Lower back to the rack under control"],
  },
  {
    key: "press", match: /press/i, lessonId: "15c5410f-c1b4-43d6-92b7-6d2067c20648", section: "Overhead Press",
    title: "Progressing into the Movement", photo: "/media/summit/mike-press.jpg",
    description: "Start strict and half kneeling, then own the overhead lockout.",
    bullets: ["Start with the half-kneeling press", "Lock out with a straight elbow and bicep by your ear", "Build toward the standing press"],
  },
  {
    key: "snatch", match: /snatch/i, lessonId: "117d7201-45e0-4fdd-ab2a-a7ed55a997cc", section: "Russian Snatch",
    title: "Progressing into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "Time your hand insertion and finish in a solid overhead lockout.",
    bullets: ["Time your hand insertion with the snatch ladder", "Finish with the handle in the heel of your palm", "Move into a solid overhead lockout"],
  },
  {
    key: "clean", match: /clean/i, lessonId: "23cc1256-bdc1-4198-a5ec-4febec460dbb", section: "Russian Clean",
    title: "Progressing into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "Bridge from two-hand swings to a clean that lands softly in the rack.",
    bullets: ["Go from two-hand swings to single-arm control", "Use your lat to keep the shoulder steady", "Pick the grip that suits you"],
  },
  {
    key: "swing", match: /swing/i, lessonId: "3305e9da-f975-4a2a-85ee-4fc6b0e4da2b", section: "Russian Swing",
    title: "Progressing into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "The hinge behind a strong swing, then range and speed step by step.",
    bullets: ["Learn the hinge pattern behind the swing", "Build range and speed with speed Romanians", "Keep your spine long at every speed"],
  },
  {
    key: "deadlift", match: /deadlift/i, lessonId: "49cb8a0b-3f05-4a5b-a340-92401a74b99a", section: "Two Hand Deadlift",
    title: "Progressing into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "Set up, hinge and brace so every rep starts in the right place.",
    bullets: ["Set the bell just in front of your ankles", "Hinge from the hips with a long spine", "Brace and root through the floor before you lift"],
  },
  {
    key: "lunge", match: /lunge|split.?squat/i, lessonId: "fef2245a-cdad-4534-9af7-b6210daa2a79", section: "Multi-Directional Lunges",
    title: "Progressing into the Movement", photo: "/media/summit/mike-squat.jpg",
    description: "Pattern a stable lunge, then load it in the goblet position.",
    bullets: ["Find the bottom position: rear knee under hip", "Keep your pelvis square and level", "Load the lunge from the goblet position"],
  },
  {
    key: "squat", match: /squat/i, lessonId: "39d93a53-1f21-474d-8ee5-789bae646b89", section: "Squat",
    title: "Progressing into the Movement", photo: "/media/summit/mike-goblet.jpg",
    description: "Stance, spine and gravity line, then the goblet squat under load.",
    bullets: ["Find your own squat stance and foot tripod", "Keep your ribs stacked over your pelvis", "Load it with the goblet squat, step by step"],
  },
  {
    key: "row", match: /row/i, lessonId: "17cf7458-c193-4322-946c-f354b509ed74", section: "Row",
    title: "Progressing Into the Movement", photo: "/media/summit/mike-deadlift.jpg",
    description: "Hold your spine still while you row, then set up the staggered stance row.",
    bullets: ["Keep your spine still with the PVC drill", "Set up the staggered stance", "Row without twisting or swinging"],
  },
];

/** The lesson for an exercise name ("Goblet Squat (KB)"), or the squat breakdown as a safe default. */
export function offerMoveFor(exercise: string): OfferMove {
  return OFFER_MOVES.find((m) => m.match.test(exercise)) ?? OFFER_MOVES.find((m) => m.key === "squat")!;
}

/** What the preview popup shows. `watch`: play the lesson. `glimpse`: locked teaser with the way to unlock. */
export interface OfferPreview {
  mode: "watch" | "glimpse";
  program: { slug: string; name: string; cover: string };
  lesson: { id: string; title: string; section: string; description: string; bullets: string[]; poster: string; href: string };
  /** The lesson video (watch mode). */
  video: (VideoRef & { title?: string }) | null;
  /** A free taste of the program (glimpse mode), when there is one. */
  clip: (VideoRef & { title?: string }) | null;
  /** Price / plan state from the access CTA ("Buy, $297" · "Or included in Max"). */
  price: { label: string; note: string | null } | null;
  unlockHref: string;
}
