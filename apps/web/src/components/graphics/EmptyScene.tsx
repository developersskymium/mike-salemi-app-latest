import type { CSSProperties, ReactNode } from "react";
import { Exposure, shastaPath } from "./exposure";
import { BELL_BASE, BELL_OUTLINE, BELL_WINDOW } from "./figures/bell";
import "./gfx.css";
import "./EmptyScene.css";
import { Flare } from "./Flare";
import { MovementFigure } from "./MovementFigure";
import { Line, arcPts, smooth, traceGeo, type Pt } from "./trace";
import { TraceMarks } from "./Trace";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-empty-scene");

export type EmptySceneName = "no-programs" | "nothing-saved" | "plan-empty" | "offline" | "caught-up";
export const EMPTY_SCENES: EmptySceneName[] = ["no-programs", "nothing-saved", "plan-empty", "offline", "caught-up"];

export interface EmptySceneProps {
  scene: EmptySceneName;
  /** Width in px; height follows 3:2. */
  size?: number;
  /** One-shot entrance: the world exposes, then the foreground settles (off under reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const LABEL: Record<EmptySceneName, string> = {
  "no-programs": "Kettlebells resting on a mat under Mount Shasta, their path not yet traced",
  "nothing-saved": "A chalk bowl, one chalked swipe of light above it",
  "plan-empty": "A ridge at first light, the route ahead still dotted",
  offline: "A campfire still warm under star trails",
  "caught-up": "A finished trace over a still glacier lake, someone resting on the shore",
};

/* The world sits in a round porthole; foreground pieces break out of it. */
const PC = { x: 120, y: 76, r: 62 };

function Bell({ x, y, k }: { x: number; y: number; k: number }) {
  return (
    <g transform={`translate(${x} ${y - BELL_BASE * k}) scale(${k})`}>
      <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" className={s.obj} strokeWidth={1.1 / k} />
    </g>
  );
}

/** The porthole: the ground (night exposure or snow contours), Shasta, and its rim. */
function Porthole({ id, seed, peak = 1, children }: { id: string; seed: number; peak?: number; children?: ReactNode }) {
  const mtn = shastaPath(58, 124, 124, 54 * peak);
  return (
    <>
      <defs>
        <clipPath id={`${id}-port`}>
          <circle cx={PC.x} cy={PC.y} r={PC.r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-port)`} className={s.world}>
        <g transform={`translate(${PC.x - PC.r} ${PC.y - PC.r})`}>
          <Exposure w={PC.r * 2} h={PC.r * 2} pole={[PC.r * 1.35, -6]} seed={seed} scale={0.85} />
        </g>
        <path d={mtn} className={s.mtn} />
        <path d={mtn} className={s.mtnLine} />
        <rect x={PC.x - PC.r} y={124} width={PC.r * 2} height={20} className={s.ground} />
        {children}
      </g>
      <circle cx={PC.x} cy={PC.y} r={PC.r - 0.4} className={s.portRim} />
    </>
  );
}

const SCENES: Record<EmptySceneName, (id: string) => ReactNode> = {
  /* Gear laid out, nothing traced yet: the swing's arc is still dotted, the light waiting at its start. */
  "no-programs": (id) => {
    const arc = new Line(arcPts(124, 60, 44, 200, 340, 40).reverse());
    return (
      <>
        <Porthole id={id} seed={3} />
        <g className={s.layer2}>
          <TraceMarks geo={traceGeo(arc, 0.04, { width: 2.4, segments: 4 })} />
          <path d="M58 141 80 121.4Q81.6 120 83.8 120H164.2Q166.4 120 168 121.4L190 141Z" className={s.mat} />
        </g>
        <g className={s.layer3}>
          <Bell x={98} y={129} k={0.6} />
          <Bell x={150} y={129.4} k={0.52} />
          <Bell x={124} y={137.4} k={0.78} />
        </g>
      </>
    );
  },

  /* Nothing kept yet: an untouched chalk bowl, one chalked swipe of light over it. */
  "nothing-saved": (id) => {
    const swipe = new Line(smooth([[86, 96], [104, 82], [126, 78], [148, 84], [160, 74]], 12));
    return (
      <>
        <Porthole id={id} seed={9} peak={0.85} />
        <g className={s.layer2}>
          <path d="M84 108Q84 140 120 140T156 108Z" className={s.obj} />
          <ellipse cx={120} cy={108} rx={36} ry={9} className={s.obj} />
          <path d="M92 110.6Q104 104.6 120 105.6T148 110.6Q134 115 120 115T92 110.6Z" className={s.chalk} />
          <path d="M108 101.6 121.6 98.4Q124 97.9 125.6 99.6L129 103.4Q130.2 105 128 105.6L114.6 108.6Q112.4 109.1 111 107.4L107.2 103.4Q106 102 108 101.6Z" className={s.chalk} />
        </g>
        <g className={s.layer3}>
          <TraceMarks geo={traceGeo(swipe, 1, { width: 2.4, segments: 16, floor: 0.02, ahead: false })} />
        </g>
      </>
    );
  },

  /* A clear day ahead: the route up the ridge is dotted, its stops unlit; first light at the trailhead. */
  "plan-empty": (id) => {
    const route = new Line(smooth([[60, 132], [84, 124], [100, 112], [114, 98], [124, 88], [132, 76]], 12));
    const nodes = [0.3, 0.55, 0.8].map((f) => [...route.at(route.total * f), false] as [number, number, boolean]);
    return (
      <>
        <Porthole id={id} seed={21} peak={1.08} />
        <g className={s.layer2}>
          <TraceMarks geo={traceGeo(route, 0.05, { width: 2.2, segments: 4 })} nodes={nodes} />
        </g>
      </>
    );
  },

  /* Offline: the fire is still warm under the star trails. Fire keeps its real colour. */
  offline: (id) => (
    <>
      <Porthole id={id} seed={33} peak={0.9} />
      <g className={s.layer2}>
        <defs>
          <radialGradient id={`${id}-ember`} cx=".5" cy=".5" r=".5">
            <stop offset="0" className={s.emberA} />
            <stop offset="1" className={s.emberB} />
          </radialGradient>
        </defs>
        <circle cx={120} cy={127} r={26} fill={`url(#${id}-ember)`} />
        <path d="M121 116C116 108 126 104 120 96S124 86 121 80" className={s.smoke} />
        <path d="M100 133 138 124M102 124 140 133" className={s.log} />
        {[
          [88, 134, 7, 4],
          [99, 138.6, 7.4, 4],
          [113, 140.6, 7.4, 3.8],
          [127, 140.6, 7.4, 3.8],
          [141, 138.6, 7.4, 4],
          [152, 134, 7, 4],
        ].map(([x, y, rx, ry]) => (
          <ellipse key={`${x}`} cx={x} cy={y} rx={rx} ry={ry} className={s.obj} />
        ))}
      </g>
      <g className={s.layer3}>
        <ellipse cx={120} cy={130.2} rx={8} ry={3} className={s.ember} />
        <circle cx={116} cy={129.6} r={1.4} className={s.emberHot} />
        <circle cx={124} cy={130.4} r={1.1} className={s.emberHot} />
      </g>
    </>
  ),

  /* All caught up: the day's trace finished over a still glacier lake, mirrored in it; someone resting on the shore. */
  "caught-up": (id) => {
    const arc = new Line(smooth([[62, 70], [86, 100], [118, 108], [150, 96], [170, 64]], 12));
    const mirror = new Line(arc.pts.map(([x, y]) => [x, 216 - y] as Pt));
    return (
      <>
        <Porthole id={id} seed={47} />
        <g clipPath={`url(#${id}-port)`}>
          <rect x={58} y={110} width={124} height={30} className={s.lake} />
          <g className={s.reflection}>
            <TraceMarks geo={traceGeo(mirror, 1, { width: 2, segments: 12, floor: 0.02, ahead: false, head: false })} />
          </g>
        </g>
        <g className={s.layer2}>
          <TraceMarks geo={traceGeo(arc, 1, { width: 2.4, segments: 18, floor: 0.03, ahead: false, head: false })} />
          <Flare x={170} y={64} size={44} animated={false} />
          <path d="M54 141Q60 128 76 128Q86 126 92 132Q100 130 104 136Q108 141 104 141Z" className={s.obj} />
        </g>
        <g className={s.layer3}>
          <g transform="translate(58 85) scale(.2)">
            <MovementFigure move="breathing" size={240} bare title="Resting" />
          </g>
        </g>
      </>
    );
  },
};

/**
 * Empty and edge states as small worlds in the Trace language: a porthole of
 * night exposure (dark) or snow contours (light) with Mount Shasta, matte
 * objects from Mike's world, and one mark of light.
 */
export function EmptyScene({ scene, size = 240, animated = true, className, style, title }: EmptySceneProps) {
  const id = useGfxId("es");
  return (
    <svg
      viewBox="0 0 240 160"
      width={size}
      height={(size * 160) / 240}
      role="img"
      aria-label={title ?? LABEL[scene]}
      className={cx(g.root, s.scene, animated && s.animated, className)}
      style={style}
    >
      {SCENES[scene](id)}
    </svg>
  );
}
