import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./EmptyScene.css";
import { Backpack, Binoculars, Lantern, Mug, Rock, Shadow, Signpost, Tent, TrailMap, At } from "./objects";
import { cls, cx, useGfxId } from "./util";
import { Grain, Shasta, Vista, WORLD, w, type VistaProps, type WorldTime } from "./world";

const g = cls("gfx");
const s = cls("gfx-empty-scene");

export type EmptySceneName = "no-programs" | "nothing-saved" | "plan-empty" | "offline" | "caught-up" | "no-results";
export const EMPTY_SCENES: EmptySceneName[] = ["no-programs", "nothing-saved", "plan-empty", "offline", "caught-up", "no-results"];

export interface EmptySceneProps {
  scene: EmptySceneName;
  /** Width in px; height follows 3:2. */
  size?: number;
  /** One-shot entrance, then the small things move (flame, steam, clouds). Off under reduced motion. */
  animated?: boolean;
  /** "auto" follows the theme (day in light, dusk in dark). */
  time?: WorldTime | "auto";
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const LABEL: Record<EmptySceneName, string> = {
  "no-programs": "A trailhead sign under Mount Shasta, the trail not yet walked",
  "nothing-saved": "A day pack resting against a boulder, an empty bookmark ribbon",
  "plan-empty": "A trail map laid open on the ground, no route drawn yet",
  offline: "A tent pitched below the mountain, a lantern burning outside",
  "caught-up": "A still alpine lake reflecting Shasta, a mug on the dock",
  "no-results": "Binoculars resting on a rock, the ridges empty",
};

const W = 240;
const H = 160;
/* An arched window onto the world; foreground pieces stand in front of its sill. */
const ARCH = "M46 128V82A74 74 0 0 1 194 82V128Z";

type Scene = { vista: Omit<VistaProps, "id" | "w" | "h">; inside?: (id: string) => ReactNode; front: (id: string) => ReactNode };

const forestBands = (seed: number, y = 104): VistaProps["layers"] => [
  { y, amp: 4, seed, depth: 2, trees: { gap: 6, hMin: 4, hMax: 9, clump: 1, mix: { pine: 0.2, snag: 0 } } },
  { y: y + 12, amp: 3, seed: seed + 4, depth: 3, trees: { gap: 7, hMin: 7, hMax: 15, clump: 1, mix: { pine: 0.4, snag: 0.1 } } },
];

const SCENES: Record<EmptySceneName, Scene> = {
  /* Nothing started: the trailhead, the trail dotted off into the trees. */
  "no-programs": {
    vista: { mountain: { x: 30, base: 108, width: 200, lift: 0.72 }, moon: [170, 40, 6], clouds: [[56, 56, 40, 3]], layers: forestBands(5) },
    inside: () => (
      <>
        <path d="M100 132C118 128 134 126 128 120C122 114 112 114 120 110C126 107 134 106 140 103" fill="none" className={w.trail} strokeWidth={7} style={{ stroke: "var(--w-ground-lo)" }} />
        <path d="M100 132C118 128 134 126 128 120C122 114 112 114 120 110C126 107 134 106 140 103" className={w.dash} strokeWidth={2} />
      </>
    ),
    front: () => (
      <>
        <Shadow x={150} y={140} rx={20} />
        <Shadow x={92} y={140} rx={16} />
        <Rock x={92} y={140} k={0.75} />
        <Signpost x={150} y={140} k={1.1} />
      </>
    ),
  },
  /* Nothing saved yet: a pack set down, its bookmark ribbon still empty. */
  "nothing-saved": {
    vista: { mountain: { x: 60, base: 110, width: 190, lift: 0.75 }, moon: [86, 40, 6], clouds: [[150, 62, 36, 8]], layers: forestBands(9) },
    front: () => (
      <>
        <Shadow x={124} y={141} rx={34} />
        <Rock x={136} y={141} k={1.25} />
        <Backpack x={108} y={141} k={1.1} />
      </>
    ),
  },
  /* A clear plan: the map is open, no route on it yet, a pin waiting. */
  "plan-empty": {
    vista: { mountain: { x: 24, base: 110, width: 196, lift: 0.7 }, moon: [172, 38, 6], clouds: [[66, 60, 34, 12]], layers: forestBands(13) },
    front: () => (
      <>
        <Shadow x={120} y={142} rx={40} />
        <TrailMap x={118} y={142} k={1.2} />
        <Rock x={172} y={141} k={0.5} />
      </>
    ),
  },
  /* Offline: camp below the mountain, the lantern still burning. */
  offline: {
    vista: { mountain: { x: 50, base: 108, width: 180, lift: 0.75 }, moon: [84, 36, 6], stars: 30, layers: forestBands(17, 106) },
    inside: () => (
      <>
        <Shadow x={140} y={126} rx={22} />
        <Tent x={140} y={126} k={0.9} />
      </>
    ),
    front: (id) => (
      <>
        <Shadow x={92} y={141} rx={12} />
        <Lantern x={92} y={141} k={1.25} id={id} />
      </>
    ),
  },
  /* All caught up: a still lake, Shasta upside down in it, a mug on the dock. */
  "caught-up": {
    vista: { mountain: { x: 40, base: 100, width: 190, lift: 0.7 }, moon: [168, 34, 6], clouds: [[60, 50, 40, 6]], layers: [{ y: 98, amp: 2.5, seed: 21, depth: 2, trees: { gap: 6, hMin: 4, hMax: 9, clump: 1, x1: 92, mix: { pine: 0.2, snag: 0 } } }] },
    inside: (id) => (
      <>
        <defs>
          <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={w.water1} />
            <stop offset="1" className={w.water0} />
          </linearGradient>
        </defs>
        <rect x={40} y={101} width={160} height={30} fill={`url(#${id}-water)`} />
        <g transform="translate(0 201) scale(1 -1)" opacity={0.32}>
          <Shasta id={`${id}-r`} x={40} base={100} width={190} lift={0.7} haze={false} />
        </g>
        <path d="M70 108H96M120 113H160M84 120H104M140 122H172" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={0.9} strokeLinecap="round" />
      </>
    ),
    front: () => (
      <>
        <Shadow x={120} y={142} rx={40} />
        <At x={120} y={142}>
          <path d="M-34 0L-12-26H12L34 0Z" className={w.woodC} />
          <path d="M-34 0L-12-26H-7L-24 0ZM-10 0L-3-26H3L10 0ZM24 0L7-26H12L34 0Z" className={w.woodHiC} opacity={0.55} />
          <path d="M-34 0H34V3H-34Z" className={w.woodLoC} />
          <path d="M-30 3V9M30 3V9" style={{ stroke: "var(--w-wood-lo)" }} strokeWidth={2.4} />
        </At>
        <Mug x={130} y={128} k={0.95} />
      </>
    ),
  },
  /* No results: binoculars down on a rock, nothing on the ridges. */
  "no-results": {
    vista: { mountain: { x: 46, base: 112, width: 180, lift: 0.7 }, moon: [80, 38, 6], clouds: [[96, 98, 70, 14], [150, 92, 44, 5]], layers: forestBands(25, 106) },
    front: () => (
      <>
        <Shadow x={122} y={141} rx={30} />
        <Rock x={130} y={141} k={1.2} />
        <Binoculars x={104} y={141} k={1.1} />
      </>
    ),
  },
};

/**
 * Empty states as small vignettes in the Summit world: an arched window onto
 * Mount Shasta and one object from the trail standing at its sill, with a
 * single warm accent. Daylight in light mode, dusk in dark.
 */
export function EmptyScene({ scene, size = 240, animated = false, time = "auto", className, style, title }: EmptySceneProps) {
  const id = useGfxId("empty");
  const sc = SCENES[scene] ?? SCENES["no-programs"];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      role="img"
      aria-label={title ?? LABEL[scene]}
      data-time={time === "auto" ? undefined : time}
      className={cx(g.root, WORLD, s.scene, animated && s.animated, animated && w.animated, className)}
      style={style}
    >
      <defs>
        <clipPath id={`${id}-arch`}>
          <path d={ARCH} />
        </clipPath>
      </defs>
      <ellipse cx={120} cy={134} rx={96} ry={9} className={s.sill} />
      <g clipPath={`url(#${id}-arch)`} className={s.world}>
        <Vista id={id} w={W} h={H} horizon={112} far={100} {...sc.vista} />
        <path d="M30 124C80 118 160 118 210 122V140H30Z" className={w.ground} />
        <path d="M30 129C90 125 150 126 210 128V140H30Z" className={w.groundLo} />
        {sc.inside?.(id)}
        <Grain id={id} w={W} h={H} freq={1.2} />
      </g>
      <path d="M46 128V82A74 74 0 0 1 194 82V128" className={s.rim} />
      <g className={s.front}>{sc.front(id)}</g>
    </svg>
  );
}
