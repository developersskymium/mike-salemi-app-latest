import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type GlassLevel = "regular" | "thick" | "clear" | "clear-deep";

type GlassOwnProps<T extends ElementType> = {
  as?: T;
  /** regular: cards, bars. thick: sheets, tables. clear: over photography (white content). */
  level?: GlassLevel;
  /** Tints the fill with a colour (e.g. a photo's dominant colour). */
  tint?: string;
  /** Corner radius token name or px. */
  radius?: "card" | "panel" | "inner" | "thumb" | "control" | "pill" | "hero" | "sheet" | number;
  /** Interactive surface: spring press, highlight sweep, cursor specular (desktop). */
  interactive?: boolean;
  /** Floating layer (tab bar, sheet): gets the single float shadow. */
  float?: boolean;
  children?: ReactNode;
};

export type GlassProps<T extends ElementType = "div"> = GlassOwnProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof GlassOwnProps<T>>;

export function radiusValue(r: GlassOwnProps<"div">["radius"]): string | undefined {
  if (r === undefined) return undefined;
  return typeof r === "number" ? `${r}px` : `var(--r-${r})`;
}

/** The Liquid glass surface. Never stack more than two glass levels. */
export function Glass<T extends ElementType = "div">({ as, level = "regular", tint, radius, interactive, float, className, style, children, ...rest }: GlassProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const s = { borderRadius: radiusValue(radius), ...(tint ? { "--tint": tint } : {}), ...(style as CSSProperties) } as CSSProperties;
  return (
    <Tag
      className={cx("lq-glass", interactive && "lq-fx lq-press", className)}
      data-level={level === "regular" ? undefined : level}
      data-tint={tint ? "" : undefined}
      data-float={float ? "" : undefined}
      data-fx={interactive ? "" : undefined}
      style={s}
      {...rest}
    >
      {children}
    </Tag>
  );
}
