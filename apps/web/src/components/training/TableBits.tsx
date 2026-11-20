"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";
import { logExerciseWeightAction } from "@/lib/actions/gaps";
import { useDayMemory } from "./DayMemory";

/* ================================================================== kettlebell weight memory (idea 7) */

const KG = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
/** Account key for an exercise ("Two-Hand Swing (heavy)" → "two-hand-swing"). */
export const exerciseKey = (exercise: string) => exercise.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wKey = (exercise: string) => `kbl-weight:${exerciseKey(exercise)}`;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
function subscribe(f: () => void) {
  listeners.add(f);
  window.addEventListener("storage", f);
  return () => {
    listeners.delete(f);
    window.removeEventListener("storage", f);
  };
}
function readWeight(exercise: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(wKey(exercise)) ?? "null") as { kg?: number } | null;
    return typeof v?.kg === "number" ? v.kg : null;
  } catch {
    return null;
  }
}

/**
 * "Last time: 16 kg" with a one-tap log: the bell the member used for this exercise. Saved to the account
 * (history per exercise, and today's session progress.weights); this device keeps an instant copy.
 */
export function WeightChip({ exercise }: { exercise: string }) {
  const memory = useDayMemory();
  const server = memory?.weights[exerciseKey(exercise)] ?? null;
  const local = useSyncExternalStore(subscribe, () => readWeight(exercise), () => null);
  const kg = local ?? server;
  const [open, setOpen] = useState(false);
  // The account knows a bell this device doesn't (new phone, cleared storage): cache it here.
  useEffect(() => {
    if (server == null) return;
    try {
      const cur = JSON.parse(localStorage.getItem(wKey(exercise)) ?? "null") as { kg?: number; at?: number } | null;
      if (cur?.kg == null) {
        localStorage.setItem(wKey(exercise), JSON.stringify({ kg: server, at: Date.now() }));
        emit();
      }
    } catch {}
  }, [server, exercise]);
  function save(v: number) {
    try {
      localStorage.setItem(wKey(exercise), JSON.stringify({ kg: v, at: Date.now() }));
    } catch {}
    emit();
    setOpen(false);
    if (memory) void logExerciseWeightAction(exerciseKey(exercise), exercise, v, memory.lessonId);
  }
  return (
    <span className="kw">
      <button type="button" className="kw-chip" data-set={kg != null ? "" : undefined} aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={kg != null ? `Last time ${kg} kilograms. Change` : `Log the bell you use for ${exercise}`}>
        <Icon name="kettlebell" size="xs" />
        {kg != null ? <span className="lq-num">Last time: {kg} kg</span> : <span>Log kg</span>}
      </button>
      {open && (
        <span className="kw-pick" role="group" aria-label={`Bell for ${exercise}`}>
          {KG.map((v) => (
            <button key={v} type="button" className="lq-num" aria-pressed={kg === v} onClick={() => save(v)}>
              {v}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Rows that use a bell (not bodyweight). */
export const usesBell = (intensity: unknown) => !/body ?weight/i.test(String(intensity ?? ""));

/* ================================================================== tempo pulse (idea 8) */

/** Beat length per tempo word: slow 1.2s · moderate .9s · mod-fast .7s · fast .5s. */
export function tempoBeat(tempo: string) {
  const t = tempo.toLowerCase();
  if (/explosive|fast/.test(t) && !/mod/.test(t)) return 0.5;
  if (/mod.*fast|fast.*mod/.test(t)) return 0.7;
  if (/slow/.test(t)) return 1.2;
  return 0.9;
}

/** Tempo as a 4-beat pulse bar: the beats light in turn at the movement's speed. */
export function TempoPulse({ tempo }: { tempo: string }) {
  if (!tempo) return null;
  const beat = tempoBeat(tempo);
  return (
    <span className="kt" title={`${tempo}: about ${beat}s per beat`}>
      <span className="kt-bar" aria-hidden style={{ ["--kt-beat" as string]: `${beat}s` }}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>{tempo}</span>
    </span>
  );
}

