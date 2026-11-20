import type { CSSProperties } from "react";
import "./gfx.css";
import "./Kettlebell.css";
import { BELL_OUTLINE, BELL_SHEEN, BELL_SPEC, BELL_WINDOW } from "./figures/bell";
import { cls, cx, useGfxId } from "./util";

const g = cls("gfx");
const s = cls("gfx-kettlebell");

export interface KettlebellProps {
  /** Height in px; width follows the 48:52 mark. */
  size?: number;
  /**
   * "line" for UI glyph use; "solid" for the cast-iron mark (a weight implies solid);
   * "competition" for Mike's bells: a tall, flat-sided steel competition bell with a flat base,
   * a large window and a thin straight handle, the same size at every weight and colour-coded by kg.
   */
  variant?: "line" | "solid" | "competition";
  /** Competition variant: paint the colour but leave the weight off the bell (e.g. a range label sits on top). */
  hideWeight?: boolean;
  /** Weight to cast on the bell, e.g. 16 → "16 kg". */
  weight?: number;
  unit?: "kg" | "lb";
  /** Paint the bell in its competition colour (8 pink, 12 blue, 16 yellow, …). */
  colorCoded?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** Competition kettlebell colours by kg (real-world standard; used as --kb-body / --kb-ink defaults). */
export const COMPETITION_COLOURS: Record<number, { body: string; ink: string }> = {
  8: { body: "#F29BC0", ink: "#3A0F22" },
  12: { body: "#3E7FE0", ink: "#FFFFFF" },
  16: { body: "#F3C316", ink: "#2A2100" },
  20: { body: "#8C5BD8", ink: "#FFFFFF" },
  24: { body: "#2E9E5B", ink: "#FFFFFF" },
  28: { body: "#F07D1A", ink: "#2A1300" },
  32: { body: "#DD3B35", ink: "#FFFFFF" },
  36: { body: "#8E9399", ink: "#FFFFFF" },
  40: { body: "#F2F2F2", ink: "#1A1A1A" },
  44: { body: "#C4C9CF", ink: "#1A1A1A" },
  48: { body: "#D9B24C", ink: "#2A1F00" },
};

/* The shared bell (x ±12.6, y -1.8..30.6) placed in the 48×52 box. */
const PLACE = "translate(24 6.6) scale(1.4)";

/** The kettlebell mark: a refined line glyph, a cast bell carrying its weight, or Mike's competition bell. */
/* Competition bell, drawn straight in the 48×52 box: flat base, near-vertical sides, rounded shoulders,
   straight horns, a thin flat handle and a large window. */
const COMP_OUTLINE =
  "M11 49.2H37Q40.6 49.2 40.8 45.6L41.2 32C41.4 24.4 38.8 19.4 34.6 16.8L34.2 6.4Q34.1 2.2 30 2.2H18Q13.9 2.2 13.8 6.4L13.4 16.8C9.2 19.4 6.6 24.4 6.8 32L7.2 45.6Q7.4 49.2 11 49.2Z";
const COMP_WINDOW = "M18.4 4.9H29.6Q31.4 4.9 31.5 6.8L31.8 15.3Q28.2 13.8 24 13.8Q19.8 13.8 16.2 15.3L16.5 6.8Q16.6 4.9 18.4 4.9Z";
const COMP_SPEC = "M10.2 25.4C9.2 30.4 9.2 38 10 44";
const COMP_SHEEN = "M18.4 3.6H29.6";

/** Nearest competition colour for any weight (e.g. 9 → 8). */
export function competitionColour(kg: number) {
  const keys = Object.keys(COMPETITION_COLOURS).map(Number);
  const k = keys.reduce((b, w) => (Math.abs(w - kg) < Math.abs(b - kg) ? w : b), keys[0]!);
  return { kg: k, ...COMPETITION_COLOURS[k]! };
}

export function Kettlebell(props: KettlebellProps) {
  if (props.variant === "competition" || (props.variant !== "line" && (props.weight !== undefined || props.colorCoded))) return <CompetitionBell {...props} />;
  return <ClassicBell {...props} />;
}

function CompetitionBell({ size = 48, weight, unit = "kg", hideWeight = false, className, style, title }: KettlebellProps) {
  const id = useGfxId("kbc");
  const comp = weight !== undefined ? competitionColour(weight) : undefined;
  const label = title ?? (weight !== undefined ? `${weight} ${unit} competition kettlebell` : "Competition kettlebell");
  const vars = comp ? { ["--kb-body" as string]: `var(--gfx-kb-${comp.kg}, ${comp.body})`, ["--kb-ink" as string]: comp.ink } : {};
  return (
    <svg
      viewBox="0 0 48 52"
      width={(size * 48) / 52}
      height={size}
      role="img"
      aria-label={label}
      className={cx(g.root, s.kb, s.solid, comp && s.comp, className)}
      style={{ ...style, ...vars }}
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className={s.b2} />
          <stop offset=".28" className={s.b0} />
          <stop offset=".62" className={s.b1} />
          <stop offset="1" className={s.b2} />
        </linearGradient>
        <radialGradient id={`${id}-sh`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.sh0} />
          <stop offset="1" className={s.sh1} />
        </radialGradient>
      </defs>
      <ellipse cx={24} cy={50} rx={18} ry={1.8} fill={`url(#${id}-sh)`} />
      <path d={COMP_OUTLINE + COMP_WINDOW} fillRule="evenodd" fill={`url(#${id}-b)`} />
      <path d={COMP_SPEC} className={s.spec} />
      <path d={COMP_SHEEN} className={s.sheen} />
      {weight !== undefined && !hideWeight ? (
        <text x={24} y={38.4} textAnchor="middle" className={s.weight}>
          <tspan className={s.num}>{weight}</tspan>
          <tspan dx={1.2} className={s.unit}>
            {unit}
          </tspan>
        </text>
      ) : null}
    </svg>
  );
}

function ClassicBell({ size = 48, variant, weight, unit = "kg", colorCoded = false, className, style, title }: KettlebellProps) {
  const id = useGfxId("kb");
  const solid = variant === "solid" || (variant !== "line" && weight !== undefined);
  const comp = colorCoded && weight !== undefined ? COMPETITION_COLOURS[weight] : undefined;
  const label = title ?? (weight !== undefined ? `${weight} ${unit} kettlebell` : "Kettlebell");
  const vars = comp ? { ["--kb-body" as string]: `var(--gfx-kb-${weight}, ${comp.body})`, ["--kb-ink" as string]: comp.ink } : {};

  return (
    <svg
      viewBox="0 0 48 52"
      width={(size * 48) / 52}
      height={size}
      role="img"
      aria-label={label}
      className={cx(g.root, s.kb, solid ? s.solid : s.line, comp && s.comp, className)}
      style={{ ...style, ...vars }}
    >
      {solid ? (
        <>
          <defs>
            <radialGradient id={`${id}-b`} cx=".34" cy=".58" r=".78">
              <stop offset="0" className={s.b0} />
              <stop offset=".55" className={s.b1} />
              <stop offset="1" className={s.b2} />
            </radialGradient>
            <radialGradient id={`${id}-sh`} cx=".5" cy=".5" r=".5">
              <stop offset="0" className={s.sh0} />
              <stop offset="1" className={s.sh1} />
            </radialGradient>
          </defs>
          <ellipse cx={24} cy={49.4} rx={17} ry={2.4} fill={`url(#${id}-sh)`} />
          <g transform={PLACE}>
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-b)`} />
            <path d={BELL_SPEC} className={s.spec} />
            <path d={BELL_SHEEN} className={s.sheen} />
          </g>
          {weight !== undefined ? (
            <text x={24} y={40.4} textAnchor="middle" className={s.weight}>
              <tspan className={s.num}>{weight}</tspan>
              <tspan dx={1.2} className={s.unit}>
                {unit}
              </tspan>
            </text>
          ) : null}
        </>
      ) : (
        <g transform={PLACE}>
          <path d={BELL_OUTLINE + BELL_WINDOW} className={s.outline} />
        </g>
      )}
    </svg>
  );
}
