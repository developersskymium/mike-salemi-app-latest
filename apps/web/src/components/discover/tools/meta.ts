import type { MoveName } from "@/components/graphics";

/**
 * Display copy per tool (the DB keeps the tool's own name). The Kettlebell Roadmap gets a
 * result-oriented title; the old name stays as the subtitle. `draft` marks copy awaiting Mike's sign-off.
 */
export const TOOL_META: Record<string, { title: string; subtitle?: string; draft?: string; move: MoveName; promise: string; minutes: number }> = {
  "kettlebell-selector": { title: "Kettlebell Selector", move: "swing", promise: "Your three bells, from first to heavy", minutes: 1 },
  "stretch-test": { title: "Stretch Test", move: "squat", promise: "Your mobility profile across five positions", minutes: 3 },
  "readiness-check": { title: "Readiness Check", move: "breathing", promise: "Push, modify or recover — today's answer", minutes: 1 },
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
