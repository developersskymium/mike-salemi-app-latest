import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./Moment.css";
import { RigFigure } from "./figures/RigFigure";
import { GROUND } from "./figures/rig";
import { MOVES } from "./figures/library";
import { At, Campfire, Ledge, Log, Mug, Seated } from "./objects";
import { cls, cx, useGfxId } from "./util";
import { Grain, Vista, WORLD, forest, ridgeFn, ridgePath, w, type WorldTime } from "./world";

const g = cls("gfx");
const s = cls("gfx-moment");

export type SpotName = "campfire-circle" | "breathwork" | "coaching-call";
export const SPOTS: SpotName[] = ["campfire-circle", "breathwork", "coaching-call"];

export interface SpotProps {
  spot: SpotName;
  /** Width in px; height follows 8:5. */
  size?: number | string;
  animated?: boolean;
  /** "auto": the campfire burns at dusk (night in dark), the others follow the theme. */
  time?: WorldTime | "auto";
  radius?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const W = 320;
const H = 200;

const LABEL: Record<SpotName, string> = {
  "campfire-circle": "Men sitting in a circle around a campfire below Mount Shasta at dusk",
  breathwork: "A man kneeling on a granite ledge at first light, breathing, facing the mountain",
  "coaching-call": "A coaching call on a laptop at a cabin window that looks out on Mount Shasta",
};

function scene(spot: SpotName, id: string): ReactNode {
  switch (spot) {
    case "campfire-circle": {
      const back = ridgeFn(4, 168, 3, W);
      return (
        <>
          <Vista
            id={id}
            w={W}
            h={H}
            horizon={150}
            moon={[262, 40, 9]}
            sun={[262, 128, 14]}
            stars={80}
            far={140}
            mountain={{ x: 30, base: 150, width: 260, lift: 0.8 }}
            layers={[{ y: 146, amp: 4, seed: 2, depth: 2, trees: { gap: 6, hMin: 6, hMax: 12, clump: 1 } }]}
          />
          <path d={ridgePath(back, -10, W + 10, H + 10, 14)} className={w.ground} />
          <path d={forest({ seed: 21, f: ridgeFn(4, 172, 3, W), x0: -10, x1: 70, gap: 8, hMin: 34, hMax: 70, clump: 0.2 }).d} className={w.r4} />
          <path d={forest({ seed: 22, f: ridgeFn(4, 172, 3, W), x0: 250, x1: W + 10, gap: 8, hMin: 34, hMax: 76, clump: 0.2 }).d} className={w.r4} />
          <ellipse cx={160} cy={184} rx={110} ry={20} className={w.groundLo} />
          {/* The far side of the circle, faces lit by the fire. */}
          <Log x={128} y={170} k={0.7} />
          <Log x={196} y={170} k={0.7} />
          <Seated x={116} y={171} k={0.95} lit id={`${id}-a`} />
          <Seated x={140} y={168} k={1} lit id={`${id}-b`} />
          <Seated x={182} y={168} k={1.02} lit id={`${id}-c`} />
          <Seated x={207} y={171} k={0.93} lit id={`${id}-d`} />
          <Campfire x={160} y={184} k={1.05} id={`${id}-fire`} />
          {/* The near side, in silhouette. */}
          <Seated x={96} y={202} k={1.5} tone="r4" />
          <Seated x={228} y={202} k={1.45} tone="r4" flip />
          <Log x={92} y={200} k={1} />
        </>
      );
    }
    case "breathwork": {
      const m = MOVES.breathing;
      const [vx, vy, vs] = m.view ?? [0, 0, 240];
      const size = 128;
      const k = size / vs;
      return (
        <>
          <Vista
            id={id}
            w={W}
            h={H}
            horizon={150}
            sun={[250, 112, 12]}
            moon={[240, 48, 9]}
            stars={50}
            clouds={[[24, 58, 56, 7]]}
            far={142}
            mountain={{ x: 70, base: 154, width: 310, lift: 0.86 }}
            layers={[
              { y: 150, amp: 3, seed: 9, depth: 1, trees: { gap: 6, hMin: 4, hMax: 9, clump: 1, mix: { pine: 0, snag: 0 } } },
              { y: 164, amp: 5, seed: 15, depth: 2, trees: { gap: 7, hMin: 7, hMax: 15, clump: 1 } },
            ]}
          />
          {/* Valley mist between the ridges. */}
          <path d="M-10 156C60 150 120 158 180 152S280 150 330 156V166C260 162 200 168 140 164S40 166-10 168Z" className={w.mist} />
          <path d={ridgePath(ridgeFn(30, 182, 3, W), -10, W + 10, H + 10, 14)} className={w.r3} />
          <path d={forest({ seed: 30, f: ridgeFn(30, 182, 3, W), x0: 220, x1: W + 10, gap: 8, hMin: 18, hMax: 40, clump: 0.3 }).d} className={w.r3} />
          <Ledge x={92} y={212} k={2} />
          <g transform={`translate(${(84 - (100 - vx) * k).toFixed(1)} ${(184 - (GROUND - vy) * k).toFixed(1)})`}>
            <RigFigure move="breathing" size={size} at={m.still} animated={false} />
          </g>
        </>
      );
    }
    case "coaching-call": {
      return (
        <>
          <rect width={W} height={H} className={w.wallC} />
          {/* The window onto the mountain. */}
          <svg x={36} y={18} width={248} height={128} viewBox="0 0 248 128" overflow="hidden">
            <Vista
              id={`${id}-v`}
              w={248}
              h={128}
              horizon={100}
              sun={[206, 32, 8]}
              moon={[204, 30, 7]}
              stars={30}
              clouds={[[24, 40, 40, 3]]}
              far={94}
              mountain={{ x: 10, base: 104, width: 230, lift: 0.78 }}
              layers={[
                { y: 102, amp: 3, seed: 5, depth: 2, trees: { gap: 6, hMin: 5, hMax: 10, clump: 1 } },
                { y: 116, amp: 3, seed: 8, depth: 3, trees: { gap: 7, hMin: 9, hMax: 20, clump: 1 } },
              ]}
            />
          </svg>
          <path d="M30 12H290V152H30ZM36 18V146H284V18Z" fillRule="evenodd" className={w.woodC} />
          <path d="M157 18H163V146H157Z" className={w.woodC} />
          <path d="M36 18H284V21H36Z" className={w.woodLoC} opacity={0.6} />
          <path d="M22 148H298V156H22Z" className={w.woodHiC} />
          {/* The desk. */}
          <path d="M0 168H320V200H0Z" className={w.woodC} />
          <path d="M0 168H320V172H0Z" className={w.woodHiC} />
          {/* Laptop, the call on screen: Mike large, you in the corner. */}
          <At x={160} y={170}>
            <path d="M-62 0H62L70 4H-70Z" className={w.gearLo} />
            <path d="M-56-2V-74C-56-76-54-78-52-78H52C54-78 56-76 56-74V-2Z" className={w.gear} />
            <path d="M-51-7V-73H51V-7Z" className={w.screen} />
            <path d="M-51-7V-40C-30-44-10-42 10-48S40-58 51-56V-7Z" className={w.screenLo} />
            <path d="M-34-7C-33-21-24-28-6-28S21-21 22-7Z" className={w.inkC} />
            <path d="M-10-29H-2V-24C-4-22.5-8-22.5-10-24Z" className={w.skin} />
            <ellipse cx={-6} cy={-42} rx={8.6} ry={10} className={w.skin} />
            <path d="M-14.6-43C-15-52-10-55-6-55S2.8-52 2.6-43C1-47-2-48.5-6-48.5S-13-47-14.6-43Z" className={w.inkC} />
            <path d="M-13.4-38C-12-30-9-28-6-28S0-30 1.4-38C-1-34-3.5-33-6-33S-11-34-13.4-38Z" className={w.inkC} opacity={0.85} />
            <ellipse cx={-15} cy={-41} rx={1.6} ry={2.6} className={w.skin} />
            <circle cx={12} cy={-17} r={2.2} className={w.ember} />
            <rect x={22} y={-31} width={24} height={18} rx={3} className={w.canvasC} />
            <circle cx={34} cy={-25} r={3.6} className={w.emberLo} />
            <path d="M27-13C28-18 31-20 34-20S40-18 41-13Z" className={w.ember} />
            <circle cx={-46} cy={-66} r={2} className={w.ember} />
          </At>
          <Mug x={252} y={170} k={1.05} />
          <At x={70} y={170}>
            <path d="M-12 0H12L10-14H-10Z" className={w.canvasLoC} />
            <path d="M0-14C-6-24-14-26-18-30C-10-30-4-26 0-18C2-28 8-34 16-36C10-30 4-24 2-14Z" className={w.r2} />
          </At>
        </>
      );
    }
  }
}

/**
 * Spot illustrations for the Retreats and Coaching pages, in the same world:
 * the campfire circle, breathwork at first light, and a coaching call at a
 * window onto Shasta.
 */
export function Spot({ spot, size = 320, animated = true, time = "auto", radius = 22, label, className, style }: SpotProps) {
  const id = useGfxId("spot");
  const eve = time === "auto" && spot === "campfire-circle";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={typeof size === "number" ? (size * H) / W : undefined}
      role="img"
      aria-label={label ?? LABEL[spot]}
      data-time={time === "auto" ? undefined : time}
      className={cx(g.root, WORLD, eve && w.eve, s.moment, animated && s.animated, animated && w.animated, className)}
      style={style}
    >
      <defs>
        <clipPath id={`${id}-p`}>
          <rect width={W} height={H} rx={radius} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-p)`}>
        {scene(spot, id)}
        <Grain id={id} w={W} h={H} />
      </g>
    </svg>
  );
}

