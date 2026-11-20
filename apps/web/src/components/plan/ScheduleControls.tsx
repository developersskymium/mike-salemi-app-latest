"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Glass, Icon, Toggle, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { applyGuidedPattern, chooseMissedRule } from "@/lib/actions/plan";
import { fixMyPlan } from "@/lib/actions/today-plan-you";
import type { ReminderPrefs } from "@/lib/email/prefs";
import { NtfCard, ReminderTiming, TimeChips } from "@/components/notifications/ReminderCards";
import { usePrefs } from "@/components/notifications/usePrefs";
import "./pln.css";

const PREVIEW = "Preview mode can't change your plan. It works on the live app.";

export const PATTERNS = [
  { label: "3 days / week", short: "3", days: [1, 3, 5] },
  { label: "4 days / week", short: "4", days: [1, 2, 4, 5] },
  { label: "5 days / week", short: "5", days: [1, 2, 3, 4, 5] },
  { label: "Every day", short: "7", days: [0, 1, 2, 3, 4, 5, 6] },
];

const same = (a: number[] | undefined, b: number[]) => !!a && a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

/** "Guided schedule": one tap re-flows the plan's remaining sessions onto a weekly pattern from today. */
export function GuidedPatterns({ planId, current }: { planId: string; current?: number[] }) {
  const [pending, start] = useTransition();
  const [active, setActive] = useState(current);
  const toast = useToast();
  const router = useRouter();
  const apply = (days: number[], label: string) =>
    start(async () => {
      const r = await applyGuidedPattern(planId, days);
      if (!r.ok) return void toast(r.error === "offline" ? PREVIEW : r.error, { icon: "close" });
      haptic(12);
      setActive(days);
      toast(`${label} — ${r.data.moved} sessions placed`, { tone: "success", icon: "sparkle" });
      router.refresh();
    });
  return (
    <div className="pln-guided">
      <span className="pln-label">Guided schedule</span>
      <div className="pln-guided-row" role="group" aria-label="Guided schedule">
        {PATTERNS.map((p) => (
          <button key={p.label} type="button" className="pln-pattern" aria-pressed={same(active, p.days)} disabled={pending} onClick={() => apply(p.days, p.label)}>
            <Icon name="sparkle" size="xs" /> {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const RULES = [
  { value: "shift", label: "Shift everything forward", hint: "A missed day pushes the rest of the plan back, so nothing is lost." },
  { value: "skip", label: "Skip the missed day", hint: "Move on. The missed day is marked skipped." },
  { value: "weekend", label: "Catch up on the weekend", hint: "Missed days move onto the next free Saturday or Sunday." },
] as const;
export type Rule = (typeof RULES)[number]["value"];

/** "If you miss a day": the rule "Fix my plan" applies for this plan. */
export function MissedDayCard({ planId, planName, rule }: { planId: string; planName: string; rule: Rule }) {
  const [value, setValue] = useState<Rule>(rule);
  const [pending, start] = useTransition();
  const toast = useToast();
  const choose = (r: Rule) => {
    const prev = value;
    setValue(r);
    haptic(6);
    start(async () => {
      const res = await chooseMissedRule(planId, r);
      if (res.ok) return void toast("Saved", { tone: "success", icon: "check" });
      setValue(prev);
      toast(res.error === "offline" ? PREVIEW : res.error, { icon: "close" });
    });
  };
  return (
    <NtfCard icon="steps" title="If you miss a day" sub={`We apply this when you tap Fix my plan on ${planName}.`} id="missed-rule">
      <div className="pln-rules" role="radiogroup" aria-label="If you miss a day">
        {RULES.map((r) => (
          <button key={r.value} type="button" role="radio" aria-checked={value === r.value} className="pln-rule" disabled={pending} onClick={() => choose(r.value)}>
            <span className="pln-radio" aria-hidden />
            <span>
              <span className="pln-rule-t">{r.label}</span>
              <span className="pln-rule-h">{r.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </NtfCard>
  );
}

/** "Behind the plan": N missed sessions, the rule's effect, and the fix. */
export function BehindBanner({ planId, count, rule, missed }: { planId: string; count: number; rule: Rule; missed: { title: string; date: string }[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const hint = RULES.find((r) => r.value === rule)?.hint ?? RULES[0].hint;
  const fix = () =>
    start(async () => {
      const r = await fixMyPlan(planId);
      if (!r.ok) return void toast(r.error === "offline" ? PREVIEW : r.error, { icon: "close" });
      haptic(12);
      toast(r.data.rule === "skip" ? "Missed sessions skipped" : r.data.rule === "weekend" ? "Moved onto the weekend" : "Plan shifted forward", { tone: "success", icon: "check" });
      router.refresh();
    });
  return (
    <Glass as="section" radius="card" className="pln-behind" aria-labelledby="pln-behind-t" id="missed">
      <div className="pln-behind-main">
        <span className="pln-eyebrow pln-eyebrow-muted">Behind the plan</span>
        <h2 id="pln-behind-t" className="pln-h3">{count} missed {count === 1 ? "session" : "sessions"}</h2>
        <p className="pln-sub">{hint}</p>
        <ul className="pln-misslist">
          {missed.slice(0, 6).map((m, i) => <li key={i}>{m.title} · {new Date(`${m.date}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}</li>)}
          {missed.length > 6 && <li data-more>+{missed.length - 6} more</li>}
        </ul>
      </div>
      <Button variant="fill" icon="sparkle" onClick={fix} disabled={pending}>{pending ? "Fixing…" : "Fix my plan"}</Button>
    </Glass>
  );
}

/** "Reminders": on/off for scheduled days, quick times, then frequency, per-day times and time zone. */
export function RemindersCard({ prefs, timezone, today, now }: { prefs: ReminderPrefs; timezone: string; today: string; now: string }) {
  const p = usePrefs(prefs, timezone);
  return (
    <NtfCard icon="bell" title="Reminders" sub={p.prefs.reminders_enabled ? `A nudge at your time on training days.` : "Reminders are off right now."} id="reminders">
      <div className="pln-toggle-row">
        <span id="pln-rem">Remind me on scheduled days</span>
        <Toggle checked={p.prefs.reminders_enabled} aria-labelledby="pln-rem" onChange={(v) => p.save({ reminders_enabled: v }, v ? "Reminders on" : "Reminders off")} />
      </div>
      <div className="ntf-block" data-off={!p.prefs.reminders_enabled || undefined} style={!p.prefs.reminders_enabled ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
        <div className="ntf-blockhead"><span><Icon name="clock" size="xs" /> Reminder time</span></div>
        <TimeChips label="Reminder time" value={p.prefs.reminder_time} options={["06:00", "07:00", "12:00", "17:30"]} onChange={(t) => p.save({ reminder_time: t })} />
      </div>
      <ReminderTiming p={p} today={today} now={now} />
    </NtfCard>
  );
}
