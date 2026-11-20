import type { CSSProperties, ReactNode } from "react";
import { MOVES, type MoveName } from "./figures/moves";
import { L, W, sample, solve, type Frame } from "./figures/skeleton";
import "./gfx.css";
import "./MovementFigure.css";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-movement-figure");

export type { MoveName };
export const MOVE_NAMES = Object.keys(MOVES) as MoveName[];

export interface MovementFigureProps {
  move: MoveName;
  /** Rendered width and height in px. */
  size?: number;
  /** Loop the movement (falls back to the still under reduced motion). */
  animated?: boolean;
  /** Body weight: 1.75 is the default build; larger is sturdier, smaller leaner. */
  stroke?: number;
  /** Hide the contact shadow and accent extras (orbit, breath ring, trace). */
  bare?: boolean;
  /** Playback speed multiplier. */
  speed?: number;
  /** Show the bell's path as a faint dotted trace where the move has one. */
  trace?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const cache = new Map<MoveName, Frame[]>();
function framesFor(move: MoveName): Frame[] {
  let f = cache.get(move);
  if (!f) {
    const m = MOVES[move];
    f = sample(m.keys, Math.min(100, Math.round(m.dur * 24)));
    cache.set(move, f);
  }
  return f;
}

/* Solid bell hanging from its handle; the handle's top sits at the origin. */
const BELL_HANDLE = "M-3.5 7V4.2a3.5 3.5 0 0 1 7 0V7";
const BELL_BODY = "M-2.5 16.4a5.6 5.6 0 1 1 5 0Z";

const join = (xs: Array<string | number>) => xs.join(";");

interface Layer {
  frames: Frame[];
  dur?: number;
  k: number;
  maskId: string;
}

/** One rendering of the figure, either a still (one frame) or a SMIL loop. */
function Figure({ frames, dur, k, maskId }: Layer) {
  const f0 = frames[0];
  const live = frames.length > 1 && !!dur;
  const d = `${dur}s`;
  const a = (attr: string, values: Array<string | number>) =>
    live ? <animate attributeName={attr} values={join(values)} dur={d} repeatCount="indefinite" /> : null;
  const limb = (pick: (f: Frame) => string, width: number, cn?: string) => (
    <path d={pick(f0)} style={{ strokeWidth: width * k, vectorEffect: "none" }} className={cn}>
      {a("d", frames.map(pick))}
    </path>
  );
  const bellGroup = (body: ReactNode) =>
    f0.bell ? (
      <g transform={`translate(${f0.bell.x.toFixed(1)} ${f0.bell.y.toFixed(1)})`}>
        {live ? (
          <animateTransform
            attributeName="transform"
            type="translate"
            values={join(frames.map((f) => `${f.bell!.x.toFixed(1)} ${f.bell!.y.toFixed(1)}`))}
            dur={d}
            repeatCount="indefinite"
          />
        ) : null}
        <g transform={`rotate(${f0.bell.rot.toFixed(1)})`}>
          {live ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={join(frames.map((f) => f.bell!.rot.toFixed(1)))}
              dur={d}
              repeatCount="indefinite"
            />
          ) : null}
          {body}
        </g>
      </g>
    ) : null;
  const bellOpacity = f0.bell ? f0.bell.opacity : 1;
  const bellFade = live && f0.bell ? (
    <animate attributeName="opacity" values={join(frames.map((f) => f.bell!.opacity.toFixed(2)))} dur={d} repeatCount="indefinite" />
  ) : null;

