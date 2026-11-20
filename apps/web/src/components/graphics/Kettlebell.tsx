import type { CSSProperties } from "react";
import "./gfx.css";
import "./Kettlebell.css";
import { cx, useGfxId, cls } from "./util";

const g = cls("gfx");
const s = cls("gfx-kettlebell");

export interface KettlebellProps {
  /** Height in px; width follows the 48:52 mark. */
  size?: number;
  /** "line" for UI glyph use; "solid" for the cast-iron mark. A weight implies solid. */
  variant?: "line" | "solid";
  /** Weight to cast on the bell, e.g. 16 → "16 kg". */
  weight?: number;
  unit?: "kg" | "lb";
  /** Paint the bell in its competition colour (8 pink, 12 blue, 16 yellow, …). */
  colorCoded?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const HANDLE = "M15.3 20.2 14.5 12.2C14.25 7.7 16.9 5 21.2 5h5.6c4.3 0 6.95 2.7 6.7 7.2l-.8 8";
const BODY = "M17.7 44.6a15 15 0 1 1 12.6 0Z";

/** Competition kettlebell colours by kg. */
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

/** The kettlebell mark: a refined glyph, or a cast bell carrying its weight. */
export function Kettlebell({ size = 48, variant, weight, unit = "kg", colorCoded = false, className, style, title }: KettlebellProps) {
  const id = useGfxId("kb");
  const solid = variant === "solid" || (variant === undefined && weight !== undefined);
  const comp = colorCoded && weight !== undefined ? COMPETITION_COLOURS[weight] : undefined;
  const label = title ?? (weight !== undefined ? `${weight} ${unit} kettlebell` : "Kettlebell");
  const vars = comp ? { ["--kb-body" as string]: comp.body, ["--kb-ink" as string]: comp.ink } : {};

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
            <radialGradient id={`${id}-b`} cx=".36" cy=".3" r=".8">
              <stop offset="0" className={s.b0} />
              <stop offset=".55" className={s.b1} />
              <stop offset="1" className={s.b2} />
            </radialGradient>
            <linearGradient id={`${id}-h`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className={s.h0} />
              <stop offset=".5" className={s.h1} />
              <stop offset="1" className={s.h0} />
            </linearGradient>
          </defs>
          <ellipse cx={24} cy={46.6} rx={13} ry={1.8} className={s.shadow} />
          <path d={HANDLE} stroke={`url(#${id}-h)`} className={s.handle} />
          <path d={BODY} fill={`url(#${id}-b)`} className={s.body} />
          <path d="M13.2 27.4a11.6 11.6 0 0 1 6.6-8" className={s.spec} />
          {weight !== undefined ? (
            <text x={24} y={34.6} textAnchor="middle" className={s.weight}>
              <tspan className={s.num}>{weight}</tspan>
              <tspan dx={1.6} className={s.unit}>
                {unit}
              </tspan>
            </text>
          ) : null}
        </>
      ) : (
        <>
          <path d={HANDLE} />
          <path d={BODY} />
        </>
      )}
    </svg>
  );
}
