"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DAYS_TO_PASS, bellFor, type BellAdvice, type RoadmapBenchmark, type RoadmapMovement } from "@ms/core";
import { Flare } from "@/components/signature/Flare";
import { Button, Icon } from "@/components/ui";
import { logRetestAction } from "@/lib/actions/roadmap";
import { BenchmarkRunner, type RunResult } from "./BenchmarkRunner";

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Outcome = { bm: RoadmapBenchmark; run: RunResult; passed: string[]; opened: string[]; phases: number[]; error?: string };

/** Re-test one node: its benchmark(s) re-run with counters and timers; logs each attempt; celebrates unlocks. */
export function RetestFlow({ movement, benchmarks, bell, names, defaultVariant }: {
  movement: RoadmapMovement;
  benchmarks: RoadmapBenchmark[];
  bell: BellAdvice;
  names: Record<string, string>;
  defaultVariant: "main" | "fallback";
}) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState<Outcome[]>([]);
  const [saving, start] = useTransition();
  const done = i >= benchmarks.length || out.some((o) => o.run.stopped);
  const bm = benchmarks[i];

  const onResult = (run: RunResult) => {
    const b = benchmarks[i]!;
    start(async () => {
      const r = await logRetestAction({
        benchmark: b.key, movement: movement.key, day: localDay(), passed: run.passed, setReps: run.setReps, nasal: run.nasal, variant: run.variant,
        bellKg: bellFor(b, bell), effort: run.effort, stopped: run.stopped, source: "retest",
      });
      setOut((o) => [...o, r.ok ? { bm: b, run, passed: r.passed, opened: r.opened, phases: r.phases } : { bm: b, run, passed: [], opened: [], phases: [], error: r.message }]);
      setI((x) => x + 1);
      window.scrollTo({ top: 0 });
    });
  };

  if (!done && bm)
    return (
      <div className="rm-page">
        <header className="rm-runbar">
          <Link href={`/tools/roadmap?node=${movement.key}`} className="rm-icon" aria-label="Back to the map"><Icon name="close" size="sm" /></Link>
          <div className="rm-runbar-mid">
            <span className="lq-t13"><b>Re-test</b> · {movement.name}{benchmarks.length > 1 ? ` · ${i + 1} of ${benchmarks.length}` : ""}</span>
            <span className="rm-runbar-track"><i style={{ width: `${(i / benchmarks.length) * 100}%` }} /></span>
          </div>
          <span />
        </header>
        <BenchmarkRunner key={bm.key} bm={bm} movement={movement} bellKg={bellFor(bm, bell)} defaultVariant={defaultVariant} onResult={onResult} eyebrow={`Phase ${movement.phase} benchmark`} />
        {saving && <p className="lq-t13 lq-c2 rm-center">Saving…</p>}
      </div>
    );

  const passed = [...new Set(out.flatMap((o) => o.passed))];
  const opened = [...new Set(out.flatMap((o) => o.opened))];
  const phases = [...new Set(out.flatMap((o) => o.phases))];
  const met = out.filter((o) => o.run.passed).length;
  const stopped = out.some((o) => o.run.stopped);
  const big = passed.length > 0;
  return (
    <div className="rm-page rm-narrow">
      <div className="rm-panel rm-raised rm-result" data-celebrate={big ? "" : undefined}>
        {big && <span className="rm-flare"><Flare size={140} /></span>}
        <p className="lq-eyebrow" data-tone={big ? "warm" : "accent"}>{stopped ? "Stopped" : big ? "Passed" : met ? "Met today" : "Not yet"}</p>
        <h1 className="lq-d-lg">
          {stopped ? "Good call to stop" : phases.length ? `Phase ${phases[0]} passed` : big ? `${movement.name} passed` : met === out.length ? `Benchmark met — 1 of ${DAYS_TO_PASS} days` : "Not this time"}
        </h1>
        <p className="lq-lede lq-c2">
          {stopped
            ? "Pain or dizziness always ends the session. Rest, and if it doesn't settle, check in with a professional before the next test."
            : big
              ? `Met on two separate days${movement.nasal ? " with nasal breathing" : ""}.${opened.length ? ` New on your map: ${opened.map((k) => names[k] ?? k).join(", ")}.` : ""}`
              : met === out.length
                ? "Meet it again on another day and the node is passed."
                : "Practise this week's work, use the lighter track in your sessions, and test again in a few days."}
        </p>
        {out.some((o) => o.run.effort === "too_hard") && <p className="lq-t13 lq-c2">You marked the bell as too hard, so your moderate bell drops one size next time.</p>}
        {out.some((o) => o.error) && <p className="lq-t13 rm-warn">Couldn't save: {out.find((o) => o.error)!.error}</p>}
        <div className="rm-row">
          <Button variant="filled" size="lg" href={`/tools/roadmap${big ? "" : `?node=${movement.key}`}`} iconAfter="arrowRight">Back to my Roadmap</Button>
        </div>
      </div>
    </div>
  );
}
