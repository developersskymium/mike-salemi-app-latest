"use client";

import { useNow } from "@/lib/hooks/clock";
import { Chip } from "@/components/ui";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live countdown to the start; each number rolls in when it changes. Becomes "Happening now" during the run. */
export function Countdown({ startsAt, endsAt }: { startsAt: string; endsAt: string | null }) {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 86400000;
  const now = useNow(1000);
  const t = now ?? start - 1;
  if (now !== null && t >= start && t < end) {
    return (
      <div className="exp-live" role="status">
        <Chip variant="tint" dot>Happening now</Chip>
      </div>
    );
  }
  if (now !== null && t >= end) return <p className="lq-t15" role="status">This retreat has ended. Integration continues below.</p>;
  const p = parts(start - t);
  const cells: [number, string][] = [[p.d, p.d === 1 ? "day" : "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  return (
    <div className="exp-count" role="timer" aria-label={`${p.d} days, ${p.h} hours and ${p.m} minutes to go`}>
      {cells.map(([n, l]) => (
        <div key={l} className="exp-count-cell">
          <span className="exp-count-n" aria-hidden>
            <span key={now === null ? "ssr" : n}>{now === null ? "–" : String(n).padStart(l === "days" || l === "day" ? 1 : 2, "0")}</span>
          </span>
          <span className="exp-count-l" aria-hidden>{l}</span>
        </div>
      ))}
    </div>
  );
}
