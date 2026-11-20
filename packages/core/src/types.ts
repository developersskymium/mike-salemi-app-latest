/**
 * Domain types shared by web (now) and the phone apps (later).
 * They mirror the v2 database (supabase/migrations) but are platform-neutral:
 * no React, no DOM, no Supabase client in this package.
 */

export type Uuid = string;

export type ProgramType = "course" | "day_program" | "challenge" | "live" | "retreat" | "coaching" | "tool" | "bundle";
export type LearningMode = "immersion" | "self_guided" | "library";
export type StepSpecial = "none" | "readiness" | "workout" | "overview" | "completion";
export type BandOutcome = "workout" | "recovery" | "rest";
export type BandColour = "green" | "amber" | "red";
export type AccessState = "free" | "included" | "owned" | "org" | "locked" | "preview";

export interface Program {
  id: Uuid;
  slug: string;
  name: string;
  type: ProgramType;
  isFree: boolean;
  tagline?: string | null;
  sectionLabel: string; // Phase | Week | Module
  lessonLabel: string; // Day | Lesson
  sequenceLocked: boolean;
  modes: LearningMode[];
}

export interface ProgramPath {
  id: Uuid;
  programId: Uuid;
  key?: string | null;
  kind: "level" | "focus";
  name: string;
  shortName?: string | null;
  position: number;
}

export interface Section {
  id: Uuid;
  programId: Uuid;
  pathId: Uuid | null;
  key?: string | null;
  title: string;
  subtitle?: string | null;
  position: number;
}

export interface Lesson {
  id: Uuid;
  sectionId: Uuid;
  programId: Uuid;
  pathId: Uuid | null;
  key?: string | null;
  title: string;
  pageType: "overview" | "transition" | null; // null = training day / normal lesson
  dayNumber?: number | null;
  dayType?: string | null;
  formId?: string | null;
  starterTableId?: string | null;
  position: number;
}

export interface VideoRef {
  /** Numeric Vimeo id. */
  providerId: string;
  /** Unlisted privacy hash, when the video needs one. */
  privacyHash?: string | null;
  title?: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
}

export interface Step {
  id: Uuid;
  lessonId: Uuid;
  key?: string | null;
  title: string;
  kind?: string | null;
  special: StepSpecial;
  isRequired: boolean;
  position: number;
  video?: VideoRef | null;
  clips: (VideoRef & { title: string })[];
}

/** A lesson with its ordered steps; the unit a day player renders. */
export interface LessonWithSteps extends Lesson {
  steps: Step[];
}

/** An ordered curriculum for one program path (KBL Level I, MTK, …). */
export interface Curriculum {
  program: Program;
  path: ProgramPath | null;
  sections: Section[]; // ordered
  lessons: LessonWithSteps[]; // ordered: by section position, then lesson position
}

// ------------------------------------------------------------------ readiness
export interface FormOption {
  value: string;
  label: string;
  weight: number;
}
export interface FormQuestion {
  key: string;
  position: number;
  prompt: string;
  note?: { title?: string; body: string } | null;
  options: FormOption[];
}
export interface FormBand {
  name: string;
  band: BandColour;
  outcome: BandOutcome;
  tableId: string | null;
  message: string;
  minScore: number;
  maxScore: number;
  position: number;
}
export interface ReadinessForm {
  id: string;
  title: string;
  maxScore: number;
  defaultTableId: string | null;
  questions: FormQuestion[];
  bands: FormBand[];
}
export interface ReadinessOutcome {
  score: number;
  name: string;
  band: BandColour;
  outcome: BandOutcome;
  tableId: string | null;
  message: string;
}

export interface WorkoutRow {
  circuit?: string;
  exercise?: string;
  rest?: string;
  restDir?: "down" | "loop" | string;
  restArrow?: boolean;
  intensity?: string;
  reps?: string;
  sets?: string;
  tempo?: string;
  separator?: boolean | string;
  note?: string;
  [key: string]: unknown;
}
export interface WorkoutTable {
  id: string;
  title: string;
  rows: WorkoutRow[];
  notes?: string | null;
  images?: { url: string; alt?: string }[];
  /** Circuit rest breaks, legacy shape: shown after the last row of circuit `after`. */
  separators?: { after: string; label: string }[];
}

// ------------------------------------------------------------------ progress
/** Completed step ids for the signed-in member. */
export type CompletedSteps = ReadonlySet<Uuid>;

export interface LessonProgress {
  lessonId: Uuid;
  done: number;
  total: number;
  complete: boolean;
}
