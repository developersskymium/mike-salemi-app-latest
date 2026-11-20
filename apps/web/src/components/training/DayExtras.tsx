"use client";

import { useEffect, useState } from "react";
import type { WorkoutTable } from "@ms/core";
import { Icon } from "@/components/ui";
import { CircuitTable } from "./CircuitTable";
import { circuitsOf } from "./workout";

/* ================================================================== other intensities (idea 5) */

/** The tables the other readiness bands would prescribe, tucked away under "Other intensities". */
export function OtherIntensities({ tables, currentId }: { tables: { name: string; table: WorkoutTable }[]; currentId: string | null | undefined }) {
  const others = tables.filter((t) => t.table.id !== currentId);
  if (!others.length) return null;
  return (
    <details className="ko">
      <summary>
        <Icon name="chevronDown" size="xs" />
        Other intensities <span className="lq-num">· {others.length}</span>
      </summary>
      <div className="ko-list">
        {others.map((o) => (
          <section key={o.table.id} className="ko-item">
            <p className="kc-eyebrow">{o.name}</p>
            <CircuitTable table={o.table} csv={false} />
          </section>
        ))}
      </div>
    </details>
  );
}

/* ================================================================== finish screen stats (idea 9) */

const FEELS = [
  { v: "easy", label: "Easy" },
  { v: "right", label: "Just right" },
  { v: "hard", label: "Tough" },
] as const;

/** Time, sets and "how did that feel?" for the finish screen. The feeling is kept per day on this device. */
export function FinishStats({ lessonId, startedAt, table }: { lessonId: string; startedAt: number; table: WorkoutTable | null }) {
  const [minutes] = useState(() => Math.max(1, Math.round((Date.now() - startedAt) / 60000)));
  const sets = table ? circuitsOf(table).reduce((n, c) => n + c.sets * c.rows.length, 0) : 0;
  const key = `kbl-feel:${lessonId}`;
  const [feel, setFeel] = useState<string | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeel(localStorage.getItem(key));
    } catch {}
  }, [key]);
  return (
    <div className="kf">
      <div className="kf-stats">
        <span>
          <b className="lq-num">{minutes}</b> min
        </span>
        {sets > 0 && (
          <span>
            <b className="lq-num">{sets}</b> sets
          </span>
        )}
      </div>
      <div className="kf-feel" role="group" aria-label="How did today feel?">
        <span>How did today feel?</span>
        {FEELS.map((f) => (
          <button
            key={f.v}
            type="button"
            aria-pressed={feel === f.v}
            onClick={() => {
              setFeel(f.v);
              try {
                localStorage.setItem(key, f.v);
              } catch {}
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== offline day (idea 10) */

export interface OfflineDay {
  savedAt: number;
  href: string;
  title: string;
  eyebrow: string;
  table: WorkoutTable | null;
  notes: { title: string; body: string }[];
}
const OFFLINE_KEY = "kbl-offline-day";

/** Keeps the last opened day (table + Mike's notes) on this device so it reads without a connection. */
export function useSaveOfflineDay(day: OfflineDay | null) {
  const json = day ? JSON.stringify(day) : null;
  useEffect(() => {
    if (!json) return;
    try {
      localStorage.setItem(OFFLINE_KEY, json);
    } catch {}
  }, [json]);
}

export function readOfflineDay(): OfflineDay | null {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "null") as OfflineDay | null;
  } catch {
    return null;
  }
}
