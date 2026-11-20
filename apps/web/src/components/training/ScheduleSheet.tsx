"use client";

import { useState, useTransition } from "react";
import { Button, Sheet, useToast } from "@/components/ui";
import { scheduleImmersionAction } from "@/lib/actions/training";
import { WEEKDAYS } from "./model";

/** Immersion "Scheduled" pace: pick training weekdays and a start date, then `schedule_immersion` places the remaining days. */
export function ScheduleSheet({ open, onClose, enrollmentId, initialDays, slug }: { open: boolean; onClose: () => void; enrollmentId: string; initialDays: number[]; slug: string }) {
  const [days, setDays] = useState<number[]>(initialDays.length ? initialDays : [1, 3, 5]);
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  const toast = useToast();
  const toggle = (d: number) => setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()));
  const perWeek = days.length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Schedule your days"
      description="We'll place every remaining day on your training days. Missed one? Plan shifts it for you."
      detents={["medium", "large"]}
      footer={
        <Button
          block
          icon="calendar"
          disabled={!perWeek}
          aria-busy={pending || undefined}
          onClick={() =>
            start(async () => {
              const r = await scheduleImmersionAction(enrollmentId, days, startsOn, slug);
              if (r.ok) {
                toast("Schedule saved to Plan", { tone: "success" });
                onClose();
              } else toast(r.message);
            })
          }
        >
          {perWeek ? `Schedule ${perWeek} day${perWeek === 1 ? "" : "s"} a week` : "Pick your days"}
        </Button>
      }
    >
      <fieldset className="trn-fieldset">
        <legend className="lq-t13 lq-c2">Training days</legend>
        <div className="trn-weekdays">
          {WEEKDAYS.map((w, i) => (
            <button key={w} type="button" className="trn-wd lq-press" aria-pressed={days.includes(i)} onClick={() => toggle(i)}>
              {w}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="trn-fieldset">
        <span className="lq-t13 lq-c2">Starting</span>
        <input type="date" className="trn-input lq-t17" value={startsOn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartsOn(e.target.value)} />
      </label>
      <p className="lq-t13 lq-c2" style={{ marginTop: 12 }}>
        Recovery days count as training days. Three or four a week keeps the nine weeks on track.
      </p>
    </Sheet>
  );
}
