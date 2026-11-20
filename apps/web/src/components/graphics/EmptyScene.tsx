import type { CSSProperties, ReactNode } from "react";
import { BELL_BASE, BELL_OUTLINE, BELL_SHEEN, BELL_SPEC, BELL_WINDOW } from "./figures/bell";
import "./gfx.css";
import "./EmptyScene.css";
import { MovementFigure } from "./MovementFigure";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-empty-scene");

export type EmptySceneName = "no-programs" | "nothing-saved" | "plan-empty" | "offline" | "caught-up";
export const EMPTY_SCENES: EmptySceneName[] = ["no-programs", "nothing-saved", "plan-empty", "offline", "caught-up"];

export interface EmptySceneProps {
  scene: EmptySceneName;
  /** Width in px; height follows 3:2. */
  size?: number;
  /** One-shot entrance: layers settle into place (off under reduced motion). */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const LABEL: Record<EmptySceneName, string> = {
  "no-programs": "Kettlebells resting on a training mat, mountains behind",
  "nothing-saved": "A chalk bowl with an unused bookmark ribbon",
  "plan-empty": "A mountain ridge at dawn, the sun just rising",
  offline: "A campfire down to its embers under the night sky",
  "caught-up": "Someone resting by a still glacier lake",
};

/* The world sits in a round porthole; foreground pieces break out of it for depth. */
const PC = { x: 120, y: 76, r: 62 };

/** A kettlebell standing on the floor at (x, base y). tone: the accent bell or cast iron. */
function Bell({ id, x, y, k, tone }: { id: string; x: number; y: number; k: number; tone: "accent" | "iron" }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 0.6} rx={15 * k} ry={2.6 * k} fill={`url(#${id}-contact)`} />
      <g transform={`translate(${x} ${y - BELL_BASE * k}) scale(${k})`}>
        <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-${tone})`} />
        <path d={BELL_SPEC} className={s.spec} />
        <path d={BELL_SHEEN} className={s.sheen} />
      </g>
    </g>
  );
}

function Defs({ id, sky }: { id: string; sky: "dawn" | "day" | "night" }) {
  return (
    <defs>
      <clipPath id={`${id}-port`}>
        <circle cx={PC.x} cy={PC.y} r={PC.r} />
      </clipPath>
      <linearGradient id={`${id}-sky`} x1="0" y1={PC.y - PC.r} x2="0" y2={PC.y + PC.r} gradientUnits="userSpaceOnUse">
        <stop offset="0" className={s[`${sky}A`]} />
        <stop offset="1" className={s[`${sky}B`]} />
      </linearGradient>
      <linearGradient id={`${id}-mtn`} x1="0" y1="40" x2="0" y2="130" gradientUnits="userSpaceOnUse">
        <stop offset="0" className={s.mtnTop} />
        <stop offset="1" className={s.mtnBottom} />
      </linearGradient>
      <linearGradient id={`${id}-haze`} x1="0" y1="100" x2="0" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0" className={s.hazeA} />
        <stop offset="1" className={s.hazeB} />
      </linearGradient>
      <radialGradient id={`${id}-floor`} cx=".5" cy=".5" r=".5">
        <stop offset="0" className={s.floorA} />
        <stop offset="1" className={s.floorB} />
      </radialGradient>
      <radialGradient id={`${id}-contact`} cx=".5" cy=".5" r=".5">
        <stop offset="0" className={s.contactA} />
        <stop offset="1" className={s.contactB} />
      </radialGradient>
      <radialGradient id={`${id}-accent`} cx=".34" cy=".58" r=".75">
        <stop offset="0" className={s.accHi} />
        <stop offset=".55" className={s.acc} />
        <stop offset="1" className={s.accLo} />
      </radialGradient>
      <radialGradient id={`${id}-iron`} cx=".34" cy=".58" r=".75">
        <stop offset="0" className={s.ironHi} />
        <stop offset=".6" className={s.iron} />
        <stop offset="1" className={s.ironLo} />
      </radialGradient>
      <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
        <stop offset="0" className={s.glowA} />
        <stop offset="1" className={s.glowB} />
      </radialGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.glassA} />
        <stop offset="1" className={s.glassB} />
      </linearGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" className={s.rim1} />
        <stop offset=".35" className={s.rim0} />
        <stop offset=".7" className={s.rim0} />
        <stop offset="1" className={s.rim2} />
      </linearGradient>
      <linearGradient id={`${id}-lake`} x1="0" y1="100" x2="0" y2="138" gradientUnits="userSpaceOnUse">
        <stop offset="0" className={s.lakeA} />
        <stop offset="1" className={s.lakeB} />
      </linearGradient>
      <linearGradient id={`${id}-bowl`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" className={s.ironLo} />
        <stop offset=".35" className={s.ironHi} />
        <stop offset="1" className={s.ironLo} />
      </linearGradient>
      <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>
    </defs>
  );
}

/** The porthole: sky, whatever world is passed, a faint rim. */
function Porthole({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <ellipse cx={120} cy={139} rx={104} ry={10} fill={`url(#${id}-floor)`} />
      <g clipPath={`url(#${id}-port)`} className={s.world}>
        <rect x={PC.x - PC.r} y={PC.y - PC.r} width={PC.r * 2} height={PC.r * 2} fill={`url(#${id}-sky)`} />
        {children}
      </g>
      <circle cx={PC.x} cy={PC.y} r={PC.r - 0.4} className={s.portRim} />
    </>
  );
}

