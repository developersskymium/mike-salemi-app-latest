import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ChipVariant = "glass" | "clear" | "fill" | "tint" | "accent" | "warm" | "ok" | "solid" | "ink" | "outline";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  /**
   * glass (default: sunk with a hairline), clear (glass over photos), fill (sunk), tint/accent (glacier wash: "now"),
   * warm (ember wash: streaks, progress), ok (done), solid (glacier), ink, outline.
   */
  variant?: ChipVariant;
  size?: "sm" | "md";
  icon?: IconName;
  /** Leading live dot ("live", "now"). */
  dot?: boolean;
  /** Leading score badge (e.g. readiness 14). */
  score?: number | string;
  selected?: boolean;
  children?: ReactNode;
};

export function Chip({ variant = "glass", size = "md", icon, dot, score, selected, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cx("lq-chip", className)}
      data-variant={variant === "glass" || variant === "clear" ? undefined : variant}
      data-level={variant === "clear" ? "clear" : undefined}
      data-size={size === "sm" ? "sm" : undefined}
      data-selected={selected ? "" : undefined}
      {...rest}
    >
      {score !== undefined && <span className="lq-score">{score}</span>}
      {dot && <span className="lq-dot" aria-hidden />}
      {icon && <Icon name={icon} size="xs" />}
      {children !== undefined && <span>{children}</span>}
    </span>
  );
}

/** A small uppercase label: CONTINUE (warm), BEST NEXT STEP (accent), NEW, medals (gold). */
export function Tag({ tone = "accent", size = "md", icon, className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: "accent" | "warm" | "light" | "gold" | "ink" | "ok"; size?: "md" | "lg"; icon?: IconName; children: ReactNode }) {
  return (
    <span className={cx("lq-tag", className)} data-tone={tone === "accent" ? undefined : tone} data-size={size === "lg" ? "lg" : undefined} {...rest}>
      {icon && <Icon name={icon} size="xs" />}
      {children}
    </span>
  );
}
