import type { CSSProperties, ReactNode } from "react";
import { BELL_24 } from "./DayGlyph";
import "./gfx.css";
import { MovementFigure } from "./MovementFigure";
import "./EmptyScene.css";
import { cx, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-empty-scene");

export type EmptySceneName = "no-programs" | "nothing-saved" | "plan-empty" | "offline" | "caught-up";
export const EMPTY_SCENES: EmptySceneName[] = ["no-programs", "nothing-saved", "plan-empty", "offline", "caught-up"];

export interface EmptySceneProps {
  scene: EmptySceneName;
  /** Width in px; height follows 3:2. */
  size?: number;
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const LABEL: Record<EmptySceneName, string> = {
  "no-programs": "A trail up an empty mountain",
  "nothing-saved": "An empty bookmark among the pines",
  "plan-empty": "An empty calendar at dawn",
  offline: "A fire circle down to its last ember",
  "caught-up": "Someone resting on a ridge at sunrise",
};

/** Line pine: a trunk and three soft chevrons. */
const Pine = ({ x, y, h }: { x: number; y: number; h: number }) => {
  const w = h * 0.3;
  const tiers = [0.2, 0.46, 0.72].map((t, i) => {
    const ty = y - h + h * t;
    const tw = w * (0.45 + i * 0.28);
    return `M${x - tw} ${ty + h * 0.2}Q${x - tw * 0.3} ${ty + h * 0.12} ${x} ${ty}Q${x + tw * 0.3} ${ty + h * 0.12} ${x + tw} ${ty + h * 0.2}`;
  });
  return <path d={`M${x} ${y}V${y - h}${tiers.join("")}`} />;
};

const ART: Record<EmptySceneName, ReactNode> = {
  "no-programs": (
    <>
      <path className={s.soft} d="M14 132H226" />
      <path d="M34 132 80 74l16 18 28-44 26 34 14-12 38 62" />
      <path className={s.soft} d="m116 60 5 4 5-4 4 3" />
      <path className={s.trail} d="M118 156c-8-10 18-14 10-24s-22-10-12-22 18-10 10-22-12-8-4-18c4-5 2-11 2-14" />
      <g transform="translate(58 112) scale(.86)">
        <path d={BELL_24.handle} />
        <path d={BELL_24.body} />
      </g>
      <g className={s.flag}>
        <path d="M124 48V30" />
        <path className={s.accentFill} d="M124 30l11 4-11 4Z" />
      </g>
    </>
  ),
  "nothing-saved": (
    <>
      <path className={s.soft} d="M14 132H226" />
      <g className={s.soft2}>
        <Pine x={44} y={132} h={52} />
        <Pine x={66} y={132} h={36} />
        <Pine x={190} y={132} h={44} />
      </g>
      <ellipse className={s.shadow} cx={120} cy={134} rx={18} ry={2.5} />
      <g className={s.bob}>
        <path className={s.accentLine} d="M106 46a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v64l-14-10-14 10Z" />
      </g>
      <path className={s.soft} d="M150 128c2-4 3-8 3-12M156 128c0-3 2-6 4-8M84 128c-1-3-3-6-6-8" />
    </>
  ),
  "plan-empty": (
    <>
      <path className={s.soft} d="M14 132H226" />
      <path className={s.soft} d="M24 132l30-22 18 10 22-16M146 104l20 12 18-10 32 26" />
      <rect x={72} y={36} width={96} height={88} rx={14} className={s.card} />
      <path d="M72 58h96" className={s.soft} />
      <path d="M98 30v12M142 30v12" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) =>
          r === 1 && c === 3 ? null : <circle key={`${r}-${c}`} cx={87 + c * 11} cy={74 + r * 15} r={1.6} className={s.dot} />,
        ),
      )}
      <circle cx={120} cy={89} r={9} className={s.todayHalo} />
      <circle cx={120} cy={89} r={4} className={s.accentFill} />
    </>
  ),
  offline: (
    <>
      <path className={s.soft} d="M14 132H226" />
      <g className={s.smoke}>
        <path className={s.soft} d="M120 92c-7-9 7-14 0-23s5-14 0-23 3-10 1-15" />
        <path className={cx(s.soft, s.smoke2)} d="M126 88c5-7-4-12 2-19s-2-11 2-16" />
      </g>
      <path d="M102 126 118 92M138 126 122 92M120 128V90" />
      {[
        [80, 126, 8, 4.5],
        [94, 131, 9, 5],
        [111, 134, 9, 4.5],
        [129, 134, 9, 4.5],
        [146, 131, 9, 5],
        [160, 126, 8, 4.5],
      ].map(([x, y, rx, ry]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} className={s.stone} />
      ))}
      <circle cx={120} cy={118} r={9} className={s.emberGlow} />
      <circle cx={120} cy={119} r={3} className={cx(s.accentFill, s.ember)} />
    </>
  ),
  "caught-up": (
    <>
      <circle cx={178} cy={60} r={14} className={s.sun} />
      <circle cx={178} cy={60} r={22} className={s.sunHalo} />
      <path className={s.soft} d="M14 132H226" />
      <path d="M40 132c22-20 46-26 72-26s52 8 76 26" />
      <path className={s.soft} d="M196 46h12M200 40h6M30 64h10M34 58h4" />
    </>
  ),
};

/** Calm line illustrations for empty and edge states, one accent detail each. */
export function EmptyScene({ scene, size = 240, animated = true, className, style, title }: EmptySceneProps) {
  return (
    <svg
      viewBox="0 0 240 160"
      width={size}
      height={(size * 160) / 240}
      role="img"
      aria-label={title ?? LABEL[scene]}
      className={cx(g.root, g.line, s.scene, animated && s.animated, className)}
      style={style}
    >
      {ART[scene]}
      {scene === "caught-up" ? (
        <g transform="translate(74 14)">
          <MovementFigure move="breathing" size={100} bare animated={animated} stroke={1.5} title="Resting" />
        </g>
      ) : null}
    </svg>
  );
}
