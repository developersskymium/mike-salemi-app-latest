import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  /** glass, clear (over photos), fill, tint (accent: "now"), outline. */
  variant?: "glass" | "clear" | "fill" | "tint" | "outline";
  icon?: IconName;
  /** Leading accent dot ("live", "now"). */
  dot?: boolean;
  /** Leading score badge (e.g. readiness 14). */
  score?: number | string;
  selected?: boolean;
  children?: ReactNode;
};

export function Chip({ variant = "glass", icon, dot, score, selected, className, children, ...rest }: ChipProps) {
  const glass = variant === "glass" || variant === "clear";
  return (
    <span
      className={cx("lq-chip", glass && "lq-glass", className)}
      data-variant={glass ? undefined : variant}
      data-level={variant === "clear" ? "clear" : undefined}
      data-selected={selected ? "" : undefined}
      {...rest}
    >
      {score !== undefined && <span className="lq-score">{score}</span>}
      {dot && <span className="lq-dot" aria-hidden />}
      {icon && <Icon name={icon} size="sm" />}
      {children !== undefined && <span>{children}</span>}
    </span>
  );
}
