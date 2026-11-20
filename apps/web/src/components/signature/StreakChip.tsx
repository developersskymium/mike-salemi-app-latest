import Link from "next/link";
import { Icon } from "../ui/Icon";

/** The ember streak chip (top bar, phone header): a flame badge and the day count. */
export function StreakChip({ days, href, compact, label }: { days: number; href?: string; /** Phone: number only. */ compact?: boolean; label?: string }) {
  const inner = (
    <>
      <span className="sm-streak-fl" aria-hidden>
        <Icon name="flame" size="xs" />
      </span>
      <span className="lq-num">{compact ? days : `${days} ${days === 1 ? "day" : "days"}`}</span>
    </>
  );
  const aria = label ?? `${days}-day streak`;
  return href ? (
    <Link href={href} className="sm-streak lq-press" aria-label={aria} data-compact={compact ? "" : undefined}>
      {inner}
    </Link>
  ) : (
    <span className="sm-streak" role="img" aria-label={aria} data-compact={compact ? "" : undefined}>
      {inner}
    </span>
  );
}
