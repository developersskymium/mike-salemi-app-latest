/**
 * Objects in the Summit world, drawn once and placed anywhere: granite,
 * tents, the campfire, a trail sign, a pack, a map, a lantern, binoculars,
 * a mug, a cairn, pennants and seated people. Each takes its ground contact
 * point (x, y) and a scale k; sizes below are at k = 1.
 */
import type { ReactNode } from "react";
import { BELL_OUTLINE, BELL_WINDOW } from "./figures/bell";
import { rng, w } from "./world";

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Place local art (origin at the ground contact point) at x, y, scale k. */
export function At({ x, y, k = 1, flip, children }: { x: number; y: number; k?: number; flip?: boolean; children: ReactNode }) {
  return <g transform={`translate(${f(x)} ${f(y)}) scale(${flip ? -k : k} ${k})`}>{children}</g>;
}

/** Soft ground shadow. */
export function Shadow({ x, y, rx, ry = rx * 0.16 }: { x: number; y: number; rx: number; ry?: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} className={w.shadow} />;
}

/** A granite boulder: sunlit top facet, shaded flank, a crack. Width 40 × height 22. */
export function Rock({ x, y, k = 1, flip }: { x: number; y: number; k?: number; flip?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-21 0C-22-7-18-15-10-19C-4-22 4-23 10-20C17-17 21-10 21-2L20 0Z" className={w.rock} />
      <path d="M-6-20.6C2-23 10-21 15-16C19-12 21-7 21-2C16-6 11-9 6-11C1-13-3-16-6-20.6Z" className={w.rockLit} />
      <path d="M-21 0C-22-7-18-15-10-19C-12-13-12-6-8 0Z" className={w.rockShade} />
      <path d="M2-12C4-8 3-4 5 0" fill="none" stroke="currentColor" className={w.rockShade} strokeWidth={0.8} opacity={0.6} style={{ stroke: "var(--w-rock-shade)" }} />
    </At>
  );
}

/** A low flat ledge to stand on. Width 90 × height 16. */
export function Ledge({ x, y, k = 1, flip }: { x: number; y: number; k?: number; flip?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-48 2C-46-6-38-12-26-14C-12-16 8-16 24-15C36-14 44-10 48-3L48 6H-48Z" className={w.rock} />
      <path d="M-26-14C-12-16 8-16 24-15C36-14 44-10 48-3C36-7 20-9 4-9C-10-9-20-11-26-14Z" className={w.rockLit} />
      <path d="M-48 2C-46-6-38-12-26-14C-30-8-30-2-26 6H-48Z" className={w.rockShade} />
      <path d="M10-9C12-4 11 0 14 6M-6-9C-8-3-5 1-7 6" fill="none" style={{ stroke: "var(--w-rock-shade)" }} strokeWidth={0.9} opacity={0.5} />
    </At>
  );
}

/** An A-frame tent in three-quarter view. Width 46 × height 30. `glow` lights the door from inside. */
export function Tent({ x, y, k = 1, flip, ember, glow }: { x: number; y: number; k?: number; flip?: boolean; ember?: boolean; glow?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-4-30L24 0H-8Z" className={ember ? w.emberLo : w.canvasLoC} />
      <path d="M-4-30L-24 0H8Z" className={ember ? w.ember : w.canvasC} />
      <path d="M-4-22L-11 0H3Z" className={w.r4} style={glow ? { fill: "#FFD48A" } : undefined} />
      {glow ? <path d="M-4-22L-7 0H3Z" style={{ fill: "#FFB45A" }} /> : null}
      <path d="M-4-30L-4-34M-4-30L-27 1M-4-30L26 1" fill="none" style={{ stroke: "var(--w-wood-lo)" }} strokeWidth={1.1} strokeLinecap="round" />
      <path d="M-27 1L-31 2M26 1L30 2" fill="none" style={{ stroke: "var(--w-wood-lo)" }} strokeWidth={0.8} />
    </At>
  );
}

