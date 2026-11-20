import { WeekTrace, type WeekDay } from "@/components/signature";

/** Gallery week (Today's real one is built from the member's plan with the same component). */
export const WEEK: WeekDay[] = [
  { weekday: "M", date: 16, move: "swing", state: "done" },
  { weekday: "T", date: 17, move: "press", state: "done" },
  { weekday: "W", date: 18, move: "halo", state: "done" },
  { weekday: "T", date: 19, move: "getup", state: "done" },
  { weekday: "F", date: 20, move: "rest", caption: "Recovery", state: "today", progress: 0.45 },
  { weekday: "S", date: 21, move: null, state: "ahead" },
  { weekday: "S", date: 22, move: "swing", state: "ahead" },
];

export function Week() {
  return <WeekTrace days={WEEK} />;
}
