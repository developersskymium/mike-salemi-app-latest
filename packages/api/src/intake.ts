import type { DB } from "./client";

export interface IntakeOption {
  value: string;
  label: string;
  description?: string;
  bullets?: string[];
}

export interface IntakeQuestion {
  id: string;
  label: string;
  help?: string;
  type: "single" | "multi" | "text" | "date" | "number";
  required?: boolean;
  options?: IntakeOption[];
}

/** intake_forms.questions is an ordered list of steps (one screen each). */
export interface IntakeStep {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  note?: { title: string; points: string[] };
  questions: IntakeQuestion[];
}

export interface IntakeForm {
  id: string;
  key: string | null;
  programId: string | null;
  title: string;
  introduction: string | null;
  steps: IntakeStep[];
  version: number;
}

export type IntakeAnswers = Record<string, string | string[] | number | null>;

export interface IntakeResult {
  response_id: string;
  form_key: string | null;
  // KBL / MTK
  path_key?: string;
  path_id?: string | null;
  label?: string;
  headline?: string;
  summary?: string;
  notes?: string[];
  reasons?: string[];
  initial_focus?: string[];
  start_section?: number;
  pace?: string;
  scores?: Record<string, number>;
  bucket?: string;
  flags?: Record<string, boolean>;
  // program intakes (result kind 'template'): "Your program approach"
  priorities?: string[];
  caution?: string;
  // goal setting
  goal_id?: string;
  goal_kind?: string;
  approach?: "guided" | "custom";
  suggested_template?: { id: string; slug: string; name: string; weeks: number; days_per_week: number; description: string | null } | null;
  [k: string]: unknown;
}

function toForm(r: {
  id: string; key: string | null; program_id: string | null; title: string; introduction: string | null; questions: unknown; version: number;
}): IntakeForm {
  return {
    id: r.id, key: r.key, programId: r.program_id, title: r.title, introduction: r.introduction,
    steps: (r.questions ?? []) as IntakeStep[], version: r.version,
  };
}

/** A published intake by key: 'goal-setting', 'kbl-intake', 'mtk-intake'. */
export async function getIntakeForm(sb: DB, key: string): Promise<IntakeForm | null> {
  const { data, error } = await sb.from("intake_forms").select("*").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toForm(data) : null;
}

/** The intake attached to a program, if any. */
export async function programIntake(sb: DB, programId: string): Promise<IntakeForm | null> {
  const { data, error } = await sb.from("intake_forms").select("*").eq("program_id", programId).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toForm(data) : null;
}

/** Saves the answers (retakes add a new row) and returns the recommendation. */
export async function submitIntake(sb: DB, formId: string, answers: IntakeAnswers): Promise<IntakeResult> {
  const { data, error } = await sb.rpc("submit_intake", { p_form: formId, p_answers: answers as never });
  if (error) throw new Error(error.message);
  return data as IntakeResult;
}

/** The member's latest response to a form (or null). */
export async function latestIntakeResponse(sb: DB, userId: string, formId: string) {
  const { data, error } = await sb
    .from("intake_responses")
    .select("*")
    .eq("user_id", userId)
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Every response the member has given to a form, newest first (retake history). */
export async function intakeHistory(sb: DB, userId: string, formId: string) {
  const { data, error } = await sb
    .from("intake_responses")
    .select("id, answers, result, created_at")
    .eq("user_id", userId)
    .eq("form_id", formId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