  return (
    <>
      <defs>
        {/* Knockouts: the near forearm and the bell cut a hairline gap where they cross the body. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-30" width="150" height="150">
          <rect x="-20" y="-30" width="150" height="150" fill="#fff" />
          <g stroke="#000" fill="none" strokeLinecap="round">
            {limb((f) => f.armNear.cut, W.fore + W.cut * 2)}
          </g>
          {bellGroup(
            <g fill="#000" stroke="#000" strokeWidth={W.cut * 2} strokeLinejoin="round" strokeLinecap="round" opacity={bellOpacity}>
              {bellFade}
              <path d={BELL_BODY} />
              <path d={BELL_HANDLE} fill="none" strokeWidth={2.3 + W.cut * 2} />
            </g>,
          )}
        </mask>
      </defs>

      <g className={s.far}>
        {limb((f) => f.legFar.thigh, W.thigh)}
        {limb((f) => f.legFar.shin, W.shin)}
        {limb((f) => f.legFar.foot, W.foot)}
        {limb((f) => f.armFar.upper, W.upper)}
        {limb((f) => f.armFar.fore, W.fore)}
      </g>

      <g className={s.body} mask={`url(#${maskId})`}>
        <path d={f0.torso} className={s.torso} style={{ strokeWidth: 2.4 * k, vectorEffect: "none" }}>
          {a("d", frames.map((f) => f.torso))}
        </path>
        <circle cx={f0.head[0]} cy={f0.head[1]} r={L.headR * Math.min(1.08, Math.max(0.94, k))} className={s.head}>
          {a("cx", frames.map((f) => f.head[0].toFixed(1)))}
          {a("cy", frames.map((f) => f.head[1].toFixed(1)))}
        </circle>
        {limb((f) => f.legNear.thigh, W.thigh)}
        {limb((f) => f.legNear.shin, W.shin)}
        {limb((f) => f.legNear.foot, W.foot)}
        {limb((f) => f.armNear.upper, W.upper)}
      </g>

      <g className={s.body}>{limb((f) => f.armNear.fore, W.fore)}</g>

      {bellGroup(
        <g className={s.bell} opacity={bellOpacity}>
          {bellFade}
          <path d={BELL_BODY} className={s.bellBody} />
          <path d={BELL_HANDLE} className={s.bellHandle} />
          <path d="M-3.3 11.4a3.6 3.6 0 0 1 2.2-3.2" className={s.bellShine} />
        </g>,
      )}
    </>
  );
}

/**
 * Filled pictogram of an athlete performing a kettlebell or movement pattern,
 * in the spirit of SF Symbols' figure set: capsule limbs, a tapered torso, a
 * head with a clear neck gap, far limbs in a secondary tone and the bell as the
 * single accent.
 */
export function MovementFigure({
  move,
  size = 96,
  animated = false,
  stroke = 1.75,
  bare = false,
  speed = 1,
  trace: showTrace = true,
  className,
  style,
  title,
}: MovementFigureProps) {
  const id = useGfxId("fig");
  const m = MOVES[move];
  const still = solve(m.keys[m.still].pose);
  const dur = m.dur / speed;
  const k = Math.min(1.25, Math.max(0.8, stroke / 1.75));
  const lying = move === "getup";

  return (
    <svg
      viewBox="-4 -10 108 108"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? m.label}
      className={cx(g.root, s.fig, animated && g.animated, className)}
      data-animated={animated || undefined}
      style={style}
    >
      {!bare ? (
        <>
          <ellipse cx={lying ? 58 : 51} cy={94.6} rx={lying ? 36 : 17} ry={1.7} className={s.shadow} />
          {showTrace && m.trace ? <path d={m.trace} className={s.trace} /> : null}
          {m.extra === "orbit" ? (
            <ellipse cx={still.head[0] - 1} cy={still.head[1] + 1} rx={16} ry={3.8} className={s.orbit} />
          ) : null}
          {m.extra === "breath" ? (
            <g className={s.breath}>
              <circle cx={still.chest[0]} cy={still.chest[1]} r={9.5} className={cx(s.breathRing, s.breathOuter)} />
              <circle cx={still.chest[0]} cy={still.chest[1]} r={6} className={s.breathRing} />
            </g>
          ) : null}
        </>
      ) : null}

      <g className={g.still}>
        <Figure frames={[still]} k={k} maskId={`${id}-s`} />
      </g>
      {animated ? (
        <g className={g.loop}>
          <Figure frames={framesFor(move)} dur={dur} k={k} maskId={`${id}-l`} />
        </g>
      ) : null}
    </svg>
  );
}
