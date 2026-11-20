/**
 * Thin progress line with a plain time-left note ("About 1 minute left"). Announced politely.
 * `secondsPerStep` estimates the remaining time from the steps left.
 */
export function FormProgress({ step, total, secondsPerStep = 12, label }: { step: number; total: number; secondsPerStep?: number; label?: string }) {
  const done = Math.min(Math.max(step, 0), total);
  const pct = total ? (done / total) * 100 : 0;
  const left = Math.max(0, total - done) * secondsPerStep;
  return (
    <div className="fm-progress">
      <div className="fm-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label ?? `Step ${Math.min(done + 1, total)} of ${total}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="fm-progress-note lq-num" aria-live="polite">{timeLeft(left)}</span>
    </div>
  );
}

export function timeLeft(seconds: number) {
  if (seconds <= 0) return "Last step";
  if (seconds < 45) return "Less than a minute left";
  const m = Math.round(seconds / 60);
  return m <= 1 ? "About 1 minute left" : `About ${m} minutes left`;
}
