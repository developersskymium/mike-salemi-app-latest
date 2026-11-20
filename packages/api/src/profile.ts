import type { DB } from "./client";
import type { IntakeAnswers, IntakeForm, IntakeQuestion } from "./intake";

/**
 * One training profile per member (spec 11 #1): the answers every intake shares. Intakes prefill from it,
 * show a compact "From your profile" summary, ask only what is still missing, and write their answers back.
 * Stored in `training_profiles` (written only through `save_training_profile`).
 */
export interface TrainingProfile {
  goal_kind?: string;
  target_date?: string;
  days_per_week?: number;
  /** Training weekdays, 0 = Sunday. */
  training_days?: number[];
  session_minutes?: number;
  equipment?: string[];
  bell_weights?: string;
  /** 0 new · 1 some · 2 regular (1–3 years) · 3 experienced / coach. */
  kb_experience?: number;
  kb_level?: "beginner" | "intermediate" | "advanced";
  focus_areas?: string[];
  limitations?: string;
}

export type ProfileKey = keyof TrainingProfile;

const TRAINING_DAY_FORMS = new Set(["goal-setting", "a4l-intake", "mini-series-intake", "swing-series-intake", "working-in-intake"]);
const KB_EXPERIENCE_FORMS = new Set(["mini-series-intake", "swing-series-intake"]);

const str = (v: IntakeAnswers[string] | undefined) => (typeof v === "string" ? v.trim() : "");
const list = (v: IntakeAnswers[string] | undefined) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function daysFrom(v: string): number | undefined {
  const m = /^(\d)/.exec(v);
  if (m) return Number(m[1]);
  if (/every day/i.test(v)) return 7;
  if (/most days/i.test(v)) return 5;
  return undefined;
}

const MTK_EXP = ["Completely new", "Used kettlebells a few times", "Less than 1 year", "1–3 years", "More than 3 years", "I regularly coach kettlebells"];
const MTK_EXP_LEVEL = [0, 1, 1, 2, 3, 3];

/** The shared answers in one intake attempt, as a profile patch. */
export function profileFromAnswers(formKey: string | null, a: IntakeAnswers): TrainingProfile {
  const key = formKey ?? "";
  const p: TrainingProfile = {};
  if (key === "goal-setting") {
    if (str(a.goal_kind)) p.goal_kind = str(a.goal_kind);
    if (str(a.target_date)) p.target_date = str(a.target_date);
    const d = Number(str(a.days_per_week));
    if (d) p.days_per_week = d;
    const m = Number(str(a.session_length));
    if (m) p.session_minutes = m;
    if (list(a.equipment).length) p.equipment = list(a.equipment);
    if (str(a.injuries)) p.limitations = str(a.injuries);
  }
  if (TRAINING_DAY_FORMS.has(key) && str(a.days)) {
    const d = daysFrom(str(a.days));
    if (d) p.days_per_week = d;
  }
  if (key !== "goal-setting" && key !== "path-intake" && key !== "mom-prep-intake" && str(a.constraints)) p.limitations = str(a.constraints);
  if (KB_EXPERIENCE_FORMS.has(key) && str(a.experience)) {
    p.kb_experience = { "New to kettlebells": 0, "Some experience": 1, Experienced: 3 }[str(a.experience)] ?? undefined;
  }
  if (key === "mtk-intake" && str(a.experience)) {
    const i = MTK_EXP.indexOf(str(a.experience));
    if (i >= 0) p.kb_experience = MTK_EXP_LEVEL[i];
  }
  if (key === "kbl-intake") {
    const lv = str(a.kettlebell_level);
    if (lv === "beginner" || lv === "intermediate" || lv === "advanced") p.kb_level = lv;
    if (str(a.used_kettlebell) === "no") p.kb_experience = 0;
    if (list(a.focus_areas).length) p.focus_areas = list(a.focus_areas);
  }
  if (typeof a.bell_weights === "string" && a.bell_weights.trim()) p.bell_weights = a.bell_weights.trim();
  for (const k of Object.keys(p) as ProfileKey[]) if (p[k] === undefined) delete p[k];
  return p;
}

const pick = (q: IntakeQuestion, want: string) => q.options?.find((o) => o.value === want)?.value;

function daysAnswer(q: IntakeQuestion, n: number): string | undefined {
  const opts = q.options ?? [];
  if (n >= 7) return opts.find((o) => /every day/i.test(o.value))?.value ?? opts.find((o) => /most days/i.test(o.value))?.value ?? opts[opts.length - 1]?.value;
  const exact = opts.find((o) => daysFrom(o.value) === n && /^\d/.test(o.value));
  if (exact) return exact.value;
  if (n >= 5) return opts.find((o) => /most days/i.test(o.value))?.value ?? opts[opts.length - 1]?.value;
  // Nearest number below.
  return [...opts].reverse().find((o) => (daysFrom(o.value) ?? 99) <= n)?.value;
}

