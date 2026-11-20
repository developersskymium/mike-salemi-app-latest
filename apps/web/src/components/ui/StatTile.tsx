import type { ReactNode } from "react";
import { cx } from "./cx";
import { Ticker } from "./Ticker";

type Props = {
  value: number;
  /** e.g. "/61 days" */
  unit?: string;
  label: ReactNode;
  /** Ring tone swatch (1 accent, 2 neutral, 3 ice) or a custom node (icon). */
  swatch?: 1 | 2 | 3 | ReactNode;
  size?: "md" | "lg";
  className?: string;
};

/** A stat: a display numeral that counts with Stretch, unit, caption. Used in arc legends and stat rows. */
export function StatTile({ value, unit, label, swatch, size = "md", className }: Props) {
  const sw =
    typeof swatch === "number" ? <i className="lq-sw" style={{ ["--sw" as string]: `var(--ring-${swatch})` }} aria-hidden /> : swatch ?? null;
  return (
    <div className={cx("lq-stat", className)} data-size={size === "lg" ? "lg" : undefined} style={sw ? { gridTemplateColumns: "12px 1fr", columnGap: 10, alignItems: "baseline" } : undefined}>
      {sw}
      <b className="lq-statv">
        <Ticker value={value} />
        {unit && <small>{unit}</small>}
      </b>
      <span className="lq-statl" style={sw ? { gridColumn: 2 } : undefined}>
        {label}
      </span>
    </div>
  );
}
