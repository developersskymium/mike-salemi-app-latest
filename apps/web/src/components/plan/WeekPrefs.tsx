"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { saveTrainingProfileAction } from "@/lib/actions/plan";
import { WEEKDAYS } from "@/components/today/dates";
import { DayPicker } from "./StartPlan";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Based on your preferences: Mon · Wed · Fri · 30 min — Edit" */
export function PrefsChip({ days, minutes, editHref }: { days: number[]; minutes: number | null; editHref: string }) {
  const list = ORDER.filter((d) => days.includes(d)).map((d) => SHORT[d]);
  return (
    <p className="wk-prefs">
      <span>Planned around your training days: <b>{list.join(", ")}</b>{minutes ? <>, <b className="lq-num">{minutes} min</b> sessions</> : null}.</span>{" "}
      <Link href={editHref} className="wk-prefs-edit">Edit</Link>
    </p>
  );
}

/** No training profile yet: the two questions, inline, saved to the profile. */
export function PrefsAsk() {
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [minutes, setMinutes] = useState(30);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const save = () =>
    start(async () => {
      const r = await saveTrainingProfileAction({ training_days: days, days_per_week: days.length, session_minutes: minutes });
      if (!r.ok) return void toast(r.error === "offline" ? "Preview mode can't save. It works on the live app." : r.error, { icon: "close" });
      toast("Saved. Your week now follows these days.", { tone: "success", icon: "check" });
      router.refresh();
    });
  return (
    <section className="wk-ask" aria-labelledby="wk-ask-t">
      <h2 id="wk-ask-t" className="wk-ask-t">Two quick questions so we plan around your life</h2>
      <div className="wk-ask-q">
        <p className="wk-ask-l">Which days can you train?</p>
        <DayPicker value={days} onChange={setDays} label="Training days" />
        <p className="wk-ask-h lq-num">{days.length} {days.length === 1 ? "day" : "days"} a week · {WEEKDAYS.filter((w) => days.includes(w.value)).map((w) => w.short).join(", ") || "pick at least one"}</p>
      </div>
      <div className="wk-ask-q">
        <p className="wk-ask-l">How long is a session?</p>
        <div className="wk-len" role="radiogroup" aria-label="Session length">
          {[15, 20, 30, 45, 60].map((m) => (
            <button key={m} type="button" role="radio" aria-checked={minutes === m} className="wk-lenb lq-press" onClick={() => setMinutes(m)}>
              <b className="lq-num">{m}</b> min
            </button>
          ))}
        </div>
      </div>
      <Button size="md" onClick={save} disabled={!days.length || pending}>{pending ? "Saving…" : "Save my training days"}</Button>
    </section>
  );
}
