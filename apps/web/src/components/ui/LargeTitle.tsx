"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

type Props = {
  title: string;
  /** Small line above the title (date, program). */
  eyebrow?: ReactNode;
  /** Left of the inline bar (back button). */
  leading?: ReactNode;
  /** Right side (avatar, actions). Shown in the inline bar on phone and beside the title on desktop. */
  trailing?: ReactNode;
  /** White text over a hero photo. */
  onPhoto?: boolean;
  className?: string;
};

/**
 * iOS large title. On phone it collapses into a centred inline title over the scroll-edge
 * blur once it scrolls under the bar; on desktop it stays a plain page header.
 */
export function LargeTitle({ title, eyebrow, leading, trailing, onPhoto, className }: Props) {
  const big = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = big.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e!.isIntersecting), { rootMargin: "-56px 0px 0px 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <header className={cx("lq-ltitle", className)} data-collapsed={collapsed ? "" : undefined} data-on-photo={onPhoto ? "" : undefined}>
      <div className="lq-edge lq-ltitle-edge" aria-hidden />
      <div className="lq-ltitle-bar">
        <span>{leading}</span>
        <span className="lq-ltitle-t lq-t17" aria-hidden>
          {title}
        </span>
        <span className="lq-ltitle-phone">{trailing}</span>
      </div>
      <div className="lq-ltitle-row">
        <div className="lq-ltitle-big">
          {eyebrow && <div className="lq-t13" style={{ fontWeight: 600 }}>{eyebrow}</div>}
          <h1 ref={big} className="lq-t34">
            {title}
          </h1>
        </div>
        {trailing && <div className="lq-ltitle-desk">{trailing}</div>}
      </div>
    </header>
  );
}