/** Campfire: a ring of stones, crossed logs, a three-tongued flame and its glow. Width 34. */
export function Campfire({ x, y, k = 1, id, sparks = true }: { x: number; y: number; k?: number; id: string; sparks?: boolean }) {
  return (
    <At x={x} y={y} k={k}>
      <defs>
        <radialGradient id={`${id}-fg`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={w.fireGlow0} />
          <stop offset="1" className={w.fireGlow1} />
        </radialGradient>
        <linearGradient id={`${id}-fl`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className={w.fire2} />
          <stop offset=".55" className={w.fire1} />
          <stop offset="1" className={w.fire0} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={-10} rx={70} ry={46} fill={`url(#${id}-fg)`} />
      <path d="M-15 0L13-9L15-6L-13 3Z" className={w.woodLoC} />
      <path d="M15 0L-13-9L-15-6L13 3Z" className={w.woodC} />
      <path d="M-15 0L-13 3L-12 0Z" className={w.woodHiC} />
      <g className={w.flicker}>
        <path d="M0-34C6-26 11-19 10-11C9-4 5 0 0 0C-5 0-9-4-10-11C-11-18-4-22 0-34Z" fill={`url(#${id}-fl)`} />
      </g>
      <g className={w.flicker2}>
        <path d="M-6-22C-2-16 1-12 0-6C-1-2-3 0-5 0C-8 0-10-3-10-7C-10-12-8-16-6-22Z" fill="#FFB347" opacity={0.9} />
        <path d="M7-18C9-13 10-9 9-5C8-1 6 0 4 0C2 0 1-3 2-7C3-11 5-14 7-18Z" fill="#FFD27A" opacity={0.85} />
        <path d="M1-16C3-12 4-8 3-5C2-2 0-1-1-1C-3-1-3-4-2-7C-1-10 0-13 1-16Z" fill="#FFF1C8" />
      </g>
      {[-18, -9, 9, 18].map((sx, i) => (
        <ellipse key={i} cx={sx} cy={1.5 - (i % 2) * 1.5} rx={5.2} ry={3.2} className={i % 2 ? w.rockLit : w.rock} />
      ))}
      {sparks ? (
        <g className={w.rise}>
          <circle cx={4} cy={-40} r={1.1} className={w.spark} />
          <circle cx={-5} cy={-48} r={0.8} className={w.spark} />
          <circle cx={9} cy={-55} r={0.7} className={w.spark} />
        </g>
      ) : null}
    </At>
  );
}

/** A trailhead sign: a post with two boards, the upper one in ember pointing on. Height 46. */
export function Signpost({ x, y, k = 1, flip }: { x: number; y: number; k?: number; flip?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-2.4 0V-46H2.4V0Z" className={w.woodC} />
      <path d="M0.6 0V-46H2.4V0Z" className={w.woodLoC} />
      <path d="M-4-40H22L28-35L22-30H-4Z" className={w.ember} />
      <path d="M-4-33H22L28-35L22-30H-4Z" className={w.emberLo} opacity={0.55} />
      <path d="M3-37H18" fill="none" stroke="#FFF4EA" strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
      <path d="M4-26H-20L-25-21.5L-20-17H4Z" className={w.canvasC} />
      <path d="M4-19.5H-20L-25-21.5L-20-17H4Z" className={w.canvasLoC} />
      <path d="M-17-22.5H-4" fill="none" style={{ stroke: "var(--w-wood-lo)" }} strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
    </At>
  );
}

/** A day pack leaning on its frame, an ember bookmark ribbon from the lid. Height 38. */
export function Backpack({ x, y, k = 1, flip }: { x: number; y: number; k?: number; flip?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-14 0C-16-10-15-26-11-33C-8-38 8-38 11-33C15-26 16-10 14 0Z" className={w.gear} />
      <path d="M4-37C9-36 11-33 12-29C15-20 15-9 14 0H6C8-12 8-26 4-37Z" className={w.gearLo} />
      <path d="M-12-31C-10-37 10-37 12-31C10-27-10-27-12-31Z" className={w.gearHi} />
      <path d="M-9-14H9C10-14 10-13 10-12V-3C10-2 9-1 8-1H-8C-9-1-10-2-10-3V-12C-10-13-10-14-9-14Z" className={w.gearHi} />
      <path d="M-10-8H10" fill="none" style={{ stroke: "var(--w-gear-lo)" }} strokeWidth={1} />
      <path d="M-3-29V-22L0-24.5L3-22V-29Z" className={w.ember} />
      <path d="M-3-29V-36H3V-29Z" className={w.ember} />
      <path d="M-15-30C-19-22-19-12-16-4" fill="none" style={{ stroke: "var(--w-gear-lo)" }} strokeWidth={2.4} strokeLinecap="round" />
    </At>
  );
}

/** A trail map laid open: four folded panels, a dotted route, an ember pin. Width 64. */
export function TrailMap({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <At x={x} y={y} k={k}>
      <path d="M-32-2L-18-20L-2-16L-16 2Z" className={w.mapC} />
      <path d="M-16 2L-2-16L14-20L0-2Z" className={w.mapLo} />
      <path d="M0-2L14-20L30-16L16 2Z" className={w.mapC} />
      <path d="M16 2L30-16L36-17L22 0Z" className={w.mapLo} />
      <path d="M-24-4C-18-8-12-6-6-10C0-14 6-8 12-12C16-15 20-14 24-16" className={w.dash} strokeWidth={1.6} style={{ strokeDasharray: "0 3.6" }} />
      <path d="M-10-14C-6-15-2-13 2-14" fill="none" style={{ stroke: "var(--w-paper-lo)" }} strokeWidth={0.8} />
      <g transform="translate(24 -16)">
        <path d="M0 0C-1-3-5-6-5-10A5 5 0 0 1 5-10C5-6 1-3 0 0Z" className={w.ember} />
        <circle cx={0} cy={-10} r={1.8} fill="#fff" />
      </g>
    </At>
  );
}

/** A camp lantern with a warm light. Height 22. */
export function Lantern({ x, y, k = 1, id }: { x: number; y: number; k?: number; id: string }) {
  return (
    <At x={x} y={y} k={k}>
      <defs>
        <radialGradient id={`${id}-lg`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={w.fireGlow0} />
          <stop offset="1" className={w.fireGlow1} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={-11} r={30} fill={`url(#${id}-lg)`} />
      <path d="M-4-22A4 4 0 0 1 4-22" fill="none" style={{ stroke: "var(--w-gear-lo)" }} strokeWidth={1.2} />
      <path d="M-5-19H5L4-17H-4Z" className={w.gearLo} />
      <path d="M-4-17H4V-4H-4Z" fill="#FFD48A" />
      <path d="M-1.5-14H1.5V-7H-1.5Z" className={w.ember} />
      <path d="M-4-17H-2V-4H-4ZM2-17H4V-4H2Z" className={w.gear} opacity={0.65} />
      <path d="M-5-4H5L6 0H-6Z" className={w.gearLo} />
    </At>
  );
}

/** Binoculars standing on their barrels, lenses to the viewer, an ember strap. Width 36 × height 30. */
export function Binoculars({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <At x={x} y={y} k={k}>
      <path d="M-14-22C-22-26-24-12-17-6" fill="none" style={{ stroke: "var(--g-ember)" }} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-15-9L-12-27H-3L-1-9Z" className={w.gear} />
      <path d="M1-9L3-27H12L15-9Z" className={w.gear} />
      <path d="M-6-27L-3-9H-1L-3-27ZM9-27L12-9H15L12-27Z" className={w.gearLo} />
      <path d="M-3-22H3V-15H-3Z" className={w.gearLo} />
      <rect x={-12} y={-31} width={9} height={5} rx={1.5} className={w.gearLo} />
      <rect x={3} y={-31} width={9} height={5} rx={1.5} className={w.gearLo} />
      <circle cx={-8} cy={-8} r={8.4} className={w.gearLo} />
      <circle cx={8} cy={-8} r={8.4} className={w.gearLo} />
      <circle cx={-8} cy={-8} r={6} className={w.lens} />
      <circle cx={8} cy={-8} r={6} className={w.lens} />
      <circle cx={-8} cy={-8} r={3.4} className={w.glacierLo} opacity={0.55} />
      <circle cx={8} cy={-8} r={3.4} className={w.glacierLo} opacity={0.55} />
      <path d="M-11.5-11A4.5 4.5 0 0 1-7-12.6M4.5-11A4.5 4.5 0 0 1 9-12.6" fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />
    </At>
  );
}

/** An enamel camp mug with steam. Height 14. */
export function Mug({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <At x={x} y={y} k={k}>
      <path d="M7-11C11-11 11-4 7-4" fill="none" style={{ stroke: "var(--g-ember-lo)" }} strokeWidth={1.6} />
      <path d="M-6-13H7V-1C7 0 6 1 5 1H-4C-5 1-6 0-6-1Z" className={w.ember} />
      <ellipse cx={0.5} cy={-13} rx={6.5} ry={1.6} className={w.emberLo} />
      <path d="M-6-13H-3V0H-4C-5 0-6-1-6-2Z" fill="#fff" opacity={0.25} />
      <g className={w.steamA}>
        <path d="M-1-17C-3-20 1-22-1-26M3-17C1-20 5-22 3-25" className={w.steam} />
      </g>
    </At>
  );
}

/** A cairn: stacked stones, the top one ember. Height ≈ 8 + 7 per stone. */
export function Cairn({ x, y, k = 1, stones = 5 }: { x: number; y: number; k?: number; stones?: number }) {
  let yy = 0;
  const out: ReactNode[] = [];
  for (let i = 0; i < stones; i++) {
    const rw = 13 - i * (9 / stones) + ((i * 7) % 3) * 0.6;
    const rh = 3.6 - i * 0.12;
    const dx = ((i * 5) % 3) - 1;
    const top = i === stones - 1;
    out.push(
      <g key={i}>
        <ellipse cx={dx} cy={yy - rh} rx={rw} ry={rh} className={top ? w.ember : w.rock} />
        <path d={`M${f(dx - rw * 0.2)} ${f(yy - rh * 1.9)}A${f(rw)} ${f(rh)} 0 0 1 ${f(dx + rw * 0.95)} ${f(yy - rh * 1.2)}`} fill="none" style={{ stroke: top ? "var(--g-ember-hi)" : "var(--w-rock-lit)" }} strokeWidth={1.4} strokeLinecap="round" />
      </g>,
    );
    yy -= rh * 1.9;
  }
  return (
    <At x={x} y={y} k={k}>
      {out}
    </At>
  );
}

/** A pennant on a pole; `text` is set in the cloth. Height 44. */
export function Pennant({ x, y, k = 1, text, flip }: { x: number; y: number; k?: number; text?: string; flip?: boolean }) {
  return (
    <At x={x} y={y} k={k} flip={flip}>
      <path d="M-1 0V-46H1V0Z" className={w.inkC} />
      <path d="M1-45C10-44 18-42 26-37C18-32 10-30 1-29Z" className={w.ember} />
      <path d="M1-37C10-36 18-37 26-37C18-32 10-30 1-29Z" className={w.emberLo} opacity={0.4} />
      {text ? (
        <text x={9} y={-33.5} fontSize={9} fontWeight={600} fill="#fff" textAnchor="middle" fontFamily="var(--font-display, 'Instrument Sans', system-ui)" transform={flip ? "scale(-1 1) translate(-18 0)" : undefined}>
          {text}
        </text>
      ) : null}
    </At>
  );
}

/**
 * A person seated, as a soft silhouette: shoulders, neck and head, forearms on
 * the knees. `lit` faces a fire in front of them (warm from below); otherwise
 * a dark shape with a thin warm rim on the edge turned to the light. Height 26.
 */
export function Seated({ x, y, k = 1, flip, tone = "r4", lit, id }: { x: number; y: number; k?: number; flip?: boolean; tone?: "r4" | "gear" | "ember"; lit?: boolean; id?: string }) {
  const c = tone === "ember" ? w.emberLo : tone === "gear" ? w.gearLo : w.r4;
  const body = "M-10 0C-11-5-10-10-8-13C-6-16-3-17 0-17S6-16 8-13C10-10 11-5 10 0Z";
  const head = "M0-27.5C2.8-27.5 4.6-25.4 4.6-22.6S3-17.4 0-17.4-4.6-19.8-4.6-22.6-2.8-27.5 0-27.5Z";
  const neck = "M-1.8-19H1.8V-15.6H-1.8Z";
  const fill = lit && id ? `url(#${id}-seat)` : undefined;
  return (
    <At x={x} y={y} k={k} flip={flip}>
      {lit && id ? (
        <defs>
          <linearGradient id={`${id}-seat`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--w-gear-lo)" }} />
            <stop offset=".62" style={{ stopColor: "var(--w-gear-lo)" }} />
            <stop offset="1" style={{ stopColor: "#C8713F" }} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={body + neck + head} className={fill ? undefined : c} fill={fill} />
      {lit ? <path d="M-4.6-22.6C-4.2-20-2.4-18.4 0-18.4S4.2-20 4.6-22.6C3.6-21 2-20.2 0-20.2S-3.6-21-4.6-22.6Z" fill="#F2A36B" opacity={0.6} /> : null}
      {!lit ? <path d="M-8-13C-6-16-3-17 0-17S6-16 8-13" fill="none" stroke="#FFB27A" strokeWidth={0.9} opacity={0.55} /> : null}
    </At>
  );
}

/** A sitting log (bench). Width 40. */
export function Log({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <At x={x} y={y} k={k}>
      <path d="M-20-7H18A3.5 3.5 0 0 1 18 0H-20Z" className={w.woodC} />
      <ellipse cx={-20} cy={-3.5} rx={2.4} ry={3.5} className={w.woodHiC} />
      <path d="M-14-4.5H6" fill="none" style={{ stroke: "var(--w-wood-lo)" }} strokeWidth={0.8} />
    </At>
  );
}

/** A kettlebell at rest, glacier blue with a clear handle. Height 32 at k = 1. */
export function Bell({ x, y, k = 1, id, ember }: { x: number; y: number; k?: number; id: string; ember?: boolean }) {
  return (
    <At x={x} y={y - 30.6 * k} k={k}>
      <defs>
        <radialGradient id={`${id}-bell`} cx=".34" cy=".56" r=".75">
          <stop offset="0" style={{ stopColor: ember ? "var(--g-ember-hi)" : "var(--g-bell-hi)" }} />
          <stop offset=".55" style={{ stopColor: ember ? "var(--g-ember)" : "var(--g-bell)" }} />
          <stop offset="1" style={{ stopColor: ember ? "var(--g-ember-lo)" : "var(--g-bell-lo)" }} />
        </radialGradient>
      </defs>
      <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
      <path d="M-8.8 19.4A10.6 9.6 0 0 1-.8 12.8" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M-4.8-.2H4.8" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1} strokeLinecap="round" />
    </At>
  );
}

/** Static confetti in the three Summit accents; one-shot fall when animated. */
export function Confetti({ x0, x1, y0, y1, n = 22, seed = 3 }: { x0: number; x1: number; y0: number; y1: number; n?: number; seed?: number }) {
  const r = rng(seed + 101);
  const tones = [w.confettiE, w.confettiG, w.confettiY, w.confettiE];
  return (
    <g className={w.confetti}>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + r() * (x1 - x0);
        const y = y0 + r() * (y1 - y0);
        const rot = Math.round(r() * 180);
        const t = tones[i % tones.length];
        const sq = r() > 0.35;
        return sq ? (
          <rect key={i} x={f(x)} y={f(y)} width={f(3 + r() * 3)} height={1.8} rx={0.9} transform={`rotate(${rot} ${f(x)} ${f(y)})`} className={t} />
        ) : (
          <circle key={i} cx={f(x)} cy={f(y)} r={1.3} className={t} />
        );
      })}
    </g>
  );
}
