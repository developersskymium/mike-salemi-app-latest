import { resolveOutcome, scoreForm, type ReadinessForm } from "@ms/core";

/** One question screen. */
export type Step = {
  id: string;
  eyebrow?: string;
  question: string;
  help?: string;
  note?: { title?: string; body?: string; points?: string[] } | null;
  options: { value: string; label: string; description?: string }[];
};

export type Answers = Record<string, string>;

export type SelectorResult = { kind: "selector"; headline: string; summary: string; bells: { size: number; label: string }[]; notes: string[] };
export type StretchResult = {
  kind: "stretch";
  headline: string;
  summary: string;
  score: number;
  max: number;
  points: string[];
  tests: { label: string; answer: string; score: number; max: number }[];
};
export type ReadinessResult = {
  kind: "readiness";
  headline: string;
  summary: string;
  score: number;
  max: number;
  band: "green" | "amber" | "red";
  outcome: string;
  zones: { band: "full" | "modified" | "recovery"; from: number; to: number }[];
};
export type RoadmapResult = {
  kind: "roadmap";
  headline: string;
  summary: string;
  phase: number;
  phases: { label: string; name: string }[];
  movements: string[];
  skills: string[];
};
export type ToolResultView = SelectorResult | StretchResult | ReadinessResult | RoadmapResult;

export type ToolDef = {
  /** Steps for the answers so far (may depend on earlier answers). */
  steps: (a: Answers) => Step[];
  result: (a: Answers) => ToolResultView | null;
  description: string;
  minutes: number;
};

type Cfg = Record<string, unknown>;
type Opt = { value: string; label: string; description?: string };

