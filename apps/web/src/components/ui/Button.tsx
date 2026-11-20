import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "filled" | "glass" | "white" | "tint" | "fill" | "plain";
export type ButtonSize = "sm" | "md" | "lg";

type Common = {
  /** filled = the one primary action (accent). glass/fill = secondary. white = over photos. tint/plain = tertiary. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconAfter?: IconName;
  /** Full width. */
  block?: boolean;
  /** success: draws a check and pulses (see CompleteButton). */
  state?: "idle" | "success";
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = Common &
  (({ href: string; prefetch?: boolean; target?: string } & Omit<ButtonHTMLAttributes<HTMLAnchorElement>, "type">) | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>));

export function Button(props: ButtonProps) {
  const { variant = "filled", size = "lg", icon, iconAfter, block, state = "idle", children, className, ...rest } = props;
  const iconSize = size === "sm" ? "xs" : "sm";
  const cls = cx("lq-btn lq-fx lq-press", className);
  const data = {
    "data-variant": variant,
    "data-size": size === "lg" ? undefined : size,
    "data-block": block ? "" : undefined,
    "data-state": state === "idle" ? undefined : state,
    "data-fx": "",
  };
  const inner = (
    <>
      {state === "success" ? (
        <>
          <span className="lq-pulse" aria-hidden />
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
