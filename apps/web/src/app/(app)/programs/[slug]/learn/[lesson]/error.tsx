"use client";

import { useEffect, useState } from "react";
import { TrainingError } from "@/components/training/States";
import { readOfflineDay, type OfflineDay } from "@/components/training/DayExtras";
import { CircuitTable } from "@/components/training/CircuitTable";
import { NotesBody } from "@/components/training/NotesBody";
import "@/components/training/day-styles";
import "@/components/training/day-calm.css";

/** A day that didn't load. Offline: the last opened day's table and Mike's notes, kept on this device. */
export default function DayError({ reset }: { error: Error; reset: () => void }) {
  const [day, setDay] = useState<OfflineDay | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setDay(readOfflineDay());
  }, []);
  if (!day) return <TrainingError title="This day didn't load" body="Your progress is safe. Check your connection, then try again." onRetry={reset} back="/programs" />;
  return (
    <div className="kd-day kc-day">
      <div className="kc-scroll">
        <header className="kc-top">
          <span />
          <div className="kc-top-t">
            <div className="kc-top-e">
              <span>Offline copy · {day.eyebrow}</span>
            </div>
            <h1 className="kc-ellipsis">{day.title}</h1>
          </div>
          <button type="button" className="kc-link" onClick={reset}>
            Try again
          </button>
        </header>
        <main className="kc-main">
          <p className="kc-quiet">You&apos;re offline. Here&apos;s the last day you opened, saved on this device. Videos and progress come back with your connection.</p>
          {day.table && (
            <section className="kc-card kc-train">
              <p className="kc-eyebrow">Today&apos;s workout</p>
              <CircuitTable table={day.table} csv={false} training />
            </section>
          )}
          {day.notes.map((n) => (
            <section key={n.title} className="kc-card kc-notes">
              <p className="kc-notes-h">
                <b>{n.title}</b>
              </p>
              <NotesBody body={n.body} title={n.title} />
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
