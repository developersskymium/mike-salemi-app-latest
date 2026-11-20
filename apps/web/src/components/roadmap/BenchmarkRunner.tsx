"use client";

import { useEffect, useMemo, useState } from "react";
import { scoreAttempt, type RoadmapBenchmark, type RoadmapMovement } from "@ms/core";
import { Button, Icon } from "@/components/ui";
import { Clip } from "./Clip";

export type RunResult = {
  passed: boolean;
  setReps: number[];
  nasal: boolean;
  stopped: boolean;
  effort: "easy" | "ok" | "too_hard" | null;
  variant: "main" | "fallback";
};

const sideName = (bm: RoadmapBenchmark, i: number) => (!bm.eachSide ? null : /arm/.test(bm.label) ? (i % 2 ? "Right arm" : "Left arm") : i % 2 ? "Right side" : "Left side");

/**
 * One benchmark, guided: Mike's clip looping, a tap-to-count counter per set (and per side), a rest timer
 * between sets, then the member confirms the standard (and nasal breathing where the phase asks).
 * Pain or dizziness stops it at any time — never a pass.
 */
export function BenchmarkRunner({ bm, movement, bellKg, defaultVariant = "main", onResult, eyebrow }: {
  bm: RoadmapBenchmark;
  movement: Pick<RoadmapMovement, "name" | "clip" | "clipNote" | "nasal" | "fallback">;
  bellKg: number | null;
  defaultVariant?: "main" | "fallback";
  onResult: (r: RunResult) => void;
  eyebrow?: string;
}) {
  const sides = bm.eachSide ? 2 : 1;
  const segments = bm.sets * sides;
  const [reps, setReps] = useState<number[]>(() => Array(segments).fill(0));
  const [seg, setSeg] = useState(0);
  const [rest, setRest] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [quality, setQuality] = useState(false);
  const [nasal, setNasal] = useState(false);
  const [effort, setEffort] = useState<RunResult["effort"]>(null);
  const [variant, setVariant] = useState<"main" | "fallback">(defaultVariant);
  const [stopAsk, setStopAsk] = useState(false);

  useEffect(() => {
    if (rest <= 0) return;
    const t = window.setTimeout(() => setRest((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [rest]);

  const target = bm.measure === "distance" ? 1 : bm.reps;
  const cur = reps[seg] ?? 0;
  const setNo = Math.floor(seg / sides) + 1;
  const side = sideName(bm, seg);
  const loaded = bm.load !== "bodyweight";
  const name = variant === "fallback" && movement.fallback ? movement.fallback.name : movement.name;

  const bump = (d: number) => setReps((xs) => xs.map((x, i) => (i === seg ? Math.max(0, x + d) : x)));
  const endSegment = () => {
    if (seg + 1 >= segments) return setConfirm(true);
    const endsSet = (seg + 1) % sides === 0;
    setSeg(seg + 1);
    if (endsSet && bm.restSeconds > 0) setRest(bm.restSeconds);
  };
  const finish = (confirmed: boolean) => {
    const passed = scoreAttempt(bm, { setReps: reps, confirmed: confirmed && quality });
    onResult({ passed, setReps: reps, nasal, stopped: false, effort, variant });
  };

  const totalDone = useMemo(() => reps.reduce((a, b) => a + b, 0), [reps]);

  return (
    <div className="rm-bench">
      <div className="rm-bench-media">
        <Clip clip={variant === "fallback" ? null : movement.clip} title={name} note={variant === "fallback" ? `${name}: clip coming` : movement.clipNote} />
      </div>
      <div className="rm-bench-body">
        {eyebrow && <p className="lq-eyebrow" data-tone="accent">{eyebrow}</p>}
        <h2 className="lq-d-md">{bm.label}</h2>
        <p className="lq-t15 lq-c2">{bm.standard}</p>
        <div className="rm-bench-facts">
          <span className="rm-fact"><Icon name="kettlebell" size="xs" />{bellKg ? `${bellKg} kg bell (${bm.load === "moderate" ? "moderate for you" : bm.load === "low-medium" ? "low to medium" : "light"})` : "Bodyweight"}</span>
          {bm.restSeconds > 0 && <span className="rm-fact"><Icon name="timer" size="xs" />{bm.restSeconds} s rest</span>}
          {movement.nasal && <span className="rm-fact"><Icon name="wind" size="xs" />Nose breathing</span>}
        </div>
        {movement.fallback && (
          <div className="rm-variant" role="radiogroup" aria-label="Version">
            {(["main", "fallback"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={variant === v} onClick={() => setVariant(v)} disabled={totalDone > 0}>
                {v === "main" ? movement.name : movement.fallback!.name}
              </button>
            ))}
          </div>
        )}

        {!confirm && rest > 0 && (
          <div className="rm-rest" aria-live="polite">
            <span className="lq-t13 lq-c2">Rest before set {setNo}</span>
            <span className="rm-rest-n lq-dnum">{rest}<small>s</small></span>
            <span className="rm-rest-bar"><i style={{ width: `${(rest / bm.restSeconds) * 100}%` }} /></span>
            <Button variant="glass" size="sm" onClick={() => setRest(0)}>Start the next set now</Button>
          </div>
        )}

        {!confirm && rest <= 0 && (
          <div className="rm-count">
            <div className="rm-count-head">
              <span className="lq-t13">{bm.sets > 1 ? `Set ${setNo} of ${bm.sets}` : "One set"}{side ? ` · ${side}` : ""}</span>
              <span className="rm-segs" aria-hidden>{Array.from({ length: segments }, (_, i) => <i key={i} data-s={i < seg ? "done" : i === seg ? "now" : undefined} />)}</span>
            </div>
            {bm.measure === "distance" ? (
              <button type="button" className="rm-tap" data-hit={cur >= 1 ? "" : undefined} onClick={() => bump(cur >= 1 ? -1 : 1)} aria-pressed={cur >= 1}>
                <span className="rm-tap-n">{cur >= 1 ? <Icon name="check" size="lg" /> : `${bm.distanceYards} yd`}</span>
                <span className="lq-t13">{cur >= 1 ? "Walk done" : "Tap when the walk is done"}</span>
              </button>
            ) : (
              <button type="button" className="rm-tap" data-hit={cur >= target ? "" : undefined} onClick={() => bump(1)} aria-label={`Count a rep. ${cur} of ${target}`}>
                <span className="rm-tap-n lq-dnum">{cur}<small>/{bm.repsMax && bm.measure !== "stages" ? `${target}–${bm.repsMax}` : target}</small></span>
                <span className="lq-t13">{cur >= target ? "Target met — keep going or end the set" : "Tap once per rep"}</span>
              </button>
            )}
            <div className="rm-count-actions">
              {bm.measure !== "distance" && <Button variant="fill" size="sm" icon="back" onClick={() => bump(-1)} disabled={cur === 0}>Undo</Button>}
              <Button variant={cur >= target ? "filled" : "glass"} size="md" onClick={endSegment}>
                {seg + 1 >= segments ? "Finish" : side && seg % 2 === 0 ? "Switch sides" : "End set"}
              </Button>
            </div>
          </div>
        )}

        {confirm && (
          <div className="rm-confirm">
            <label className="rm-check"><input type="checkbox" checked={quality} onChange={(e) => setQuality(e.target.checked)} /><span>I kept the standard: {bm.standard.replace(/\.$/, "").toLowerCase()}</span></label>
            {movement.nasal && <label className="rm-check"><input type="checkbox" checked={nasal} onChange={(e) => setNasal(e.target.checked)} /><span>I breathed through my nose the whole time</span></label>}
            {loaded && (
              <div className="rm-effort" role="radiogroup" aria-label="How did the bell feel?">
                <span className="lq-t13 lq-c2">The bell felt</span>
                {(["easy", "ok", "too_hard"] as const).map((e) => (
                  <button key={e} type="button" role="radio" aria-checked={effort === e} onClick={() => setEffort(e)}>{e === "too_hard" ? "Too hard" : e === "ok" ? "Right" : "Easy"}</button>
                ))}
              </div>
            )}
            <div className="rm-confirm-actions">
              <Button variant="filled" size="lg" onClick={() => finish(true)} disabled={!quality}>Done — I met it</Button>
              <Button variant="glass" size="lg" onClick={() => finish(false)}>I couldn't</Button>
            </div>
            <p className="lq-t12 lq-c2">Counted {reps.join(" · ")}. The benchmark is met when every set reaches {target}{bm.eachSide ? " on each side" : ""}.</p>
          </div>
        )}

        <div className="rm-stop">
          {!confirm && <button type="button" className="rm-link" onClick={() => setConfirm(true)}>I couldn't finish</button>}
          {stopAsk ? (
            <span className="rm-stop-ask">
              <span className="lq-t13">Stop now? Pain, dizziness or shortness of breath always ends the session.</span>
              <Button variant="ink" size="sm" onClick={() => onResult({ passed: false, setReps: reps, nasal, stopped: true, effort, variant })}>Stop</Button>
              <Button variant="ghost" size="sm" onClick={() => setStopAsk(false)}>Keep going</Button>
            </span>
          ) : (
            <button type="button" className="rm-link rm-link-stop" onClick={() => setStopAsk(true)}><Icon name="info" size="xs" /> Pain or dizziness? Stop</button>
          )}
        </div>
      </div>
    </div>
  );
}
