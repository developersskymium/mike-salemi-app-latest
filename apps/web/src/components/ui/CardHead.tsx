import type { ReactNode } from "react";
import { cx } from "./cx";

type Props = {
  /** The eyebrow: "Your climb · Level I", "This week". */
  label: ReactNode;
  /** Right-hand meta: "23/61", "Nov 16 – 22", or a small link. */
  meta?: ReactNode;
  /** Tick colour: accent (glacier, default), warm (ember: progress), ok, neutral. */
  tone?: "accent" | "warm" | "ok" | "neutral";
  /** Hide the hairline rule between label and meta. */
  rule?: boolean;
  as?: "div" | "header" | "h2" | "h3";
  className?: string;
};

/**
 * The Summit v4 card head: a 6px tick, a small caps label, a hairline rule and a right-hand meta.
 * Every card leads with one, so modules read as one system.
 */
export function CardHead({ label, meta, tone = "accent", rule = true, as: Tag = "div", className }: Props) {
  return (
    <Tag className={cx("lq-ch", className)} data-tone={tone === "accent" ? undefined : tone}>
      <i className="lq-ch-tick" aria-hidden />
      <span className="lq-ch-label">{label}</span>
      {rule ? <span className="lq-ch-rule" aria-hidden /> : <span style={{ flex: 1 }} />}
      {meta !== undefined && <span className="lq-ch-meta">{meta}</span>}
    </Tag>
  );
}
