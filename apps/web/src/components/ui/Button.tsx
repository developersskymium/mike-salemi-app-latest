import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "filled" | "warm" | "ink" | "secondary" | "glass" | "ghost" | "white" | "onphoto" | "tint" | "fill" | "plain";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

type Common = {
  /**
   * filled = glacier primary, the one obvious action. warm = ember (resume, progress). ink = strong neutral.
   * secondary/glass = white with a hairline. ghost = accent text. white/onphoto = over photos.
   * tint = accent wash. fill = sunk neutral. plain = a link with a tap target.
   */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconAfter?: IconName;
  /** Full width. */
  block?: boolean;
  /** success: draws a check and flares (see CompleteButton). */
  state?: "idle" | "success";
  /** Retired (Trace streak). Accepted for compatibility, ignored. */
  streak?: boolean;
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = Common &
  (({ href: string; prefetch?: boolean; target?: string } & Omit<ButtonHTMLAttributes<HTMLAnchorElement>, "type">) | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>));

export function Button(props: ButtonProps) {
  const { variant = "filled", size = "lg", icon, iconAfter, block, state = "idle", streak: _streak, children, className, ...rest } = props;
  const iconSize = size === "sm" || size === "xs" ? "xs" : "sm";
  const cls = cx("lq-btn lq-press", className);
  const data = {
    "data-variant": variant,
    "data-size": size === "lg" ? undefined : size,
    "data-block": block ? "" : undefined,
    "data-state": state === "idle" ? undefined : state,
  };
  const inner = (
    <>
      {state === "success" ? (
        <>
          <span className="lq-pulse" aria-hidden>
            <i />
          </span>
          <svg viewBox="0 0 24 24" className="lq-icon lq-check" data-size={iconSize} data-draw="" aria-hidden>
            <path d="M5.5 12.5 10 17l8.5-9.5" />
          </svg>
        </>
      ) : icon ? (
        <Icon name={icon} size={iconSize} />
      ) : null}
      {children !== undefined && <span>{children}</span>}
      {iconAfter && <Icon name={iconAfter} size={iconSize} />}
    </>
  );
  if (rest.href !== undefined) {
    const { href, ...a } = rest as { href: string } & ButtonHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link href={href} className={cls} {...data} {...a}>
        {inner}
      </Link>
    );
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" className={cls} {...data} {...b}>
      {inner}
    </button>
  );
}
