"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ROADMAP_PHASES, bellFor, nodeStates, placementBlocked, placementLength, placementNext, placementStart, placementSummary,
  type BellAdvice, type PlacementAnswers, type RoadmapBenchmark, type RoadmapMovement, type RoadmapPhase, type TrainingTime,
} from "@ms/core";
import type { AttemptWrite } from "@ms/api";
import { ChoiceCards, QuestionShell } from "@/components/intake/QuestionShell";
import { IntakeArt } from "@/components/intake/IntakeArt";
import { Button, Icon } from "@/components/ui";
import { savePlacementAction } from "@/lib/actions/roadmap";
import { BenchmarkRunner, type RunResult } from "./BenchmarkRunner";
import { NodeStateList } from "./NodeStateList";

type Step = "time" | "injury" | "guess" | "overhead" | "blocked" | "ready" | "run" | "result";
const QS: Step[] = ["time", "injury", "guess", "overhead"];

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * "Find your phase" (15–20 min): three questions one per screen, the overhead self-check (press or Halo),
 * then the adaptive benchmark run (starts one phase below the guess; each pass moves up; the first clear
 * fail stops it), then the result: the phase and every movement's state in it.
 */
export function PlacementFlow({ movements, benchmarks, bell, initialStep }: {
  movements: RoadmapMovement[];
  benchmarks: RoadmapBenchmark[];
  bell: BellAdvice;
  initialStep?: Step;
}) {
  const cat = useMemo(() => ({ movements, benchmarks }), [movements, benchmarks]);
  const [step, setStep] = useState<Step>(initialStep ?? "time");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [a, setA] = useState<Partial<PlacementAnswers>>(initialStep === "run" ? { time: "1-3y", injury: "none", guess: 3, overheadOk: true } : {});
  const [runs, setRuns] = useState<(RunResult & { bm: RoadmapBenchmark })[]>([]);
  const [result, setResult] = useState<{ phase: RoadmapPhase; status: "done" | "blocked_pain" | "stopped" } | null>(null);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const startPhase = a.time ? placementStart({ time: a.time, guess: a.guess ?? null }) : 1;
  const nextStep = placementNext(cat, startPhase, runs.map((r) => r.passed));
  const total = placementLength(cat, startPhase);

  const go = (s: Step, d: "fwd" | "back" = "fwd") => {
    setDir(d);
    setStep(s);
    window.scrollTo({ top: 0 });
    window.setTimeout(() => titleRef.current?.focus(), 50);
  };
  const back = () => {
    const i = QS.indexOf(step);
    if (i > 0) go(QS[i - 1]!, "back");
  };

  const save = (phase: RoadmapPhase, status: "done" | "blocked_pain" | "stopped", done: typeof runs) => {
    setResult({ phase, status });
    setStep("result");
    window.scrollTo({ top: 0 });
    const day = localDay();
    const attempts: AttemptWrite[] = done.map((r) => ({
      benchmark: r.bm.key, movement: r.bm.movement, day, passed: r.passed, setReps: r.setReps, nasal: r.nasal, variant: r.variant,
      bellKg: bellFor(r.bm, bell), effort: r.effort, stopped: r.stopped, source: "placement",
    }));
    start(async () => {
      const res = await savePlacementAction({ answers: { time: a.time, injury: a.injury, guess: a.guess ?? null }, overheadOk: a.overheadOk ?? null, startPhase: status === "blocked_pain" ? null : startPhase, resultPhase: phase, status, attempts });
      if (!res.ok) setError(res.message);
    });
  };

  const onRun = (r: RunResult) => {
    const bm = (nextStep as Extract<typeof nextStep, { done: false }>).benchmark;
    const done = [...runs, { ...r, bm }];
    setRuns(done);
    window.scrollTo({ top: 0 });
    if (r.stopped) return save(Math.max(1, Math.min(startPhase, bm.phase)) as RoadmapPhase, "stopped", done);
    const n = placementNext(cat, startPhase, done.map((x) => x.passed));
    if (n.done) save(n.phase, "done", done);
  };

  const pick = (k: keyof PlacementAnswers, v: unknown, then: Step) => {
    setA((x) => ({ ...x, [k]: v }));
    window.setTimeout(() => go(then), 180);
  };

  const at = QS.indexOf(step);
  if (at >= 0) {
    const shell = { at, total: QS.length, onBack: at > 0 ? back : undefined, backHref: at === 0 ? "/tools/roadmap" : undefined, close: { label: "Close", href: "/tools/roadmap", icon: true }, sceneKey: step, dir, titleRef, context: "Find your phase" };
    if (step === "time")
      return (
        <QuestionShell {...shell} art={<IntakeArt topic="experience" move="swing" />} title="How long have you trained with kettlebells?" help="Testing starts lower for newer lifters. It's the safe way to place you.">
          <ChoiceCards label="Training time" value={a.time} onPick={(v) => pick("time", v as TrainingTime, "injury")} options={[
            { value: "new", label: "New, or under 3 months" }, { value: "under-1y", label: "3–12 months" }, { value: "1-3y", label: "1–3 years" }, { value: "3y-plus", label: "More than 3 years" },
          ]} />
        </QuestionShell>
      );
    if (step === "injury")
      return (
        <QuestionShell {...shell} art={<IntakeArt topic="body" />} title="Any pain or injury right now?" help="Hips, back, knees, shoulders, wrists or neck. The test loads all of them.">
          <ChoiceCards label="Pain or injury" value={a.injury} onPick={(v) => pick("injury", v, v === "none" ? "guess" : "blocked")} options={[
            { value: "none", label: "No, nothing right now" }, { value: "yes", label: "Yes, something hurts or is healing", hint: "We'll skip the test and start you gently" },
          ]} />
        </QuestionShell>
      );
    if (step === "guess")
      return (
        <QuestionShell {...shell} art={<IntakeArt topic="level" move="getup" />} title="Which phase do you think you're in?" help="Testing starts one phase below your guess, so you never start too high.">
          <ChoiceCards label="Your guess" value={a.guess === undefined ? undefined : String(a.guess ?? "unsure")} onPick={(v) => pick("guess", v === "unsure" ? null : (Number(v) as RoadmapPhase), "overhead")} options={[
            ...ROADMAP_PHASES.map((p) => ({ value: String(p.phase), label: `Phase ${p.phase} — ${p.name}`, hint: p.theme })),
            { value: "unsure", label: "Not sure" },
          ]} />
        </QuestionShell>
      );
    return (
      <QuestionShell {...shell} art={<IntakeArt topic="level" move="press" />} title="Overhead check: back to a wall, raise both arms" help="Feet a step from the wall, low back flat against it. Can your thumbs touch the wall above your head without your ribs flaring or your back arching?">
        <ChoiceCards label="Overhead check" value={a.overheadOk === undefined ? undefined : a.overheadOk ? "yes" : "no"} onPick={(v) => pick("overheadOk", v === "yes", "ready")} options={[
          { value: "yes", label: "Yes, easily", hint: "You'll test the Half Kneeling Overhead Press" },
          { value: "no", label: "No, or not without arching", hint: "You'll test the Halo instead, the fallback Mike names in Phase 1" },
        ]} />
      </QuestionShell>
    );
  }

  if (step === "blocked")
    return (
      <div className="rm-page rm-narrow">
        <div className="rm-panel rm-raised">
          <p className="lq-eyebrow" data-tone="warm">No test today</p>
          <h1 className="lq-d-lg">Let's not test through pain</h1>
          <p className="lq-lede lq-c2">The placement test loads your hips, back, knees and shoulders. With pain or an injury that's healing, we start you in Phase 1 with the bodyweight work, and you take the test once it's cleared.</p>
          <p className="lq-t15 lq-c2">If it's more than a niggle, check in with your doctor or physio first.</p>
          <div className="rm-row">
            <Button variant="filled" size="lg" onClick={() => save(1, "blocked_pain", [])} disabled={saving}>Start me in Phase 1</Button>
            <Button variant="ghost" size="lg" onClick={() => go("injury", "back")}>Back</Button>
          </div>
        </div>
      </div>
    );

  if (step === "ready") {
    const first = runOrderFirst(nextStep);
    return (
      <div className="rm-page rm-narrow">
        <div className="rm-panel rm-raised">
          <p className="lq-eyebrow" data-tone="accent">Benchmark run</p>
          <h1 className="lq-d-lg">You start in Phase {startPhase}</h1>
          <p className="lq-lede lq-c2">
            {a.guess && a.guess > startPhase ? `One phase below your guess. ` : ""}Each benchmark you meet moves the test on; the first one you can't meet ends it. Bodyweight tests come first, then the light bell, then the moderate one.
          </p>
          <ul className="rm-needs">
            <li><Icon name="kettlebell" size="sm" /><span><b>{bell.light} kg</b> light bell and <b>{bell.moderate} kg</b> moderate bell<small>{bell.from === "selector" ? "From your Kettlebell Selector result" : bell.from === "profile" ? "From the bells in your training profile" : "Use the Kettlebell Selector for a better guess"}</small></span></li>
            <li><Icon name="clock" size="sm" /><span><b>15–20 minutes</b><small>Up to {total} benchmarks; most people do fewer</small></span></li>
            <li><Icon name="map" size="sm" /><span><b>3 × 3 m of clear floor</b><small>And 30 yards to walk if you reach the farmer's carry</small></span></li>
            <li><Icon name="heart" size="sm" /><span><b>Pain or dizziness stops the test</b><small>There's a stop button on every screen</small></span></li>
          </ul>
          <div className="rm-row">
            <Button variant="filled" size="lg" iconAfter="arrowRight" onClick={() => go("run")}>Start with {first?.label.toLowerCase() ?? "the first benchmark"}</Button>
            <Button variant="ghost" size="lg" onClick={() => go("overhead", "back")}>Back</Button>
          </div>
          <p className="lq-t12 lq-c2">Do a few minutes of easy movement first if you haven't warmed up.</p>
        </div>
      </div>
    );
  }

  if (step === "run" && !nextStep.done) {
    const bm = nextStep.benchmark;
    const m = movements.find((x) => x.key === bm.movement)!;
    return (
      <div className="rm-page">
        <header className="rm-runbar">
          <Link href="/tools/roadmap" className="rm-icon" aria-label="Leave the test"><Icon name="close" size="sm" /></Link>
          <div className="rm-runbar-mid">
            <span className="lq-t13"><b>Phase {nextStep.phase}</b> · benchmark {runs.length + 1}{nextStep.dropped ? " · one phase lower, to be safe" : ""}</span>
            <span className="rm-runbar-track"><i style={{ width: `${Math.min(100, (runs.length / Math.max(1, total)) * 100)}%` }} /></span>
          </div>
          <span className="lq-t13 lq-c2">{runs.filter((r) => r.passed).length} met</span>
        </header>
        <BenchmarkRunner key={`${bm.key}-${runs.length}`} bm={bm} movement={m} bellKg={bellFor(bm, bell)} defaultVariant={bm.movement === "hk-press" && a.overheadOk === false ? "fallback" : "main"} onResult={onRun} eyebrow={m.name} />
      </div>
    );
  }

  // Result
  const ph = result?.phase ?? 1;
  const nodes = nodeStates(cat, { phase: ph }, runs.map((r) => ({ benchmark: r.bm.key, movement: r.bm.movement, day: localDay(), passed: r.passed, nasal: r.nasal, source: "placement" as const, variant: r.variant })));
  const meta = ROADMAP_PHASES[ph - 1]!;
  return (
    <div className="rm-page rm-narrow">
      <div className="rm-panel rm-raised rm-result">
        <p className="lq-eyebrow" data-tone="warm">{result?.status === "stopped" ? "Test stopped — placed safely" : result?.status === "blocked_pain" ? "Starting gently" : "Your phase"}</p>
        <div className="rm-result-head">
          <span className="rm-bignum lq-dnum" aria-hidden>{ph}</span>
          <div>
            <h1 className="lq-d-lg">Phase {ph}: {meta.name}</h1>
            <p className="lq-lede lq-c2">{((t) => t.charAt(0).toUpperCase() + t.slice(1))(placementSummary(cat, nodes).replace(/^Phase \d — /, ""))}</p>
          </div>
        </div>
        <NodeStateList movements={movements.filter((m) => m.phase === ph)} nodes={nodes} />
        {result?.status === "stopped" && <p className="lq-t15 rm-warn">You stopped for pain or dizziness. If it doesn't settle quickly, check in with a professional before training.</p>}
        {error && <p className="lq-t13 rm-warn">Couldn't save: {error}</p>}
        <div className="rm-row">
          <Button variant="filled" size="lg" href="/tools/roadmap" iconAfter="arrowRight" disabled={saving}>Open my Roadmap</Button>
          <Button variant="ghost" size="lg" onClick={() => { setRuns([]); setResult(null); setA({}); go("time", "back"); }}>Retake</Button>
        </div>
        <p className="lq-t12 lq-c2">A movement counts as passed when you meet its benchmark on two separate days{ph === 1 || ph === 3 ? ", breathing through your nose" : ""}. Today counts as the first.</p>
      </div>
    </div>
  );
}

function runOrderFirst(s: ReturnType<typeof placementNext>) {
  return s.done ? null : s.benchmark;
}
