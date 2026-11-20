import "server-only";
import { cache } from "react";
import {
  myRoadmap, readinessToday, roadmapBellInputs, roadmapCatalog,
  type AttemptWrite, type MyRoadmap, type RoadmapMovementRow, type RoadmapPlacementRow,
} from "@ms/api";
import {
  MTK_LESSON_META, ROADMAP_CATALOG, bellAdvice, currentPhase, nextNode, nodeStates, placementSummary, roadmapHandoff,
  type BellAdvice, type NodeInfo, type RoadmapReadiness, type RoadmapBenchmark, type RoadmapPhase,
} from "@ms/core";
import { getAccessMap, isAdminViewer, mockPersona } from "@/lib/access";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Kettlebell Roadmap Coach (spec 14): one loader for the tool home, map, re-tests and sessions.
 * Preview (MOCK_DATA=1): an in-memory store per mock persona, so the whole loop (test → map → re-test →
 * session) works locally. "free" starts with no placement; the others start placed in Phase 2.
 */

export type MtkLink = { id: string; title: string; minutes: number; href: string };

export interface RoadmapView {
  movements: RoadmapMovementRow[];
  benchmarks: RoadmapBenchmark[];
  placement: RoadmapPlacementRow | null;
  attempts: MyRoadmap["attempts"];
  nodes: NodeInfo[];
  phase: RoadmapPhase;
  next: NodeInfo | null;
  summary: string | null;
  /** Phase sessions and re-tests: members with any plan or purchased program (and admins). */
  member: boolean;
  bell: BellAdvice;
  readiness: RoadmapReadiness;
  mtk: Record<string, MtkLink[]>;
  handoff: ReturnType<typeof roadmapHandoff>;
  /** Fallback (Halo / staggered stance) chosen per movement on the last attempt. */
  variants: Record<string, "main" | "fallback">;
}

/* ---------------------------------------------------------------- preview store */

type MockState = { placement: RoadmapPlacementRow | null; attempts: MyRoadmap["attempts"] };
const g = globalThis as unknown as { __roadmapMock?: Map<string, MockState> };
const store = (g.__roadmapMock ??= new Map());

function seedMock(persona: string): MockState {
  if (persona === "free") return { placement: null, attempts: [] };
  const at = "2026-11-18T09:00:00.000Z";
  const a = (benchmark: string, movement: string, day: string, passed: boolean, source: "placement" | "retest", setReps: number[]) =>
    ({ benchmark, movement, day, passed, nasal: true, source, variant: "main" as const, check: null, effort: "ok", bellKg: 16, at, setReps });
  return {
    placement: { id: "mock-placement", answers: { time: "1-3y", injury: "none", guess: 3 }, overhead_ok: true, start_phase: 2, result_phase: 2, status: "done", created_at: at },
    attempts: [
      a("p2-lunge", "rack-lunge", "2026-11-18", true, "placement", [8, 8]),
      a("p2-carry", "farmers-carry", "2026-11-18", true, "placement", [1, 1]),
      a("p2-press", "standing-press", "2026-11-18", false, "placement", [7, 6]),
      a("p2-swing", "two-hand-swing", "2026-11-20", true, "retest", [10, 10, 10, 10, 10]),
    ],
  };
}

export async function mockState(): Promise<MockState> {
  const key = (await mockPersona()).key;
  if (!store.has(key)) store.set(key, seedMock(key));
  return store.get(key)!;
}

export async function mockSavePlacement(p: { answers: Record<string, unknown>; overheadOk: boolean | null; startPhase: number | null; resultPhase: RoadmapPhase; status: RoadmapPlacementRow["status"]; attempts: AttemptWrite[] }) {
  const key = (await mockPersona()).key;
  const now = new Date().toISOString();
  store.set(key, {
    placement: { id: `mock-${Date.now()}`, answers: p.answers, overhead_ok: p.overheadOk, start_phase: p.startPhase, result_phase: p.resultPhase, status: p.status, created_at: now },
    attempts: p.attempts.map((a) => ({ ...a, check: null, at: now })),
  });
}

