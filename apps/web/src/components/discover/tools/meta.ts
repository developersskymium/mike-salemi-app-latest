import type { MoveName } from "@/components/graphics";

/**
 * Display copy per tool (the DB keeps the tool's own name). The Kettlebell Roadmap gets a
 * result-oriented title; the old name stays as the subtitle. `draft` marks copy awaiting Mike's sign-off.
 */
export const TOOL_META: Record<string, { title: string; subtitle?: string; draft?: string; move: MoveName; promise: string; minutes: number }> = {
  "kettlebell-selector": { title: "Kettlebell Selector", move: "swing", promise: "Your three bells, from first to heavy", minutes: 1 },
  "stretch-test": { title: "Stretch Test", move: "squat", promise: "Your mobility profile across five positions", minutes: 3 },
  "readiness-check": { title: "Readiness Check", move: "breathing", promise: "Push, modify or recover — today's answer", minutes: 1 },
  "roadmap": { title: "Kettlebell Roadmap Coach", move: "getup", promise: "Test Mike's benchmarks, find your phase, unlock the next lift", minutes: 20 },
  "kettlebell-roadmap": {
    title: "Find Your Kettlebell Phase",
    subtitle: "Kettlebell Roadmap",
    draft: "Proposed title, pending Mike's sign-off",
    move: "getup",
    promise: "The phase to train now and the lifts to own next",
    minutes: 2,
  },
};

export const toolTitle = (id: string, fallback: string) => TOOL_META[id]?.title ?? fallback;

/** Full-colour photo of Mike per tool (face-safe focal point), for the tool cards and the intro. */
export const TOOL_PHOTO: Record<string, { src: string; focal: string; alt: string }> = {
  "kettlebell-selector": { src: "/media/summit/mike-deadlift.jpg", focal: "45% 10%", alt: "Mike Salemi with a row of kettlebells" },
  "stretch-test": { src: "/media/summit/mike-windmill.jpg", focal: "70% 40%", alt: "Mike Salemi in a kettlebell windmill" },
  "readiness-check": { src: "/media/summit/mike-standing.jpg", focal: "52% 30%", alt: "Mike Salemi checking in before training" },
  roadmap: { src: "/media/summit/mike-getup.jpg", focal: "55% 35%", alt: "Mike Salemi in a Turkish get-up" },
  "kettlebell-roadmap": { src: "/media/l5e/56d44c1a-3caf-4646-83a3-2e4169771e25/kettlebell-roadmap.png", focal: "50% 34%", alt: "Mike Salemi lifting a kettlebell" },
};

/** The Stretch Test positions as Mike demonstrates them (legacy stretch-test photos, text-free). */
export const STRETCH_DEMOS = [
  { src: "/media/tools/stretch-hip-flexor.jpg", label: "Hip flexor" },
  { src: "/media/tools/stretch-90-90-hip.jpg", label: "90/90 hip" },
  { src: "/media/tools/stretch-hamstring.jpg", label: "Hamstring" },
  { src: "/media/tools/stretch-chest.jpg", label: "Chest" },
  { src: "/media/tools/stretch-calf.jpg", label: "Calf" },
];

/**
 * The tools members see listed and linked (spec 11 #15), plus the Kettlebell Roadmap Coach (spec 14,
 * /tools/roadmap, a static route that isn't a `tools` row — the index adds its card itself). The others (Readiness Check,
 * Roadmap phase check) stay in the database and their pages keep working for old links, saves and the
 * day player, but nothing lists them.
 */
export const LISTED_TOOLS = ["roadmap", "kettlebell-selector", "stretch-test"] as const;
export const isListedTool = (id: string) => (LISTED_TOOLS as readonly string[]).includes(id);
