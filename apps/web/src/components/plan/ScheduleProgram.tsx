"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addDays, type IsoDate } from "@ms/core";
import { Button, Icon, Segmented, Sheet, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { scheduleProgramAction } from "@/lib/actions/plan";
import type { Schedulable } from "@/lib/loaders/plan";
import { nextMonday, WEEKDAYS } from "@/components/today/dates";
import { DayPicker } from "./StartPlan";
import { programColor } from "./programColor";
import "./schedprog.css";

const PREVIEW = "Preview mode can't save plans. It works on the live app.";
const wd = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
const nice = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** The date of the last session when `n` sessions go on `days` from `start` (one a day, like `schedule_immersion`). */
export function lastSessionDate(start: IsoDate, days: number[], n: number): IsoDate | null {
  if (!days.length || n <= 0) return null;
  let cursor = start;
  let last: IsoDate | null = null;
  for (let i = 0; i < n; i++) {
    let guard = 0;
    while (!days.includes(wd(cursor)) && guard++ < 7) cursor = addDays(cursor, 1);
    last = cursor;
    cursor = addDays(cursor, 1);
  }
  return last;
}

/**
 * "Schedule Kettlebell Lifestyle" (client, Nov 21: "let me schedule the whole program"; "KBL levels on schedule").
 * One sheet: Level I or Level II → day by day (Immersion, scheduled now on your training days) or any order
 * (Self-Guided, planned in the wizard) → days and start → the whole level goes on the calendar.
 */
export function ScheduleProgram({ program, today, preferredDays, variant = "card", label }: { program: Schedulable; today: IsoDate; preferredDays: number[]; variant?: "card" | "button" | "link"; label?: string }) {
  const firstKey = program.currentKey ?? program.recommendedKey ?? program.levels[0]?.key ?? null;
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(firstKey);
  const level = program.levels.find((l) => l.key === key) ?? program.levels[0]!;
  const [how, setHow] = useState<"day" | "any">(level.mode === "self_guided" ? "any" : "day");
  const [days, setDays] = useState<number[]>(preferredDays.length ? preferredDays : [1, 3, 5]);
  const [when, setWhen] = useState<"today" | "monday">("today");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const monday = nextMonday(today);
  const startOn = when === "today" ? today : monday;
  const n = level.left || level.total;
  const last = lastSessionDate(startOn, days, n);
  const weeks = days.length ? Math.ceil(n / days.length) : 0;
  const levelWord = program.levels.length > 1 ? level.shortName : program.name;
  const dayNames = WEEKDAYS.filter((w) => days.includes(w.value)).map((w) => w.short);
  const title = label ?? `Schedule ${program.name}`;

  const submit = () =>
    start(async () => {
      const r = await scheduleProgramAction(program.programId, level.pathId, days, startOn, program.slug);
      if (!r.ok) return void toast(r.error === "offline" ? PREVIEW : r.error, { icon: "close" });
      haptic(12);
      toast(`${program.name} · ${levelWord} is on your schedule: ${n} sessions.`, { tone: "success", icon: "check" });
      setOpen(false);
      router.push(`/plan?view=program&program=${program.slug}`);
      router.refresh();
    });

  const trigger =
    variant === "button" ? (
      <Button icon="calendar" size="md" onClick={() => setOpen(true)}>{title}</Button>
    ) : variant === "link" ? (
      <button type="button" className="spg-link" onClick={() => setOpen(true)}>{title}</button>
    ) : (
      <button type="button" className="spg-card lq-press" style={{ ["--pc" as string]: programColor(program.slug) }} onClick={() => setOpen(true)}>
        <span className="spg-card-main">
          <span className="spg-card-t">{title}</span>
          <span className="spg-card-s">
            The whole program on your training days{program.levels.length > 1 ? `, ${program.levels.map((l) => l.shortName).join(" or ")}` : ""}.
          </span>
        </span>
        <Icon name="chevron" size="sm" />
      </button>
    );

  return (
    <>
      {trigger}
      <Sheet open={open} onClose={() => setOpen(false)} title={title} description="The whole program, laid out on your training days." detents={["large"]}>
        <div className="spg">
          {program.levels.length > 1 && (
            <fieldset className="spg-q">
              <legend className="spg-l">Which level?</legend>
              <div className="spg-opts" role="radiogroup" aria-label="Level">
                {program.levels.map((l) => {
                  const on = l.key === level.key;
                  return (
                    <button key={l.pathId ?? l.key} type="button" role="radio" aria-checked={on} className="spg-opt lq-press" onClick={() => { setKey(l.key); setHow(l.mode === "self_guided" ? "any" : "day"); }}>
                      <span className="spg-opt-c">
                        <span className="spg-opt-t">
                          {l.shortName}
                          {l.key === program.currentKey && <span className="spg-tag">You&apos;re on this</span>}
                          {l.key === program.recommendedKey && l.key !== program.currentKey && <span className="spg-tag">Recommended</span>}
                        </span>
                        <span className="spg-opt-s lq-num">
                          {l.name.split("·")[1]?.trim() ?? l.name} · {l.total} days{l.left < l.total ? `, ${l.left} left` : ""}
                        </span>
                      </span>
                      <span className="spg-radio" aria-hidden>{on && <Icon name="check" size="xs" />}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <fieldset className="spg-q">
            <legend className="spg-l">How do you want to train it?</legend>
            <div className="spg-opts" role="radiogroup" aria-label="How you train">
              {([
                ["day", "Day by day", "Mike's order. Each day opens after the one before."],
                ["any", "Any order (Self-Guided)", "Every day open. Plan your weeks in a few taps."],
              ] as const).map(([v, t, s]) => (
                <button key={v} type="button" role="radio" aria-checked={how === v} className="spg-opt lq-press" onClick={() => setHow(v)}>
                  <span className="spg-opt-c">
                    <span className="spg-opt-t">{t}</span>
                    <span className="spg-opt-s">{s}</span>
                  </span>
                  <span className="spg-radio" aria-hidden>{how === v && <Icon name="check" size="xs" />}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {how === "day" ? (
            <>
              <div className="spg-q">
                <p className="spg-l">Train on</p>
                <DayPicker value={days} onChange={setDays} />
                <p className="spg-h lq-num">{days.length ? `${days.length} ${days.length === 1 ? "day" : "days"} a week · ${dayNames.join(", ")}` : "Pick at least one day"}</p>
              </div>
              {monday !== today && (
                <div className="spg-q">
                  <p className="spg-l">Start</p>
                  <Segmented label="Start date" variant="fill" value={when} onChange={setWhen} options={[{ value: "today", label: "Today" }, { value: "monday", label: "Next Monday" }]} />
                </div>
              )}
              {last && (
                <p className="spg-sum lq-num">
                  <b>{n}</b> sessions of {levelWord}, about <b>{weeks}</b> {weeks === 1 ? "week" : "weeks"}. First {nice(lastSessionDate(startOn, days, 1)!)}, last <b>{nice(last)}</b>.
                </p>
              )}
              <Button block icon={pending ? undefined : "calendar"} onClick={submit} disabled={!days.length || pending} aria-busy={pending || undefined}>
                {pending ? "Scheduling…" : `Schedule ${levelWord}`}
              </Button>
            </>
          ) : (
            <>
              <p className="spg-sum">
                Self-Guided keeps every day of {levelWord} open. The planner puts all <b className="lq-num">{n}</b> sessions on your days, or keeps them as an order with no dates.
              </p>
              <Button block icon="calendar" iconAfter="chevron" href={`/programs/${program.slug}/session/wizard${level.key ? `?path=${encodeURIComponent(level.key)}` : ""}`}>
                Plan {levelWord} Self-Guided
              </Button>
            </>
          )}
          <p className="spg-foot">
            {how === "day" ? "Already scheduled this level? This replaces that schedule. Finished days stay finished. " : null}<Link href={`/programs/${program.slug}${level.key ? `?path=${encodeURIComponent(level.key)}` : ""}`} className="lq-ink">About {levelWord}</Link>
          </p>
        </div>
      </Sheet>
    </>
  );
}
