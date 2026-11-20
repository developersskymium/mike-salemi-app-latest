import type { CSSProperties } from "react";
import "./gfx.css";
import "./ShastaSky.css";
import { cls, cx, useGfxId } from "./util";
import { Grain, Vista, WORLD, w } from "./world";

const g = cls("gfx");
const s = cls("gfx-shasta");

export type SkyTime = "dawn" | "day" | "dusk" | "night";
export const SKY_TIMES: SkyTime[] = ["dawn", "day", "dusk", "night"];

/** The time of day for a clock hour (local time). */
export function skyTimeFor(hour: number): SkyTime {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

export interface ShastaSkyProps {
  time: SkyTime;
  /** Rendered width; the art is 390×180 and slices to fill whatever box it is given. */
  width?: number | string;
  height?: number | string;
  /** The clouds drift and the stars breathe (off under reduced motion). */
  animated?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const W = 390;
const H = 180;
/* Where the light sits at each time: low and warm at dawn and dusk, high at noon, the moon at night. */
const LIGHT: Record<SkyTime, { sun?: [number, number, number]; moon?: [number, number, number] }> = {
  dawn: { sun: [340, 122, 13] },
  day: { sun: [338, 40, 12] },
  dusk: { moon: [344, 34, 8], sun: [340, 132, 13] },
  night: { moon: [340, 36, 9] },
};

/**
 * Mount Shasta for the Today header, in the Summit world at four times of day:
 * dawn (cold shadows, first warm light on the snow), day, dusk (alpenglow,
 * ember horizon) and night (moonlit snow, stars). Every colour comes from the
 * world palette (world.css).
 */
export function ShastaSky({ time, width = "100%", height, animated = false, title, className, style }: ShastaSkyProps) {
  const id = useGfxId("sky");
  const l = LIGHT[time];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      width={width}
      height={height}
      role="img"
      aria-label={title ?? `Mount Shasta at ${time}`}
      data-time={time}
      className={cx(g.root, WORLD, s.sky, animated && w.animated, className)}
      style={style}
    >
      <Vista
        id={id}
        w={W}
        h={H}
        horizon={150}
        sun={l.sun}
        moon={l.moon}
        stars={time === "night" ? 120 : 60}
        clouds={time === "night" ? [[250, 76, 60, 9]] : [[200, 52, 54, 4], [20, 96, 60, 9]]}
        far={150}
        mountain={{ x: 70, base: 158, width: 330, lift: 0.84 }}
        layers={[
          { y: 152, amp: 4, seed: 7, depth: 1, trees: { gap: 6, hMin: 4, hMax: 9, clump: 1, mix: { pine: 0, snag: 0 } } },
          { y: 164, amp: 5, seed: 11, depth: 2, trees: { gap: 7, hMin: 7, hMax: 15, clump: 1 } },
          { y: 176, amp: 3, seed: 17, depth: 3, trees: { gap: 8, hMin: 12, hMax: 24, clump: 0.8 } },
        ]}
      />
      <Grain id={id} w={W} h={H} />
    </svg>
  );
}
