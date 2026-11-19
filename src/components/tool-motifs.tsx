import * as React from "react";
import { cn } from "@/lib/utils";

type MotifProps = { className?: string };

/**
 * Tool card motifs.
 *
 * Deliberately non-figurative: no stick figures, no hands, no faces. Every
 * mark is a circle, arc, bar or tick so the whole set reads as one confident
 * diagram language instead of clip art. Colour comes from design tokens only.
 */

function Frame({ className, children }: MotifProps & { children: React.ReactNode }) {
  return (
    <div className={cn("relative grid h-full w-full place-items-center overflow-hidden bg-muted/40", className)}>
      <svg
        viewBox="0 0 200 120"
        fill="none"
        className="h-full w-full max-h-[150px] text-foreground/30 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-[1.03]"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  );
}

/** Shared baseline so every motif sits on the same optical floor. */
function Baseline() {
  return <path d="M40 100 H160" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />;
}

/** A single, properly proportioned kettlebell. */
function Kettlebell({
  cx,
  cy,
  r,
  accent,
}: {
  cx: number;
  cy: number;
  r: number;
  accent?: boolean;
}) {
  const handle = r * 0.72;
  return (
    <g className={accent ? "text-primary" : undefined}>
      <path
        d={`M${cx - handle} ${cy - r * 0.72} a${handle} ${handle} 0 0 1 ${handle * 2} 0`}
        stroke="currentColor"
        strokeWidth={Math.max(2.5, r * 0.22)}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={cx} cy={cy} r={r} fill="currentColor" />
    </g>
  );
}

/** Kettlebell selector — one bell chosen from a graded set. */
export function MotifBellRack({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <Kettlebell cx={54} cy={86} r={9} />
      <Kettlebell cx={82} cy={82} r={12} />
      <Kettlebell cx={118} cy={74} r={20} accent />
      <Kettlebell cx={156} cy={84} r={11} />
      <Baseline />
      <circle cx="118" cy="110" r="3.5" className="text-primary" fill="currentColor" />
    </Frame>
  );
}

/** Stretch test — a range-of-motion protractor. */
export function MotifStretch({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <path
        d="M40 100 A60 60 0 0 1 160 100"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M40 100 A60 60 0 0 1 128 48"
        className="text-primary"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <path d="M55 62 l7 7" />
        <path d="M100 40 v10" />
        <path d="M145 62 l-7 7" />
      </g>
      <path d="M100 100 L128 48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="currentColor" />
      <Baseline />
    </Frame>
  );
}

/** Readiness — a simple capacity gauge. */
export function MotifReadiness({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <path
        d="M52 96 A48 48 0 1 1 148 96"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M52 96 A48 48 0 0 1 100 48"
        className="text-primary"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M100 96 L124 62" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="96" r="7" className="text-primary" fill="currentColor" />
    </Frame>
  );
}

/** Movement screen — five positions, checked off. */
export function MotifMovement({ className }: MotifProps) {
  const rows = [0, 1, 2, 3, 4];
  return (
    <Frame className={className}>
      {rows.map((i) => {
        const y = 26 + i * 17;
        const done = i < 3;
        return (
          <g key={i}>
            <rect
              x="78"
              y={y - 5}
              width={done ? 68 : 48}
              height="10"
              rx="5"
              fill="currentColor"
              opacity={done ? 0.55 : 0.28}
            />
            <circle
              cx="62"
              cy={y}
              r="7"
              className={done ? "text-primary" : undefined}
              fill={done ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.5"
              opacity={done ? 1 : 0.5}
            />
          </g>
        );
      })}
    </Frame>
  );
}

/** Grip & carry — a loaded bar under tension. */
export function MotifGrip({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <rect x="34" y="54" width="132" height="10" rx="5" fill="currentColor" opacity="0.55" />
      <g className="text-primary" fill="currentColor">
        <rect x="30" y="40" width="10" height="38" rx="4" />
        <rect x="160" y="40" width="10" height="38" rx="4" />
      </g>
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
        <path d="M78 46 v26" />
        <path d="M90 46 v26" />
        <path d="M102 46 v26" />
        <path d="M114 46 v26" />
        <path d="M126 46 v26" />
      </g>
      <g className="text-primary" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M100 78 v16" />
        <path d="M94 88 l6 8 l6 -8" fill="none" />
      </g>
      <Baseline />
    </Frame>
  );
}

/** Breath & conditioning — a steady respiratory wave. */
export function MotifBreath({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <path d="M34 40 H166" />
        <path d="M34 92 H166" />
      </g>
      <path
        d="M34 66 C56 66 56 34 78 34 C100 34 100 98 122 98 C144 98 144 66 166 66"
        className="text-primary"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="34" cy="66" r="4.5" fill="currentColor" />
      <circle cx="166" cy="66" r="4.5" fill="currentColor" />
    </Frame>
  );
}

/** Swing tempo — a metronome sweep. */
export function MotifTempo({ className }: MotifProps) {
  return (
    <Frame className={className}>
      <path
        d="M56 92 A56 56 0 0 1 144 92"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="4 8"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path d="M100 96 L72 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <path d="M100 96 L128 44" className="text-primary" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="128" cy="44" r="7" className="text-primary" fill="currentColor" />
      <circle cx="72" cy="44" r="5" fill="currentColor" opacity="0.45" />
      <circle cx="100" cy="96" r="6" fill="currentColor" />
      <Baseline />
    </Frame>
  );
}

/** Load progression — weight climbing step by step. */
export function MotifLoad({ className }: MotifProps) {
  const steps = [
    { x: 46, h: 20 },
    { x: 76, h: 34 },
    { x: 106, h: 50 },
    { x: 136, h: 66 },
  ];
  return (
    <Frame className={className}>
      {steps.map((s, i) => (
        <rect
          key={s.x}
          x={s.x}
          y={100 - s.h}
          width="22"
          height={s.h}
          rx="6"
          className={i === steps.length - 1 ? "text-primary" : undefined}
          fill="currentColor"
          opacity={i === steps.length - 1 ? 1 : 0.35 + i * 0.08}
        />
      ))}
      <path
        d="M52 68 L82 54 L112 40 L142 26"
        className="text-primary"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 7"
        fill="none"
        opacity="0.7"
      />
      <Baseline />
    </Frame>
  );
}

export const toolMotifBySlug: Record<string, React.FC<MotifProps>> = {
  "kettlebell-selector": MotifBellRack,
  "stretch-test": MotifStretch,
  "recovery-check": MotifReadiness,
  "movement-screen": MotifMovement,
  "grip-test": MotifGrip,
  "breath-test": MotifBreath,
  "swing-tempo": MotifTempo,
  "load-progression": MotifLoad,
};
