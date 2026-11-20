import type { CSSProperties, ReactNode } from "react";
import "./gfx.css";
import "./Moment.css";
import { RigFigure } from "./figures/RigFigure";
import { GROUND } from "./figures/rig";
import { MOVES, type MoveName } from "./figures/library";
import { Bell, Cairn, Campfire, Confetti, Ledge, Log, Pennant, Rock, Shadow, Tent } from "./objects";
import { cls, cx, useGfxId } from "./util";
import { Clouds, Grain, Vista, WORLD, forest, ridgeFn, ridgePath, w, type WorldTime } from "./world";

const g = cls("gfx");
const s = cls("gfx-moment");

export type MomentKind = "day" | "phase" | "summit" | "streak";
export const MOMENT_KINDS: MomentKind[] = ["day", "phase", "summit", "streak"];

export interface MomentSceneProps {
  kind: MomentKind;
  /** Width in px; height follows 8:5. */
  size?: number | string;
  /** Pennant text for "phase" (e.g. "2") or "streak" (e.g. "14"). */
  mark?: string;
  /** Celebration confetti (day and summit by default). */
  confetti?: boolean;
  /** One-shot entrance; then flags, flames and clouds move a little. Off under reduced motion. */
  animated?: boolean;
  /** "auto" follows the theme (day in light, dusk in dark). */
  time?: WorldTime | "auto";
  /** Clip to a rounded panel (radius in user units, 0 for square). */
  radius?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const W = 320;
const H = 200;

/** An athlete from the rig, feet planted at (x, y), `h` px tall-ish. */
function Athlete({ move, x, y, size, at, flip }: { move: MoveName; x: number; y: number; size: number; at?: number; flip?: boolean }) {
  const m = MOVES[move];
  const [vx, vy, vs] = m.view ?? [0, 0, 240];
  const k = size / vs;
  const tx = x - (120 - vx) * k;
  const ty = y - (GROUND - vy) * k;
  return (
    <g transform={flip ? `translate(${(2 * x).toFixed(1)} 0) scale(-1 1)` : undefined}>
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)})`}>
        <RigFigure move={move} size={size} at={at ?? m.still} animated={false} trace={false} />
      </g>
    </g>
  );
}

const LABEL: Record<MomentKind, string> = {
  day: "Day complete: an athlete on a granite ledge under Mount Shasta, the kettlebell pressed overhead",
  phase: "Phase complete: camp reached on the mountain, the tent lit and the pennant planted",
  summit: "Summit: the athlete on the snowy top of Shasta above a sea of clouds, the flag planted",
  streak: "Streak: a campfire on the trail beside a cairn of stones",
};

function scene(kind: MomentKind, id: string, mark?: string): ReactNode {
  switch (kind) {
    case "day": {
      return (
        <>
          <Vista
            id={id}
            w={W}
            h={H}
            horizon={160}
            sun={[270, 56, 13]}
            moon={[262, 50, 10]}
            stars={50}
            clouds={[[30, 74, 64, 4], [196, 104, 70, 11]]}
            far={146}
            mountain={{ x: 30, base: 158, width: 300, lift: 0.82 }}
            layers={[
              { y: 156, amp: 4, seed: 3, depth: 1, trees: { gap: 6, hMin: 4, hMax: 8, clump: 1, mix: { pine: 0, snag: 0 } } },
              { y: 170, amp: 5, seed: 8, depth: 2, trees: { gap: 7, hMin: 7, hMax: 15, clump: 1, clear: [[90, 170]] } },
              { y: 186, amp: 3, seed: 14, depth: 3, trees: { gap: 8, hMin: 12, hMax: 26, clump: 1, clear: [[60, 200]] } },
            ]}
          />
          <Ledge x={122} y={206} k={1.75} />
          <Athlete move="press" x={112} y={182} size={124} at={0.5} />
          <Bell x={172} y={182} k={0.48} id={`${id}-b2`} />
          <Shadow x={172} y={182} rx={8} />
        </>
      );
    }
    case "phase": {
      // On the mountain's flank: the camp on a ledge, the trail below solid, dotted on to the summit.
      const fg = ridgeFn(5, 168, 5, W);
      return (
        <>
          <Vista
            id={id}
            w={W}
            h={H}
            horizon={150}
            sun={[56, 50, 12]}
            moon={[60, 46, 9]}
            stars={50}
            clouds={[[214, 70, 70, 6]]}
            far={150}
            mountain={{ x: 10, base: 168, width: 400, lift: 0.88 }}
            layers={[{ y: 160, amp: 4, seed: 11, depth: 1, trees: { gap: 6, hMin: 4, hMax: 10, clump: 1, mix: { pine: 0, snag: 0 } } }]}
          />
          <path d="M230 82C214 96 200 104 196 118C192 132 176 140 160 150" className={w.dash} strokeWidth={2.2} />
          <path d={ridgePath(fg, -10, W + 10, H + 10, 14)} className={w.ground} />
          <path d={ridgePath(ridgeFn(9, 184, 4, W), -10, W + 10, H + 10, 14)} className={w.groundLo} />
          <path d={forest({ seed: 3, f: ridgeFn(9, 184, 4, W), x0: -10, x1: 70, gap: 9, hMin: 22, hMax: 44, clump: 0.3 }).d} className={w.r3} />
          <path d={forest({ seed: 4, f: ridgeFn(9, 184, 4, W), x0: 262, x1: W + 10, gap: 9, hMin: 22, hMax: 50, clump: 0.3 }).d} className={w.r3} />
          <path d="M40 204C70 192 100 184 130 178C146 175 156 168 160 160" fill="none" className={w.trail} strokeWidth={9} style={{ stroke: "var(--w-ground-lo)" }} />
          <path d="M40 204C70 192 100 184 130 178C146 175 156 168 160 160" fill="none" style={{ stroke: "var(--g-ember)" }} strokeWidth={3.2} strokeLinecap="round" />
          <Shadow x={160} y={171} rx={30} />
          <Tent x={160} y={171} k={1.35} ember glow />
          <Pennant x={198} y={174} k={0.95} text={mark ?? "2"} />
          <Campfire x={118} y={182} k={0.6} id={`${id}-fire`} />
          <Rock x={232} y={182} k={0.7} flip />
          <Log x={95} y={188} k={0.55} />
        </>
      );
    }
    case "summit": {
      const rock = "M-10 210V172C20 166 50 158 80 148C100 141 118 131 134 124L150 117L166 115L178 119C196 127 220 137 250 147C280 156 306 160 330 162V210Z";
      return (
        <>
          <Vista id={id} w={W} h={H} horizon={140} sun={[258, 60, 15]} moon={[252, 56, 11]} stars={70} />
          {/* Lassen and the Trinity Alps above a sea of cloud. */}
          <path d="M206 134L232 104L240 100L246 103L274 134Z" className={w.far1} />
          <path d="M232 104L240 100L246 103L243 108L239 105L235 109Z" className={w.snow} opacity={0.9} />
          <path d={ridgePath(ridgeFn(4, 128, 6, W), -10, 130, 150, 10)} className={w.far0} />
          <Clouds id={`${id}-sea`} items={[[-30, 144, 120, 3], [60, 140, 110, 8], [168, 148, 120, 5], [252, 142, 100, 12]]} />
          <rect x={-10} y={140} width={W + 20} height={40} className={w.seaBase} />
          <path d={rock} className={w.snow} />
          <path d="M-10 210V172C20 166 50 158 80 148C100 141 118 131 134 124L150 117C146 130 136 148 126 166C118 182 112 196 110 210Z" className={w.snowShade} />
          <path d="M150 117C146 130 136 148 126 166C118 182 112 196 110 210H128C130 190 138 168 148 150C154 138 156 126 150 117Z" className={w.snowDeep} opacity={0.5} />
          {/* Rock breaking through the snow. */}
          <path d="M62 176C64 170 70 164 76 163C82 162 88 166 90 172C84 176 72 178 62 176Z" className={w.rock} />
          <path d="M76 163C82 162 88 166 90 172C86 170 80 168 76 163Z" className={w.rockLit} />
          <path d="M198 152C200 147 205 142 210 141C216 140 222 145 224 151C216 154 206 154 198 152Z" className={w.rock} />
          <path d="M210 141C216 140 222 145 224 151C219 148 214 145 210 141Z" className={w.rockLit} />
          <path d="M240 182C243 175 250 169 257 168C265 167 271 173 274 180C264 184 250 184 240 182Z" className={w.rock} />
          <path d="M257 168C265 167 271 173 274 180C268 177 262 172 257 168Z" className={w.rockLit} />
          <path d="M162 186C180 182 200 184 214 190M120 150C130 146 140 146 146 150M40 188C56 184 70 186 80 190M180 164C196 160 214 162 228 168M270 196C284 192 298 192 312 196M140 200C150 197 160 197 168 200" fill="none" className={w.snowRim} style={{ stroke: "var(--w-snow-shade)" }} strokeWidth={1} />
          <path d="M166 115L178 119C196 127 220 137 250 147" fill="none" className={w.snowRim} strokeWidth={1.2} />
          <Shadow x={160} y={118} rx={14} />
          <Pennant x={184} y={122} k={0.9} />
          <Athlete move="press" x={156} y={118} size={112} at={0.5} />
        </>
      );
    }
    case "streak": {
      return (
        <>
          <Vista
            id={id}
            w={W}
            h={H}
            horizon={150}
            sun={[70, 70, 12]}
            moon={[64, 52, 9]}
            stars={60}
            clouds={[[200, 66, 60, 9]]}
            far={150}
            mountain={{ x: 60, base: 158, width: 280, lift: 0.82 }}
            layers={[
              { y: 156, amp: 4, seed: 6, depth: 1, trees: { gap: 6, hMin: 4, hMax: 9, clump: 1, mix: { pine: 0, snag: 0 } } },
              { y: 170, amp: 5, seed: 12, depth: 2, trees: { gap: 7, hMin: 8, hMax: 16, clump: 1 } },
            ]}
          />
          <path d={ridgePath(ridgeFn(2, 180, 3, W), -10, W + 10, H + 10, 14)} className={w.ground} />
          <path d={ridgePath(ridgeFn(7, 194, 3, W), -10, W + 10, H + 10, 14)} className={w.groundLo} />
          <path d={forest({ seed: 13, f: ridgeFn(2, 182, 3, W), x0: -10, x1: 52, gap: 9, hMin: 30, hMax: 60, clump: 0.2 }).d} className={w.r4} />
          <path d={forest({ seed: 17, f: ridgeFn(2, 182, 3, W), x0: 282, x1: W + 10, gap: 9, hMin: 30, hMax: 64, clump: 0.2 }).d} className={w.r4} />
          <Campfire x={150} y={190} k={1.25} id={`${id}-fire`} />
          <Shadow x={212} y={191} rx={18} />
          <Cairn x={212} y={191} k={1.05} stones={5} />
          {mark ? <Pennant x={226} y={160} k={0.8} text={mark} /> : null}
          <Log x={96} y={196} k={0.9} />
          <Bell x={246} y={193} k={0.5} id={`${id}-b`} />
          <Shadow x={246} y={193} rx={7} />
        </>
      );
    }
  }
}

/**
 * Milestone moments in the Summit world: a day complete (the bell pressed
 * overhead on a granite ledge), a phase complete (camp reached), the summit
 * (above a sea of cloud, flag planted) and a streak (the trail campfire and its
 * cairn). Daylight in light mode, dusk in dark.
 */
export function MomentScene({ kind, size = 320, mark, confetti, animated = true, time = "auto", radius = 22, label, className, style }: MomentSceneProps) {
  const id = useGfxId("moment");
  const party = confetti ?? (kind === "day" || kind === "summit");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={typeof size === "number" ? (size * H) / W : undefined}
      role="img"
      aria-label={label ?? LABEL[kind]}
      data-time={time === "auto" ? undefined : time}
      className={cx(g.root, WORLD, s.moment, animated && s.animated, animated && w.animated, className)}
      style={style}
    >
      <defs>
        <clipPath id={`${id}-p`}>
          <rect width={W} height={H} rx={radius} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-p)`}>
        {scene(kind, id, mark)}
        {party ? <Confetti x0={30} x1={300} y0={14} y1={110} n={26} seed={kind === "day" ? 5 : 9} /> : null}
        <Grain id={id} w={W} h={H} />
      </g>
    </svg>
  );
}

