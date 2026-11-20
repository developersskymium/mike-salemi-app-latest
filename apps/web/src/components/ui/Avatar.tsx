import Image from "next/image";
import { cx } from "./cx";

type Props = {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  /** fill (default), solid (label colour), glass, clear (over photos). */
  variant?: "fill" | "solid" | "glass" | "clear";
  className?: string;
};

const PX = { sm: 32, md: 38, lg: 44, xl: 64 } as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, src, size = "lg", variant = "fill", className }: Props) {
  const glass = variant === "glass" || variant === "clear";
  return (
    <span
      className={cx("lq-avatar", glass && "lq-glass", className)}
      data-size={size === "lg" ? undefined : size}
      data-variant={variant === "solid" ? "solid" : undefined}
      data-level={variant === "clear" ? "clear" : undefined}
      role="img"
      aria-label={name}
    >
      {src ? <Image src={src} alt="" fill sizes={`${PX[size]}px`} /> : <span aria-hidden>{initials(name).slice(0, size === "sm" || size === "md" ? 1 : 2)}</span>}
    </span>
  );
}
