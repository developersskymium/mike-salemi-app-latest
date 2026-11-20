import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { Icon, type IconName, type IconSize } from "./Icon";

export type IconButtonProps = {
  icon: IconName;
  /** Required accessible name. */
  label: string;
  /** glass (default), clear (over photos), fill (on glass), plain. */
  variant?: "glass" | "clear" | "fill" | "plain";
  size?: "sm" | "md" | "lg";
  iconSize?: IconSize;
  href?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/** Circular control, 44px target (38px visual on dense rows, still padded to 44 by layout). */
export function IconButton({ icon, label, variant = "glass", size = "md", iconSize, href, className, ...rest }: IconButtonProps) {
  const glass = variant === "glass" || variant === "clear";
  const cls = cx("lq-iconbtn lq-fx lq-press", glass && "lq-glass", className);
  const data = {
    "data-size": size === "md" ? undefined : size,
    "data-variant": variant === "fill" ? "fill" : undefined,
    "data-level": variant === "clear" ? "clear" : undefined,
    "data-fx": "",
  };
  const ic = <Icon name={icon} size={iconSize ?? (size === "lg" ? "lg" : size === "sm" ? "sm" : "md")} />;
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls} {...data}>
        {ic}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} className={cls} {...data} {...rest}>
      {ic}
    </button>
  );
}
