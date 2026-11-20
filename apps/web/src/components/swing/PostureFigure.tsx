"use client";

import type { BellDistance, FaultId, StepStatus } from "@ms/core";
import { Kettlebell } from "@/components/graphics";
import type { SavedCheck } from "@/lib/swing";

type V = { x: number; y: number };
export type Tone = "good" | "adjust" | "fault" | "cant";

const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
const len = (a: V) => Math.hypot(a.x, a.y);
const unit = (a: V): V => mul(a, 1 / (len(a) || 1));
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const fmt = (n: number) => Math.round(n * 100) / 100;

/** The tone of each measured annotation, from a saved check (green good, amber adjust, red fault). */
export function postureTones(c: Pick<SavedCheck, "measures" | "steps" | "faults">): Record<"shin" | "hip" | "back" | "head", Tone> {
  const m = c.measures;
  const has = (f: FaultId) => c.faults.includes(f);
  const step = (s: StepStatus | undefined): Tone => (s === "good" ? "good" : s === "adjust" ? "adjust" : "cant");
  return {
    shin: m.shin == null ? "cant" : m.shin > 20 ? "fault" : m.shin >= 10 ? "adjust" : "good",
    hip: m.hip == null ? "cant" : m.hip <= 0.05 || m.hip >= 0.95 ? "fault" : "good",
    back: has("back_rounding") ? "fault" : step(c.steps.back),
    head: m.head == null ? "cant" : has("broken_neck") ? "fault" : has("head_high") || has("head_down") ? "adjust" : "good",
  };
}

const TONE_LABEL: Record<Tone, string> = { good: "Good", adjust: "Adjust", fault: "Fix", cant: "Can't see it" };

/**
 * The set-up as a clean side-view body diagram, built from the member's own landmarks: rounded
 * capsules for head, torso and limbs, a competition bell on the floor, and only the measurements on
 * top (shin angle, hip zone, the back line, head angle). A faint target set-up sits behind for
 * comparison. Always drawn facing right.
 */