export async function mockLogAttempt(a: AttemptWrite) {
  (await mockState()).attempts.push({ ...a, check: null, at: new Date().toISOString() });
}

/* ---------------------------------------------------------------- MTK lessons per movement */

const MTK_TYPES = new Set(["technique", "fault", "precheck"]);
function mtkFor(movements: RoadmapMovementRow[]): Record<string, MtkLink[]> {
  const byId = new Map(MTK_LESSON_META.map((l) => [l.id, l]));
  const out: Record<string, MtkLink[]> = {};
  for (const m of movements) {
    const picked = m.mtkLessonIds?.length
      ? m.mtkLessonIds.map((id) => byId.get(id)).filter((x) => !!x)
      : MTK_LESSON_META.filter((l) => l.movement === m.mtk && MTK_TYPES.has(l.type))
          .sort((a, b) => Number(b.essential) - Number(a.essential) || a.s - b.s || a.q - b.q);
    out[m.key] = picked.slice(0, 3).map((l) => ({ id: l.id, title: l.title, minutes: l.minutes, href: `/programs/mastering-the-kettlebell/course/${l.id}` }));
  }
  return out;
}

/* ---------------------------------------------------------------- the view */

async function memberAccess(): Promise<boolean> {
  if (await isAdminViewer()) return true;
  for (const a of (await getAccessMap()).values()) if (a.state === "owned" || a.state === "included") return true;
  return false;
}

/** Start of the member's day as ISO (UTC fallback); good enough for "today's readiness". */
const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

export const loadRoadmap = cache(async (): Promise<RoadmapView | null> => {
  const { supabase, user } = await getUser();
  if (!user) return null;
  let movements: RoadmapMovementRow[];
  let benchmarks: RoadmapBenchmark[];
  let mine: MyRoadmap;
  let bellIn: { selectorKg: number | null; profileBells: string | null };
  let readiness: RoadmapReadiness;
  if (MOCK) {
    movements = ROADMAP_CATALOG.movements.map((m) => ({ ...m, mtkLessonIds: null }));
    benchmarks = ROADMAP_CATALOG.benchmarks;
    mine = await mockState();
    bellIn = { selectorKg: null, profileBells: "16 kg, 20 kg pair" };
    readiness = (await mockPersona()).readinessLow ? "recovery" : null;
  } else {
    const cat = await roadmapCatalog(supabase);
    movements = cat.movements;
    benchmarks = cat.benchmarks;
    [mine, bellIn, readiness] = await Promise.all([
      myRoadmap(supabase, user.id),
      roadmapBellInputs(supabase, user.id).catch(() => ({ selectorKg: null, profileBells: null })),
      readinessToday(supabase, user.id, startOfToday()).catch(() => null),
    ]);
  }
  const cat = { movements, benchmarks };
  const placement = mine.placement;
  const nodes = nodeStates(cat, placement ? { phase: placement.result_phase as RoadmapPhase } : null, mine.attempts);
  const phase = currentPhase(nodes);
  const recent = mine.attempts.slice(-6);
  const variants: Record<string, "main" | "fallback"> = {};
  for (const a of mine.attempts) variants[a.movement] = a.variant ?? "main";
  if (placement?.overhead_ok === false && !variants["hk-press"]) variants["hk-press"] = "fallback";
  return {
    movements, benchmarks, placement, attempts: mine.attempts, nodes, phase, next: nextNode(nodes),
    summary: placement ? placementSummary(cat, nodes) : null,
    member: await memberAccess(),
    bell: bellAdvice({ ...bellIn, tooHard: recent.filter((a) => a.effort === "too_hard").length }),
    readiness, mtk: mtkFor(movements), handoff: roadmapHandoff(phase), variants,
  };
});
