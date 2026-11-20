"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { haptic } from "./motion";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  /** Accessible name when there's no visible label pointing at it. */
  label?: string;
};

/** iOS 26 switch. The knob squashes and stretches while pressed and springs across. */
export function Toggle({ checked, defaultChecked, onChange, label, className, ...rest }: Props) {
  const [inner, setInner] = useState(Boolean(defaultChecked));
  const on = checked ?? inner;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx("lq-toggle", className)}
      onClick={() => {
        haptic(6);
        setInner(!on);
        onChange?.(!on);
      }}
      {...rest}
    >
      <i aria-hidden />
    </button>
  );
}
