import { StreakChip } from "../signature/StreakChip";

/** The streak chip, streamed in after the shell (wrap in <Suspense>). One promise feeds both sizes. */
export async function ShellStreak({ days, compact }: { days: Promise<number>; compact?: boolean }) {
  return <StreakChip days={await days} compact={compact} href="/you" />;
}

/** Reserved space while the streak loads (no layout shift). */
export function StreakSlot({ compact }: { compact?: boolean }) {
  return <span className="sm-streak sm-streak-skel" data-compact={compact ? "" : undefined} aria-hidden />;
}
