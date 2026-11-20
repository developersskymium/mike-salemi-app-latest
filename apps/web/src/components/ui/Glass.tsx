import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type GlassLevel = "regular" | "thick" | "clear" | "clear-deep" | "night";

type GlassOwnProps<T extends ElementType> = {
  as?: T;
  /**
   * regular: matte film (cards, panels). thick: floating film with a light blur (bars, sheets).
   * clear: over photography (white content). night: a night exposure that stays dark in both themes.
   */
  level?: GlassLevel;
  /** Tints the fill with a colour (e.g. a photo's dominant colour). */
  tint?: string;
  /** Corner radius token name or px. */
  radius?: "card" | "panel" | "inner" | "thumb" | "control" | "pill" | "hero" | "sheet" | number;
  /** Interactive surface: spring press, highlight sweep, cursor specular (desktop). */
  interactive?: boolean;
  /** Floating layer (tab bar, sheet): gets the single float shadow. */
  float?: boolean;
  /** Light leak: the plate's edge has caught a trace passing over it. */
  leak?: boolean;
  children?: ReactNode;
};

export type GlassProps<T extends ElementType = "div"> = GlassOwnProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof GlassOwnProps<T>>;

export function radiusValue(r: GlassOwnProps<"div">["radius"]): string | undefined {
  if (r === undefined) return undefined;
  return typeof r === "number" ? `${r}px` : `var(--r-${r})`;
}

/** The Trace film surface (the component keeps its Liquid name). Matte, edges catch light. */
export function Glass<T extends ElementType = "div">({ as, level = "regular", tint, radius, interactive, float, leak, className, style, children, ...rest }: GlassProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const s = { borderRadius: radiusValue(radius), ...(tint ? { "--tint": tint } : {}), ...(style as CSSProperties) } as CSSProperties;
  return (
    <Tag
      className={cx("lq-glass", level === "night" && "lq-night", interactive && "lq-fx lq-press", className)}
      data-level={level === "regular" ? undefined : level}
      data-tint={tint ? "" : undefined}
      data-float={float ? "" : undefined}
      data-leak={leak ? "" : undefined}
      data-fx={interactive ? "" : undefined}
      style={s}
      {...rest}
    >
      {children}
    </Tag>
  );
}
