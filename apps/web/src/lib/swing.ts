/**
 * Swing Set-Up Coach (spec 13): web-side constants and shapes. Client-safe.
 * The geometry, cues and clips live in @ms/core (swing-setup.ts).
 */
import type { BellDistance, FaultId, Measures, StepStatus, SwingStepId } from "@ms/core";

export const SWING_TOOL_ID = "swing-setup";
export const SWING_PROGRAM_SLUG = "what-your-kettlebell-swing-is-missing";

/** The program's lesson per step and bonus (ids from the v2 database, Nov 21). */
export const SWING_LESSONS: Record<SwingStepId | "approach" | "checklist" | "program", { id: string; title: string }> = {
  feet: { id: "2d67083f-36da-52f6-8ae6-f60a9e1feb72", title: "Step 1 · Feet" },
  hips: { id: "fa36f912-852a-504b-8f4d-67cd6f115879", title: "Step 2 · Hips" },
  back: { id: "ca8cf4fd-cc39-57aa-bef2-2ec296c287f5", title: "Step 3 · Back" },
  shoulders: { id: "8e42cd09-e26d-5dcf-96e5-4d76933b6cc8", title: "Step 4 · Shoulders" },
  head: { id: "98d795a0-5927-55b8-b17c-190d4f3ae6aa", title: "Step 5 · Head and neck" },
  grip: { id: "bbd19aa6-878b-5ea9-85d0-bcf48e1475a8", title: "Step 6 · Grip" },
  breath: { id: "c7b266e2-8585-543b-9ebd-7b98849fd2bc", title: "Step 7 · Breath" },
  approach: { id: "ca2e2bbc-78b0-5c4f-b684-51a6bbd66e5d", title: "The Approach" },
  checklist: { id: "bb970147-f124-5072-bde7-c2f4743e34c0", title: "Review Checklist" },
  program: { id: "3511a5ce-5fb8-59c3-9fe7-de84736db593", title: "Two Week Swing Program" },
};

export const lessonHref = (key: keyof typeof SWING_LESSONS) => `/programs/${SWING_PROGRAM_SLUG}/course/${SWING_LESSONS[key].id}`;

export type Goal = "learn" | "fix" | "program";
export type BellType = "competition" | "cast-iron";

export interface SetupProfile {
  neck_history: boolean;
  bell_type: BellType;
  bell_kg: number | null;
  goal: Goal | null;
  disclaimer_at: string | null;
  /** "I'm 18 or older", confirmed with the disclaimer (required for the camera check). */
  adult_confirmed_at?: string | null;
}

export interface SavedCheck {
  id: string;
  created_at: string;
  measures: Measures & {
    overlay?: Record<"ear" | "shoulder" | "hip" | "knee" | "ankle", { x: number; y: number }> | null;
    aspect?: number;
    neck_history?: boolean;
    bell_distance?: BellDistance;
  };
  steps: Record<SwingStepId, StepStatus>;
  main_fault: FaultId | null;
  faults: FaultId[];
}

export interface ProgramSet {
  session: number;
  set_no: number;
  reps: number;
  feel: "easy" | "right" | "hard" | null;
  created_at: string;
}

export interface ProgramRun {
  id: string;
  bell_kg: number;
  started_at: string;
  finished_at: string | null;
  sets: ProgramSet[];
}

export interface SwingHomeData {
  profile: SetupProfile | null;
  /** Newest first. */
  checks: SavedCheck[];
  run: ProgramRun | null;
  /** Prefills: the Kettlebell Selector's working bell and the member's sex from it; the training profile's bells. */
  prefill: { selectorKg: number | null; sex: "male" | "female" | null; profileBells: string | null };
}

/** The member's first bell weight in a free-text list like "12 kg, 16 kg" (training profile). */
export function firstKg(text: string | null | undefined): number | null {
  const m = text?.match(/(\d{1,2}(?:\.\d)?)\s*(kg)?/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 4 && n <= 48 ? n : null;
}
