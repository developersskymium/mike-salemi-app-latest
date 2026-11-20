import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type GlassLevel = "regular" | "thick" | "clear" | "clear-deep" | "night";

type GlassOwnProps<T extends ElementType> = {
  as?: T;
  /**
   * regular: a white Summit card with real depth (cards, panels). thick: true glass, for the floating
   * phone tab bar only. clear: small glass over photography (badges, video controls; white content).
   * night: an ink panel that stays dark in both themes.
   */
  level?: GlassLevel;
  /** Tints the fill with a colour (e.g. a photo's dominant colour). */
  tint?: string;
  /** Corner radius token name or px. */
  radius?: "card" | "panel" | "inner" | "thumb" | "control" | "pill" | "hero" | "sheet" | number;
  /** Interactive surface: spring press, deeper shadow on hover. */
  interactive?: boolean;
  /** Floating layer: the deepest shadow (level 3). */
  float?: boolean;
  /** Retired (Trace light leak). Accepted, ignored. */
  leak?: boolean;
  children?: ReactNode;
};

export type GlassProps<T extends ElementType = "div"> = GlassOwnProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof GlassOwnProps<T>>;

export function radiusValue(r: GlassOwnProps<"div">["radius"]): string | undefined {
  if (r === undefined) return undefined;
  return typeof r === "number" ? `${r}px` : `var(--r-${r})`;
}

/** The Summit surface (the component keeps its Liquid name): white card, soft real shadow. */
export function Glass<T extends ElementType = "div">({ as, level = "regular", tint, radius, interactive, float, leak: _leak, className, style, children, ...rest }: GlassProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const s = { borderRadius: radiusValue(radius), ...(tint ? { "--tint": tint } : {}), ...(style as CSSProperties) } as CSSProperties;
  return (
    <Tag
      className={cx("lq-glass", level === "night" && "lq-night", interactive && "lq-press", className)}
      data-level={level === "regular" ? undefined : level}
      data-tint={tint ? "" : undefined}
      data-float={float ? "" : undefined}
      style={s}
      {...rest}
    >
      {children}
    </Tag>
  );
}