const lines = (s: unknown) =>
  typeof s === "string"
    ? s
        .split("\n")
        .map((l) => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : [];

/* ------------------------------------------------------------- selector */
function selector(cfg: Cfg): ToolDef {
  type Q = { id: string; eyebrow?: string; question: string; help?: string; options: Opt[]; options_by_gender?: Record<string, Opt[]> };
  type S = { answers: Answers; headline: string; summary: string; bells: { size: number; label: string }[]; notes: string[] };
  const qs = (cfg.questions as Q[]) ?? [];
  const scenarios = (cfg.scenarios as S[]) ?? [];
  return {
    description: (cfg.description as string) ?? "",
    minutes: 1,
    steps: (a) =>
      qs.map((q) => ({
        id: q.id,
        eyebrow: q.eyebrow,
        question: q.question,
        help: q.help,
        options: (a.gender && q.options_by_gender?.[a.gender]) || q.options,
      })),
    result: (a) => {
      const s = scenarios.find((x) => Object.entries(x.answers).every(([k, v]) => a[k] === v));
      return s ? { kind: "selector", headline: s.headline, summary: s.summary, bells: s.bells, notes: s.notes } : null;
    },
  };
}

/* ------------------------------------------------------------- stretch */
const SHORT: Record<string, string> = { "toe-touch": "Toe touch", "deep-squat": "Deep squat", overhead: "Overhead reach", ankle: "Ankle", rotation: "T-spine rotation" };

function stretch(cfg: Cfg): ToolDef {
  type Q = { id: string; question: string; options: (Opt & { score: number })[] };
  type B = { title: string; summary: string; points: string[]; maxScore: number };
  const qs = (cfg.questions as Q[]) ?? [];
  const bands = [...((cfg.bands as B[]) ?? [])].sort((a, b) => a.maxScore - b.maxScore);
  return {
    description: (cfg.description as string) ?? "",
    minutes: 3,
    steps: () => qs.map((q, i) => ({ id: q.id, eyebrow: `Test ${i + 1} · ${SHORT[q.id] ?? ""}`.trim(), question: q.question, options: q.options })),
    result: (a) => {
      const tests = qs.map((q) => {
        const o = q.options.find((x) => x.value === a[q.id]);
        return { label: SHORT[q.id] ?? q.id, answer: o?.label ?? "", score: o?.score ?? 0, max: Math.max(...q.options.map((x) => x.score)) };
      });
      const score = tests.reduce((s, t) => s + t.score, 0);
      const band = bands.find((b) => score <= b.maxScore) ?? bands.at(-1);
      if (!band) return null;
      return { kind: "stretch", headline: band.title, summary: band.summary, points: band.points, score, max: tests.reduce((s, t) => s + t.max, 0), tests };
    },
  };
}

/* ------------------------------------------------------------- readiness */
const ZONE = { green: "full", amber: "modified", red: "recovery" } as const;

export function readinessZones(form: ReadinessForm) {
  const out: ReadinessResult["zones"] = [];
  const push = (band: ReadinessResult["zones"][number]["band"], from: number, to: number) => {
    const last = out.at(-1);
    if (last && last.band === band) last.to = to;
    else out.push({ band, from, to });
  };
  let cursor = 0;
  for (const b of [...form.bands].sort((x, y) => x.minScore - y.minScore)) {
    if (b.minScore > cursor) push("full", cursor, b.minScore); // gaps fall back to the full workout
    push(ZONE[b.band], b.minScore, b.maxScore);
    cursor = b.maxScore;
  }
  if (cursor < form.maxScore) push("full", cursor, form.maxScore);
  return out;
}

function readiness(form: ReadinessForm | null): ToolDef {
  return {
    description: "Five honest questions before you train. Your score tells you whether to push, modify, recover or rest today.",
    minutes: 1,
    steps: () =>
      (form?.questions ?? []).map((q, i) => ({
        id: q.key,
        eyebrow: `Question ${i + 1}`,
        question: q.prompt,
        note: q.note as Step["note"],
        options: q.options.map((o) => ({ value: o.value, label: o.label })),
      })),
    result: (a) => {
      if (!form) return null;
      const score = scoreForm(form, a);
      const o = resolveOutcome(form, score);
      const lead =
        o.outcome === "workout" && o.band === "green"
          ? "You're ready. Train as written today."
          : o.outcome === "workout"
            ? "Train today, with the modified chart."
            : "";
      return {
        kind: "readiness",
        headline: o.name,
        summary: o.message || lead,
        score,
        max: form.maxScore,
        band: o.band,
        outcome: o.outcome,
        zones: readinessZones(form),
      };
    },
  };
}

/* ------------------------------------------------------------- roadmap */
function roadmap(cfg: Cfg): ToolDef {
  type P = { id: string; title: string; intro: string; movements: string; benchmarks: string; skills: string };
  const phases = (cfg.phases as P[]) ?? [];
  const split = (t: string) => {
    const [label, name] = t.split(/\s+-\s+/);
    return { label: label ?? t, name: name ?? "" };
  };
  // Ask about each phase's benchmarks until the first "not yet" (the last phase has no gate).
  const gates = phases.slice(0, -1);
  return {
    description: "Answer honestly about each phase's benchmarks. You'll see which phase to train now and the lifts that matter most.",
    minutes: 2,
    steps: (a) => {
      const out: Step[] = [];
      for (const p of gates) {
        const { label, name } = split(p.title);
        out.push({
          id: p.id,
          eyebrow: `${label} · ${name}`,
          question: `Can you hit the ${label} benchmarks today?`,
          note: { title: "The benchmarks", points: lines(p.benchmarks) },
          options: [
            { value: "yes", label: "Yes, all of them" },
            { value: "no", label: "Not yet" },
          ],
        });
        if (a[p.id] === "no") break;
      }
      return out;
    },
    result: (a) => {
      const idx = Math.min(gates.findIndex((p) => a[p.id] !== "yes") === -1 ? phases.length - 1 : gates.findIndex((p) => a[p.id] !== "yes"), phases.length - 1);
      const p = phases[idx];
      if (!p) return null;
      const { label, name } = split(p.title);
      return {
        kind: "roadmap",
        headline: `${label}: ${name}`,
        summary: p.intro,
        phase: idx,
        phases: phases.map((x) => split(x.title)),
        movements: lines(p.movements),
        skills: lines(p.skills),
      };
    },
  };
}

export function toolDef(id: string, config: Cfg, form: ReadinessForm | null): ToolDef | null {
  switch (id) {
    case "kettlebell-selector":
      return selector(config);
    case "stretch-test":
      return stretch(config);
    case "readiness-check":
      return readiness(form);
    case "kettlebell-roadmap":
      return roadmap(config);
    default:
      return null;
  }
}