export function PostureFigure({
  check,
  bellKg = 16,
  compact,
  className,
}: {
  check: Pick<SavedCheck, "measures" | "steps" | "faults">;
  bellKg?: number;
  /** Small card: numbers only, no labels. */
  compact?: boolean;
  className?: string;
}) {
  const m = check.measures;
  const tones = postureTones(check);
  const ov = m.overlay;
  const aspect = m.aspect ?? 0.5625;

  // Member's points in square space (y down, 100 = frame height), mirrored to face right.
  let P: Record<"ear" | "shoulder" | "hip" | "knee" | "ankle", V>;
  if (ov) {
    const raw = Object.fromEntries(Object.entries(ov).map(([k, p]) => [k, { x: p.x * aspect * 100, y: p.y * 100 }])) as typeof P;
    const face = raw.ear.x >= raw.hip.x ? 1 : -1;
    P = Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, { x: p.x * face, y: p.y }])) as typeof P;
  } else {
    P = target({ x: 0, y: 0 }, { shin: 24, thigh: 24, torso: 27, neck: 11 });
  }
  const u = len(sub(P.shoulder, P.hip)) || 20;
  const seg = { shin: len(sub(P.knee, P.ankle)), thigh: len(sub(P.hip, P.knee)), torso: u, neck: len(sub(P.ear, P.shoulder)) };
  const ghost = target(P.ankle, seg);

  // Body construction.
  const d = unit(sub(P.shoulder, P.hip)); // along the back
  const nB = { x: d.y, y: -d.x }; // back (dorsal) side
  const neckDir = unit(sub(P.ear, P.shoulder));
  const headC = add(add(P.ear, mul(neckDir, 0.06 * u)), mul({ x: -nB.x, y: -nB.y }, 0.03 * u));
  const headR = 0.25 * u;
  const floorY = P.ankle.y + 0.12 * u;
  const toe = { x: P.ankle.x + 0.36 * u, y: floorY - 0.06 * u };
  const gap = ({ ok: 0.55, far: 1.15, near: 0.12, unsure: 0.55 } as Record<BellDistance, number>)[m.bell_distance ?? "ok"] * u;
  const bellH = 0.62 * u;
  const bellW = (bellH * 48) / 52;
  const bellX = toe.x + gap + bellW / 2;
  const hand = { x: bellX, y: floorY - bellH * 0.93 };

  // Annotations.
  const shinDir = unit(sub(P.knee, P.ankle));
  const shinDeg = m.shin ?? Math.abs(deg(Math.atan2(shinDir.x, -shinDir.y)));
  const stickA = add(add(P.hip, mul(nB, 0.27 * u)), mul(d, -0.28 * u));
  const stickB = add(add(P.hip, mul(nB, 0.27 * u)), mul(d, u + seg.neck + 0.3 * u));
  const headDeg = m.head ?? deg(Math.atan2(d.x * neckDir.y - d.y * neckDir.x, d.x * neckDir.x + d.y * neckDir.y)) * -1;
  const zoneTop = Math.min(P.shoulder.y, P.knee.y);
  const zoneBot = Math.max(P.shoulder.y, P.knee.y);

  const cap = (a: V, b: V, w: number, cls: string, key?: string) => (
    <line key={key} className={cls} x1={fmt(a.x)} y1={fmt(a.y)} x2={fmt(b.x)} y2={fmt(b.y)} strokeWidth={fmt(w)} />
  );
  const arc = (c: V, r: number, from: number, to: number) => {
    const a = { x: c.x + r * Math.cos(from), y: c.y + r * Math.sin(from) };
    const b = { x: c.x + r * Math.cos(to), y: c.y + r * Math.sin(to) };
    const sweep = to > from ? 1 : 0;
    return `M${fmt(a.x)} ${fmt(a.y)}A${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(b.x)} ${fmt(b.y)}`;
  };
  const off = (p: V, dx: number) => ({ x: p.x - dx, y: p.y });

  const shinFrom = -Math.PI / 2;
  const shinTo = Math.atan2(shinDir.y, shinDir.x);
  const headFrom = Math.atan2(d.y, d.x);
  const headTo = Math.atan2(neckDir.y, neckDir.x);
  const shinR = 0.7 * u;
  const shinLabel = add(P.ankle, { x: 0.62 * u, y: -0.38 * u });
  const headR2 = seg.neck + headR * 2 + 0.22 * u;
  const headMid = (headFrom + headTo) / 2;
  const headLabel = add(P.shoulder, { x: Math.cos(headMid) * (headR2 + 0.35 * u), y: Math.sin(headMid) * (headR2 + 0.35 * u) + 0.08 * u });

  // View box around everything.
  const xs = [P.hip.x - (compact ? 0.6 : 1.45) * u, stickA.x - (compact ? 0 : 0.9 * u), headC.x + headR, bellX + bellW / 2, ghost.ear.x + 0.3 * u, ghost.hip.x - 0.4 * u, headLabel.x + 0.3 * u, shinLabel.x + 0.3 * u];
  const ys = [headC.y - headR, stickB.y, ghost.ear.y - 0.3 * u, zoneTop, floorY + 0.06 * u, headLabel.y - 0.35 * u];
  const pad = (compact ? 0.22 : 0.42) * u;
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad;
  const y1 = floorY + (compact ? 0.18 : 0.3) * u;
  const W = x1 - x0;
  const H = y1 - y0;
  const fs = 0.17 * u;

  return (
    <svg
      className={`sw-pf ${className ?? ""}`}
      viewBox={`${fmt(x0)} ${fmt(y0)} ${fmt(W)} ${fmt(H)}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={ov ? `Your set-up: shins ${Math.round(shinDeg)} degrees, head ${Math.round(headDeg)} degrees against your back` : "The camera couldn't see your set-up"}
    >
      {/* floor */}
      <line className="sw-pf-floor" x1={fmt(x0)} y1={fmt(floorY)} x2={fmt(x1)} y2={fmt(floorY)} strokeWidth={fmt(0.025 * u)} />
      <ellipse className="sw-pf-shadow" cx={fmt((P.ankle.x + bellX) / 2)} cy={fmt(floorY)} rx={fmt((bellX - P.ankle.x) / 2 + 0.6 * u)} ry={fmt(0.07 * u)} />

      {/* hip zone: knee height to shoulder height */}
      {ov && (
        <g className="sw-pf-zone" data-tone={tones.hip}>
          <rect x={fmt(P.hip.x - 0.55 * u)} y={fmt(zoneTop)} width={fmt(1.1 * u)} height={fmt(zoneBot - zoneTop)} rx={fmt(0.1 * u)} />
          <line x1={fmt(P.hip.x - 0.55 * u)} x2={fmt(P.hip.x + 0.55 * u)} y1={fmt(zoneTop)} y2={fmt(zoneTop)} strokeWidth={fmt(0.018 * u)} />
          <line x1={fmt(P.hip.x - 0.55 * u)} x2={fmt(P.hip.x + 0.55 * u)} y1={fmt(zoneBot)} y2={fmt(zoneBot)} strokeWidth={fmt(0.018 * u)} />
        </g>
      )}

      {/* target set-up, faint */}
      <g className="sw-pf-ghost">
        {[0.035 * u, 0].map((ring, k) => (
          <g key={k} className={k ? "sw-pf-ghost-in" : "sw-pf-ghost-out"}>
            {cap(ghost.ankle, ghost.knee, 0.2 * u + ring, "")}
            {cap(ghost.knee, ghost.hip, 0.3 * u + ring, "")}
            {cap(ghost.hip, ghost.shoulder, 0.42 * u + ring, "")}
            {cap(ghost.shoulder, ghost.ear, 0.16 * u + ring, "")}
            <circle cx={fmt(ghost.ear.x + 0.04 * u)} cy={fmt(ghost.ear.y)} r={fmt(headR + ring / 2)} />
          </g>
        ))}
      </g>

      {/* bell */}
      <g transform={`translate(${fmt(bellX - bellW / 2)} ${fmt(floorY - bellH)})`}>
        <Kettlebell variant="competition" size={bellH} weight={bellKg} hideWeight={compact} />
      </g>

      {/* body: far side lighter, near side on top */}
      <g className="sw-pf-body">
        <g className="sw-pf-far">
          {cap(off(P.ankle, 0.12 * u), off(P.knee, 0.1 * u), 0.19 * u, "")}
          {cap(off(P.knee, 0.1 * u), off(P.hip, 0.05 * u), 0.28 * u, "")}
          {cap(off(P.ankle, 0.12 * u), off(toe, 0.12 * u), 0.12 * u, "")}
          {cap(off(P.shoulder, 0.06 * u), off(hand, 0.08 * u), 0.13 * u, "")}
        </g>
        {cap(P.ankle, toe, 0.13 * u, "sw-pf-near")}
        {cap(P.ankle, P.knee, 0.2 * u, "sw-pf-near")}
        {cap(P.knee, P.hip, 0.3 * u, "sw-pf-near")}
        {cap(P.hip, P.shoulder, 0.44 * u, "sw-pf-near")}
        {cap(P.shoulder, P.ear, 0.17 * u, "sw-pf-near")}
        <circle className="sw-pf-head" cx={fmt(headC.x)} cy={fmt(headC.y)} r={fmt(headR)} />
        {/* near arm, cut out from the torso by a thin gap */}
        {cap(P.shoulder, hand, 0.2 * u, "sw-pf-gap")}
        {cap(P.shoulder, hand, 0.14 * u, "sw-pf-arm")}
      </g>

      {ov && (
        <g className="sw-pf-notes" fontSize={fmt(fs)}>
          {/* the stick: back of the head to the tailbone */}
          <line className="sw-pf-stick" data-tone={tones.back} x1={fmt(stickA.x)} y1={fmt(stickA.y)} x2={fmt(stickB.x)} y2={fmt(stickB.y)} strokeWidth={fmt(0.045 * u)} strokeDasharray={`${fmt(0.01 * u)} ${fmt(0.1 * u)}`} />
          {/* shin angle */}
          <g data-tone={tones.shin} className="sw-pf-angle">
            <line className="sw-pf-ref" x1={fmt(P.ankle.x)} y1={fmt(P.ankle.y)} x2={fmt(P.ankle.x)} y2={fmt(P.ankle.y - shinR - 0.12 * u)} strokeWidth={fmt(0.018 * u)} strokeDasharray={`${fmt(0.05 * u)} ${fmt(0.05 * u)}`} />
            <line className="sw-pf-ref" x1={fmt(P.ankle.x)} y1={fmt(P.ankle.y)} x2={fmt(P.ankle.x + shinDir.x * (shinR + 0.12 * u))} y2={fmt(P.ankle.y + shinDir.y * (shinR + 0.12 * u))} strokeWidth={fmt(0.018 * u)} />
            <path d={arc(P.ankle, shinR, shinFrom, shinTo)} strokeWidth={fmt(0.045 * u)} />
            <Label at={shinLabel} text={`${Math.round(shinDeg)}°`} sub={compact ? undefined : "Shin"} u={u} />
          </g>
          {/* head angle against the back */}
          <g data-tone={tones.head} className="sw-pf-angle">
            <line className="sw-pf-ref" x1={fmt(P.shoulder.x + d.x * (headR2 - 0.25 * u))} y1={fmt(P.shoulder.y + d.y * (headR2 - 0.25 * u))} x2={fmt(P.shoulder.x + d.x * (headR2 + 0.12 * u))} y2={fmt(P.shoulder.y + d.y * (headR2 + 0.12 * u))} strokeWidth={fmt(0.018 * u)} strokeDasharray={`${fmt(0.05 * u)} ${fmt(0.05 * u)}`} />
            <line className="sw-pf-ref" x1={fmt(P.shoulder.x + neckDir.x * (headR2 - 0.25 * u))} y1={fmt(P.shoulder.y + neckDir.y * (headR2 - 0.25 * u))} x2={fmt(P.shoulder.x + neckDir.x * (headR2 + 0.12 * u))} y2={fmt(P.shoulder.y + neckDir.y * (headR2 + 0.12 * u))} strokeWidth={fmt(0.018 * u)} />
            <path d={arc(P.shoulder, headR2, headFrom, headTo)} strokeWidth={fmt(0.045 * u)} />
            <Label at={headLabel} text={`${headDeg > 0 ? "+" : headDeg < 0 ? "−" : ""}${Math.abs(Math.round(headDeg))}°`} sub={compact ? undefined : "Head"} u={u} />
          </g>
          {/* hip marker */}
          <circle className="sw-pf-hip" data-tone={tones.hip} cx={fmt(P.hip.x)} cy={fmt(P.hip.y)} r={fmt(0.08 * u)} strokeWidth={fmt(0.035 * u)} />
          {!compact && (
            <>
              <text className="sw-pf-tag" data-tone={tones.hip} x={fmt(P.hip.x - 0.55 * u)} y={fmt(zoneTop - 0.1 * u)}>Hip zone</text>
              <text className="sw-pf-tag" data-tone={tones.back} x={fmt(stickA.x - 0.1 * u)} y={fmt(stickA.y + 0.3 * u)} textAnchor="end">Back line</text>
            </>
          )}
        </g>
      )}
      {!ov && (
        <text className="sw-pf-tag" data-tone="cant" x={fmt((x0 + x1) / 2)} y={fmt(y0 + 0.5 * u)} textAnchor="middle" fontSize={fmt(fs * 1.2)}>Can’t see it</text>
      )}
    </svg>
  );
}

function Label({ at, text, sub, u }: { at: V; text: string; sub?: string; u: number }) {
  return (
    <text className="sw-pf-label" x={fmt(at.x)} y={fmt(at.y)} textAnchor="middle">
      {sub && <tspan className="sw-pf-sub" x={fmt(at.x)} dy={fmt(-0.2 * u)} fontSize={fmt(0.13 * u)}>{sub}</tspan>}
      <tspan x={fmt(at.x)} dy={sub ? fmt(0.2 * u) : 0} fontSize={fmt(0.21 * u)}>{text}</tspan>
    </text>
  );
}

/** A target set-up (shins near vertical, hips between knees and shoulders, long back, neutral head) with the member's own segment lengths. */
function target(ankle: V, s: { shin: number; thigh: number; torso: number; neck: number }) {
  const knee = add(ankle, { x: s.shin * Math.sin(rad(6)), y: -s.shin * Math.cos(rad(6)) });
  const hip = add(knee, { x: -s.thigh * Math.cos(rad(22)), y: -s.thigh * Math.sin(rad(22)) });
  const shoulder = add(hip, { x: s.torso * Math.cos(rad(33)), y: -s.torso * Math.sin(rad(33)) });
  const ear = add(shoulder, { x: s.neck * Math.cos(rad(38)), y: -s.neck * Math.sin(rad(38)) });
  return { ankle, knee, hip, shoulder, ear };
}

/** The legend under the figure: each measurement with its value and tone. */
export function PostureLegend({ check }: { check: Pick<SavedCheck, "measures" | "steps" | "faults"> }) {
  const t = postureTones(check);
  const m = check.measures;
  const rows: [string, string, Tone][] = [
    ["Shin angle", m.shin != null ? `${Math.round(m.shin)}° from vertical` : "—", t.shin],
    ["Hip zone", m.hip != null ? (t.hip === "good" ? "Between knees and shoulders" : m.hip <= 0.05 ? "At or below the knees" : "Above the shoulders") : "—", t.hip],
    ["Back line", m.torsoRatio != null ? `${Math.round(m.torsoRatio * 100)}% of standing length` : "—", t.back],
    ["Head", m.head != null ? `${m.head > 0 ? "+" : m.head < 0 ? "−" : ""}${Math.abs(Math.round(m.head))}° against your back` : "—", t.head],
  ];
  return (
    <ul className="sw-pf-legend">
      {rows.map(([k, v, tone]) => (
        <li key={k} data-tone={tone}>
          <i aria-hidden />
          <span>{k}</span>
          <b>{v}</b>
          <em>{TONE_LABEL[tone]}</em>
        </li>
      ))}
      <li className="sw-pf-legend-ghost"><i aria-hidden /><span>Target set-up</span><b>Faint figure behind you</b></li>
    </ul>
  );
}