/** One question's answer from the profile, or undefined when the profile doesn't know it. */
function answerFor(formKey: string, q: IntakeQuestion, p: TrainingProfile): IntakeAnswers[string] | undefined {
  switch (q.id) {
    case "days":
      return p.days_per_week ? daysAnswer(q, p.days_per_week) : undefined;
    case "days_per_week":
      return p.days_per_week ? pick(q, String(Math.min(5, Math.max(2, p.days_per_week)))) : undefined;
    case "session_length":
      return p.session_minutes ? pick(q, String(p.session_minutes)) : undefined;
    case "equipment": {
      const v = (p.equipment ?? []).filter((e) => q.options?.some((o) => o.value === e));
      return v.length ? v : undefined;
    }
    case "injuries":
      return p.limitations;
    case "constraints":
      return formKey === "path-intake" || formKey === "mom-prep-intake" ? undefined : p.limitations;
    case "goal_kind":
      return p.goal_kind ? pick(q, p.goal_kind) : undefined;
    case "target_date":
      return p.target_date;
    case "kettlebell_level":
      return p.kb_level ? pick(q, p.kb_level) : undefined;
    case "used_kettlebell":
      return p.kb_experience == null ? (p.kb_level ? "yes" : undefined) : p.kb_experience > 0 ? "yes" : "no";
    case "focus_areas": {
      const v = (p.focus_areas ?? []).filter((e) => q.options?.some((o) => o.value === e));
      return v.length ? v : undefined;
    }
    case "experience":
      if (p.kb_experience == null) return undefined;
      if (KB_EXPERIENCE_FORMS.has(formKey)) return pick(q, ["New to kettlebells", "Some experience", "Some experience", "Experienced"][p.kb_experience]!);
      if (formKey === "mtk-intake") return pick(q, ["Completely new", "Used kettlebells a few times", "1–3 years", "More than 3 years"][p.kb_experience]!);
      return undefined;
    default:
      return undefined;
  }
}

export interface Prefill {
  answers: IntakeAnswers;
  /** Question ids answered from the profile. */
  filled: string[];
  /** Compact lines for the "From your profile" summary. */
  summary: { id: string; label: string; value: string }[];
}

/** Prefill an intake from the profile; earlier answers to the same form win where given. */
export function prefillIntake(form: IntakeForm, profile: TrainingProfile, earlier?: IntakeAnswers | null): Prefill {
  const key = form.key ?? "";
  const answers: IntakeAnswers = {};
  const filled: string[] = [];
  const summary: Prefill["summary"] = [];
  for (const s of form.steps) {
    for (const q of s.questions) {
      const fromEarlier = earlier?.[q.id];
      const fromProfile = answerFor(key, q, profile);
      const v = fromProfile ?? undefined;
      if (v === undefined || (Array.isArray(v) && !v.length) || v === "") {
        if (fromEarlier != null && fromEarlier !== "") answers[q.id] = fromEarlier;
        continue;
      }
      answers[q.id] = v;
      filled.push(q.id);
      const label = Array.isArray(v) ? v.map((x) => q.options?.find((o) => o.value === x)?.label ?? x).join(", ") : q.options?.find((o) => o.value === v)?.label ?? String(v);
      summary.push({ id: q.id, label: SUMMARY_LABEL[q.id] ?? q.label, value: label });
    }
  }
  return { answers, filled, summary };
}

const SUMMARY_LABEL: Record<string, string> = {
  days: "Days a week",
  days_per_week: "Days a week",
  session_length: "Session length",
  equipment: "Equipment",
  injuries: "Limits & injuries",
  constraints: "Limits & injuries",
  goal_kind: "Main goal",
  target_date: "Target date",
  kettlebell_level: "Kettlebell level",
  used_kettlebell: "Used a kettlebell",
  focus_areas: "Focus areas",
  experience: "Kettlebell experience",
};

/** Merge stored profile with what can be derived from earlier intake answers (stored values win). */
export function mergeProfile(derived: TrainingProfile[], stored: TrainingProfile | null): TrainingProfile {
  return Object.assign({}, ...derived, stored ?? {}) as TrainingProfile;
}

// ---------------------------------------------------------------- reads / writes
export async function myTrainingProfile(sb: DB, userId: string): Promise<TrainingProfile> {
  const [{ data: row }, { data: resp }] = await Promise.all([
    sb.from("training_profiles").select("data").eq("user_id", userId).maybeSingle(),
    sb.from("intake_responses").select("answers, created_at, intake_forms(key)").eq("user_id", userId).order("created_at", { ascending: true }).limit(100),
  ]);
  const derived = (resp ?? []).map((r) => profileFromAnswers((r.intake_forms as unknown as { key: string | null } | null)?.key ?? null, (r.answers ?? {}) as IntakeAnswers));
  return mergeProfile(derived, (row?.data ?? null) as TrainingProfile | null);
}

export async function saveTrainingProfile(sb: DB, patch: TrainingProfile, source = "profile"): Promise<TrainingProfile> {
  const { data, error } = await sb.rpc("save_training_profile", { p_patch: patch as never, p_source: source });
  if (error) throw new Error(error.message);
  return (data ?? {}) as TrainingProfile;
}

// ---------------------------------------------------------------- one schedule
export interface ScheduleConflict {
  on_date: string;
  items: number;
  plan_ids: string[];
}

export async function scheduleConflicts(sb: DB, from?: string): Promise<ScheduleConflict[]> {
  const { data, error } = await sb.rpc("schedule_conflicts", { p_from: from ?? undefined });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduleConflict[];
}

/** Move a plan's clashing sessions to the next free day, or keep both. */
export async function resolveScheduleConflicts(sb: DB, planId: string, mode: "next_free" | "keep") {
  const { data, error } = await sb.rpc("resolve_schedule_conflicts", { p_plan: planId, p_mode: mode });
  if (error) throw new Error(error.message);
  return data as { mode: string; moved: number };
}

/** Put an MTK learning plan on the main schedule (one session per learning day). Returns the member plan id. */
export async function scheduleMtkPlan(sb: DB, mtkPlanId: string, days: number[], startsOn?: string | null) {
  const { data, error } = await sb.rpc("schedule_mtk_plan", { p_mtk_plan: mtkPlanId, p_days: days, p_starts_on: startsOn ?? undefined });
  if (error) throw new Error(error.message);
  return data as string;
}