const RIDGE_BACK = "M50 112 72 96Q76 93 80 96L96 104 116 86Q120 82.6 124 86L146 102 162 92Q166 89.6 170 92L192 108V140H50Z";
const PEAKS =
  "M50 124 78 98Q83 93 88 98L100 110 122 68Q128 58.6 134 68L154 100 164 92Q168.6 88 173 92L192 108V140H50Z";
const SNOW = "M115.6 80.4 122 68Q128 58.6 134 68L140.6 79.6 135.2 76.6 130.4 81 125.4 76.8 120.2 81.4Z";

const SCENES: Record<EmptySceneName, (id: string) => ReactNode> = {
  /* Gear laid out, ready: two cast-iron bells and the glacier bell on a glass training mat. */
  "no-programs": (id) => (
    <>
      <Defs id={id} sky="dawn" />
      <Porthole id={id}>
        <path d={RIDGE_BACK} className={s.ridgeFar} />
        <path d={PEAKS} fill={`url(#${id}-mtn)`} />
        <path d={SNOW} className={s.snow} />
        <rect x={50} y={104} width={150} height={40} fill={`url(#${id}-haze)`} />
      </Porthole>
      <g className={s.layer2}>
        {/* Mat: a glass slab lying on the floor, seen in perspective. */}
        <path d="M60 140.6 82 120.4Q83.6 119 85.8 119H174.2Q176.4 119 178 120.4L200 140.6Z" className={s.matEdge} transform="translate(0 2.4)" />
        <path d="M60 140.6 82 120.4Q83.6 119 85.8 119H174.2Q176.4 119 178 120.4L200 140.6Z" fill={`url(#${id}-glass)`} />
        <path d="M60 140.6 82 120.4Q83.6 119 85.8 119H174.2Q176.4 119 178 120.4L200 140.6Z" className={s.matRim} stroke={`url(#${id}-rim)`} />
        <path d="M74 134H186M86 126.6H174" className={s.matLine} />
      </g>
      <g className={s.layer3}>
        <Bell id={id} x={96} y={128} k={0.62} tone="iron" />
        <Bell id={id} x={154} y={128.6} k={0.54} tone="iron" />
        <Bell id={id} x={125} y={137.2} k={0.8} tone="accent" />
      </g>
    </>
  ),

  /* Nothing marked yet: a chalk bowl, one block of chalk, the bookmark ribbon lying unused. */
  "nothing-saved": (id) => (
    <>
      <Defs id={id} sky="day" />
      <Porthole id={id}>
        <path d={RIDGE_BACK} className={s.ridgeFar} />
        <path d={PEAKS} fill={`url(#${id}-mtn)`} />
        <path d={SNOW} className={s.snow} />
        <rect x={50} y={100} width={150} height={44} fill={`url(#${id}-haze)`} />
        <g className={s.dust} filter={`url(#${id}-soft)`}>
          <circle cx={92} cy={58} r={3} />
          <circle cx={150} cy={50} r={2.2} />
          <circle cx={164} cy={70} r={1.6} />
          <circle cx={80} cy={84} r={1.8} />
        </g>
      </Porthole>
      <g className={s.layer2}>
        <ellipse cx={120} cy={141.2} rx={40} ry={4} fill={`url(#${id}-contact)`} />
        {/* Bowl: turned stone, open towards us. */}
        <path d="M84 108Q84 140 120 140T156 108Z" fill={`url(#${id}-bowl)`} />
        <ellipse cx={120} cy={108} rx={36} ry={9} className={s.bowlLip} />
        <ellipse cx={120} cy={108.6} rx={32.4} ry={7.2} className={s.bowlIn} />
        {/* Loose chalk and the block. */}
        <path d="M92 110.6Q104 104.6 120 105.6T148 110.6Q134 115 120 115T92 110.6Z" className={s.chalk} />
        <path d="M108 101.6 121.6 98.4Q124 97.9 125.6 99.6L129 103.4Q130.2 105 128 105.6L114.6 108.6Q112.4 109.1 111 107.4L107.2 103.4Q106 102 108 101.6Z" className={s.chalkBlock} />
        <path d="M108.4 102.2 121.8 99.1 125.6 103.3 112.3 106.4Z" className={s.chalkTop} />
        <g className={s.dust}>
          <circle cx={78} cy={138} r={1.2} />
          <circle cx={166} cy={139} r={1} />
          <circle cx={172} cy={136} r={0.7} />
          <circle cx={70} cy={140} r={0.8} />
        </g>
      </g>
      <g className={s.layer3}>
        {/* The ribbon: draped over the rim, the one accent. */}
        <path d="M146 101.4Q150 100.6 151 104L154.4 132.8 149.4 128.6 144.4 133.6 143.4 104.4Q143.2 101.8 146 101.4Z" fill={`url(#${id}-accent)`} />
        <path d="M145.6 104.6 146.6 126" className={s.ribbonSheen} />
      </g>
    </>
  ),

  /* A blank day ahead: ridgelines stacked into the haze, the sun just clearing them. */
  "plan-empty": (id) => (
    <>
      <Defs id={id} sky="dawn" />
      <Porthole id={id}>
        <circle cx={140} cy={97} r={42} fill={`url(#${id}-glow)`} />
        <circle cx={140} cy={97} r={12.5} fill={`url(#${id}-accent)`} className={s.sun} />
        <path d="M50 96 70 88 92 94 112 84 132 92 152 86 176 94 192 90V140H50Z" className={s.ridge1} />
        <rect x={50} y={92} width={150} height={14} fill={`url(#${id}-haze)`} opacity={0.6} />
        <path d="M50 104 66 98 88 104 106 94 128 102 150 96 168 103 192 98V140H50Z" className={s.ridge2} />
        <path d="M50 114 74 104 96 112 118 100 140 110 164 104 192 112V140H50Z" className={s.ridge3} />
      </Porthole>
      <g className={s.layer2}>
        <path d="M46 141C66 133 80 123 96 124.4C108 125.4 118 117 128 112.4C135.6 109 143 114 152 120C166 129 182 136 196 141Z" fill={`url(#${id}-mtn)`} className={s.front} />
        <path d="M130.6 113.6 126.4 117.4 131 119.6 125.6 123.4 131 126.4 124.4 131" className={s.trail} />
      </g>
    </>
  ),

  /* Offline: the fire's down to embers; stars overhead, pines at the edge of the clearing. */
  offline: (id) => (
    <>
      <Defs id={id} sky="night" />
      <Porthole id={id}>
        <g className={s.stars}>
          {[
            [86, 40, 0.9],
            [104, 28, 0.7],
            [128, 36, 1.1],
            [150, 26, 0.8],
            [164, 46, 0.7],
            [76, 62, 0.6],
            [140, 54, 0.6],
            [112, 52, 0.5],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
        <path
          d="M50 126V112L58 106 54 106 62 96 58 96 66 84 74 96 70 96 78 106 74 106 82 112V120L90 114 86 114 94 104 102 114 98 114 104 120V126ZM146 126V118L152 112 149 112 156 102 152 102 160 90 168 102 164 102 171 112 168 112 174 118V126L182 116 179 116 186 106 193 116V126Z"
          className={s.pines}
        />
        <path d="M50 124Q90 118 120 120T192 122V140H50Z" className={s.clearing} />
      </Porthole>
      <g className={s.layer2}>
        <circle cx={120} cy={126} r={26} fill={`url(#${id}-glow)`} />
        <path d="M121 116C116 108 126 104 120 96S124 86 121 80" className={s.smoke} />
        <path d="M100 133 138 124" className={s.log} />
        <path d="M102 124 140 133" className={s.log} />
        <path d="M100 133 138 124" className={s.logTop} />
        <path d="M102 124 140 133" className={s.logTop} />
        {[
          [88, 134, 7, 4],
          [99, 138.6, 7.4, 4],
          [113, 140.6, 7.4, 3.8],
          [127, 140.6, 7.4, 3.8],
          [141, 138.6, 7.4, 4],
          [152, 134, 7, 4],
        ].map(([x, y, rx, ry]) => (
          <g key={`${x}`}>
            <ellipse cx={x} cy={y + 1.4} rx={rx} ry={ry * 0.6} fill={`url(#${id}-contact)`} />
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id}-iron)`} />
          </g>
        ))}
      </g>
      <g className={s.layer3}>
        <ellipse cx={120} cy={130.4} rx={9} ry={3.4} fill={`url(#${id}-accent)`} className={s.ember} />
        <circle cx={115} cy={129.6} r={1.6} className={s.emberHot} />
        <circle cx={124} cy={130.4} r={1.3} className={s.emberHot} />
        <circle cx={126} cy={118} r={0.9} className={s.spark} />
      </g>
    </>
  ),

  /* All caught up: a still glacier lake holding the mountain's reflection; someone resting on the shore. */
  "caught-up": (id) => (
    <>
      <Defs id={id} sky="day" />
      <Porthole id={id}>
        <path d={RIDGE_BACK} className={s.ridgeFar} transform="translate(0 -8)" />
        <path d={PEAKS} fill={`url(#${id}-mtn)`} transform="translate(0 -10)" />
        <path d={SNOW} className={s.snow} transform="translate(0 -10)" />
        <rect x={50} y={104} width={150} height={40} fill={`url(#${id}-lake)`} />
        <g transform="translate(0 210) scale(1 -1)" filter={`url(#${id}-blur)`} className={s.reflect}>
          <path d={PEAKS} transform="translate(0 -10)" />
        </g>
        <path d="M76 116H104M126 122H168M92 129H122M140 112H158" className={s.ripple} />
      </Porthole>
      <g className={s.layer2}>
        <path d="M54 141Q60 128 76 128Q86 126 92 132Q100 130 104 136Q108 141 104 141Z" fill={`url(#${id}-iron)`} />
        <path d="M150 141Q154 134 164 134Q172 132 178 137Q184 136 186 141Z" fill={`url(#${id}-iron)`} />
      </g>
      <g className={s.layer3}>
        <g transform="translate(58 85) scale(.2)">
          <MovementFigure move="breathing" size={240} bare title="Resting" />
        </g>
      </g>
    </>
  ),
};

/**
 * Empty and edge states as small dimensional worlds from Mike's universe —
 * a porthole of sky and mountains with foreground pieces breaking out of it,
 * neutral materials, and exactly one accent each.
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
