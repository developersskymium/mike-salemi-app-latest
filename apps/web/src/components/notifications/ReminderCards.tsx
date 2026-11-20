"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Button, Glass, Icon, Segmented, Toggle, useToast, type IconName } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { sendTestEmail } from "@/lib/actions/notifications";
import { nextReminder, timeFor } from "@/lib/email/reminders";
import type { ReminderPrefs } from "@/lib/email/prefs";
import { PushRow } from "./PushRow";
import { DAY_NAMES, describeNext, detectTimezone, time12, timezoneList, WEEK_ORDER } from "./format";
import type { usePrefs } from "./usePrefs";
import "./ntf.css";

type P = ReturnType<typeof usePrefs>;

export function NtfCard({ icon, title, sub, children, id, className }: { icon?: IconName; title: string; sub?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <Glass as="section" radius="card" className={`ntf-card${className ? ` ${className}` : ""}`} aria-labelledby={id ? `${id}-t` : undefined} id={id}>
      <header className="ntf-head">
        {icon && <span className="ntf-ic" aria-hidden><Icon name={icon} size="sm" /></span>}
        <div>
          <h2 id={id ? `${id}-t` : undefined} className="ntf-title">{title}</h2>
          {sub && <p className="ntf-sub">{sub}</p>}
        </div>
      </header>
      {children}
    </Glass>
  );
}

export function NtfRow({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="ntf-row">
      <div className="ntf-row-main">
        <span className="ntf-row-label" id={id}>{label}</span>
        {hint && <span className="ntf-row-hint">{hint}</span>}
      </div>
      <div className="ntf-row-ctl">{children}</div>
    </div>
  );
}

const ToggleRow = ({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <NtfRow id={id} label={label} hint={hint}>
    <Toggle checked={checked} onChange={onChange} aria-labelledby={id} disabled={disabled} />
  </NtfRow>
);

/**
 * Preset times as chips, plus "Custom". The time field only appears for a custom time, so the chosen
 * value is never shown twice in two formats (D25).
 */
export function TimeChips({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  const preset = options.includes(value);
  const [customOpen, setCustomOpen] = useState(false);
  const custom = customOpen || !preset;
  return (
    <div className="ntf-times" role="group" aria-label={label}>
      {options.map((t) => (
        <button key={t} type="button" className="ntf-chip lq-num" aria-pressed={!custom && value === t} onClick={() => { haptic(6); setCustomOpen(false); onChange(t); }}>
          {time12(t)}
        </button>
      ))}
      <button type="button" className="ntf-chip" aria-pressed={custom} onClick={() => { haptic(6); setCustomOpen(true); }}>
        Custom
      </button>
      {custom && (
        <input type="time" className="ntf-time lq-num" value={value} aria-label={`${label}, custom`} onChange={(e) => e.target.value && onChange(e.target.value)} />
      )}
    </div>
  );
}

function DaysRow({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="ntf-days" role="group" aria-label="Reminder days">
      {WEEK_ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <button key={d} type="button" aria-pressed={on} onClick={() => { haptic(6); onChange(on ? value.filter((x) => x !== d) : [...value, d].sort()); }}>
            {DAY_NAMES[d]!.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

const nextOf = (prefs: ReminderPrefs, today: string, now: string) => describeNext(nextReminder(prefs, today, now), today);

/** Account › Notifications: "Training reminders" (toggle, time, days). */
export function TrainingRemindersCard({ p, today, now }: { p: P; today: string; now: string }) {
  const { prefs, save } = p;
  return (
    <NtfCard icon="bell" title="Training reminders" sub={prefs.reminders_enabled ? `Next reminder: ${nextOf(prefs, today, now)}` : "Reminders are off right now."} id="ntf-training">
      <div className="ntf-rows">
        <ToggleRow id="ntf-remind" label="Remind me to train" hint="On the days you've scheduled" checked={prefs.reminders_enabled} onChange={(v) => save({ reminders_enabled: v }, v ? "Reminders on" : "Reminders off")} />
        <div className="ntf-stack" data-off={!prefs.reminders_enabled || undefined}>
          <span className="ntf-label">Reminder time</span>
          <TimeChips label="Reminder time" value={prefs.reminder_time} options={["06:00", "07:00", "17:30"]} onChange={(t) => save({ reminder_time: t, reminder_times: {} })} />
        </div>
        <div className="ntf-stack" data-off={!prefs.reminders_enabled || undefined}>
          <span className="ntf-label">Reminder days</span>
          <DaysRow value={prefs.frequency === "every_day" ? [0, 1, 2, 3, 4, 5, 6] : prefs.frequency === "weekdays" ? [1, 2, 3, 4, 5] : prefs.reminder_days} onChange={(d) => save({ reminder_days: d, frequency: "custom_days" })} />
        </div>
        <p className="ntf-foot">Per-day times and your time zone live on <Link href="/plan#reminders" className="ntf-link">Plan → Reminders</Link>.</p>
      </div>
    </NtfCard>
  );
}

/** Plan › Reminders: frequency, a time per day and the time zone (legacy ReminderTiming). */
export function ReminderTiming({ p, today, now }: { p: P; today: string; now: string }) {
  const { prefs, tz, save } = p;
  const zones = useMemo(() => timezoneList(tz), [tz]);
  const days = prefs.frequency === "every_day" ? [0, 1, 2, 3, 4, 5, 6] : prefs.frequency === "weekdays" ? [1, 2, 3, 4, 5] : prefs.reminder_days;
  const off = !prefs.reminders_enabled || undefined;
  const setDay = (d: number) => {
    const on = days.includes(d);
    save({ frequency: "custom_days", reminder_days: on ? days.filter((x) => x !== d) : [...days, d].sort() });
  };
  const setTime = (d: number, v: string) => {
    const times = { ...prefs.reminder_times };
    if (!v || v === prefs.reminder_time) delete times[String(d)];
    else times[String(d)] = v;
    save({ reminder_times: times }, `${DAY_NAMES[d]} at ${time12(v || prefs.reminder_time)}`);
  };
  return (
    <div className="ntf-timing" data-off={off}>
      <div className="ntf-block">
        <div className="ntf-blockhead"><span><Icon name="repeat" size="xs" /> Frequency</span></div>
        <Segmented
          label="Reminder frequency"
          variant="fill"
          size="sm"
          value={prefs.frequency}
          onChange={(v) => save({ frequency: v })}
          options={[
            { value: "every_day", label: "Every day" },
            { value: "weekdays", label: "Weekdays" },
            { value: "custom_days", label: "Chosen days" },
          ]}
        />
      </div>
      <div className="ntf-block">
        <div className="ntf-blockhead">
          <span><Icon name="clock" size="xs" /> Time per day</span>
          <button type="button" className="ntf-textbtn" onClick={() => save({ reminder_times: {} }, "Same time every day")}>Use {time12(prefs.reminder_time)} every day</button>
        </div>
        <ul className="ntf-perday">
          {WEEK_ORDER.map((d) => {
            const on = days.includes(d);
            return (
              <li key={d} data-on={on || undefined}>
                <button type="button" className="ntf-check" aria-pressed={on} aria-label={`${on ? "Turn off" : "Turn on"} ${DAY_NAMES[d]} reminder`} onClick={() => setDay(d)}>
                  {on && <Icon name="check" size="xs" />}
                </button>
                <span className="ntf-dayname">{DAY_NAMES[d]}</span>
                <input type="time" className="ntf-time lq-num" disabled={!on} value={timeFor(prefs, d)} aria-label={`${DAY_NAMES[d]} reminder time`} onChange={(e) => setTime(d, e.target.value)} />
              </li>
            );
          })}
        </ul>
      </div>
      <div className="ntf-block">
        <div className="ntf-blockhead">
          <span><Icon name="compass" size="xs" /> Time zone</span>
          <button type="button" className="ntf-textbtn" onClick={() => save({ timezone: detectTimezone() }, "Time zone updated")}>Use this device</button>
        </div>
        <select className="ntf-select" aria-label="Reminder time zone" value={tz} onChange={(e) => save({ timezone: e.target.value }, "Time zone updated")}>
          {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </select>
        <p className="ntf-foot lq-num">Next reminder: <b>{nextOf(prefs, today, now)}</b></p>
      </div>
    </div>
  );
}

/** "What we send". */
export function WhatWeSendCard({ p }: { p: P }) {
  const { prefs, save } = p;
  return (
    <NtfCard icon="sparkle" title="What we send" id="ntf-what">
      <div className="ntf-rows">
        <ToggleRow id="ntf-streak" label="Streak nudges" hint="A gentle push when a streak is at risk" checked={prefs.streak_nudge} onChange={(v) => save({ streak_nudge: v })} />
        <ToggleRow id="ntf-weekly" label="Weekly summary" hint="Your week in training, every Sunday evening" checked={prefs.weekly_recap} onChange={(v) => save({ weekly_recap: v })} />
        <ToggleRow id="ntf-new" label="New content" hint="When lessons or programs are added" checked={prefs.new_content} onChange={(v) => save({ new_content: v })} />
        <ToggleRow id="ntf-ann" label="Announcements" hint="Retreats, offers and other programs" checked={prefs.announcements} onChange={(v) => save({ announcements: v, offers_email: v })} />
      </div>
    </NtfCard>
  );
}

/** "Channels": email, in-app, this browser + test email. */
export function ChannelsCard({ p, today, now, email, emailReady, pushKey, isAdmin }: { p: P; today: string; now: string; email: string; emailReady: boolean; pushKey: string | null; isAdmin: boolean }) {
  const { prefs, save } = p;
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const test = () =>
    start(async () => {
      const r = await sendTestEmail();
      if (!r.ok) return void toast(r.error, { icon: "close" });
      if (r.data.status === "sent") {
        setSent(true);
        haptic(12);
        toast(`Test email sent to ${r.data.to}`, { tone: "success", icon: "check" });
      } else if (r.data.status === "not_configured") toast("Email sending isn't switched on yet — the test was logged.", { icon: "bell", duration: 5000 });
      else toast(r.data.error ?? "Sending failed", { icon: "close" });
    });
  return (
    <NtfCard icon="share" title="Channels" id="ntf-channels">
      <div className="ntf-rows">
        <ToggleRow id="ntf-email" label="Email" hint={email ? `Reminders, summaries and milestones to ${email}` : "Reminders, summaries and milestones"} checked={prefs.email_enabled} onChange={(v) => save({ email_enabled: v })} />
        <ToggleRow id="ntf-inapp" label="In-app" hint="A reminder card while the app is open" checked={prefs.in_app_enabled} onChange={(v) => save({ in_app_enabled: v })} />
        <PushRow pushKey={pushKey} enabled={prefs.push_enabled} onDisable={() => save({ push_enabled: false }, "Notifications off on this device")} />
      </div>
      {!emailReady && (
        <p className="ntf-note" role="note"><Icon name="clock" size="xs" /> Email delivery is being set up. Reminders are logged in your history until it&apos;s switched on.</p>
      )}
      <p className="ntf-foot lq-num">Next reminder: <b>{nextOf(prefs, today, now)}</b></p>
      <div className="ntf-actions">
        <Button variant="fill" size="md" icon={sent ? "check" : "share"} state={sent ? "success" : "idle"} disabled={pending || !prefs.email_enabled} onClick={test} block>
          {pending ? "Sending…" : "Send me a test email"}
        </Button>
        <Button variant="plain" size="md" icon="clock" href="/you/notifications" block>Reminder history</Button>
        {isAdmin && <Button variant="plain" size="md" icon="library" href="/studio/emails" block>Preview every email we send</Button>}
      </div>
    </NtfCard>
  );
}

/** "Quiet hours". */
export function QuietHoursCard({ p }: { p: P }) {
  const { prefs, save } = p;
  const on = Boolean(prefs.quiet_start && prefs.quiet_end);
  return (
    <NtfCard icon="moon" title="Quiet hours" sub="No reminders, nudges or pushes in this window." id="ntf-quiet">
      <div className="ntf-rows">
        <ToggleRow id="ntf-q" label="Pause notifications overnight" checked={on} onChange={(v) => save(v ? { quiet_start: "21:00", quiet_end: "07:00" } : { quiet_start: null, quiet_end: null }, v ? "Quiet hours on" : "Quiet hours off")} />
        {on && (
          <>
            <NtfRow label="From"><input type="time" className="ntf-time lq-num" aria-label="Quiet from" value={prefs.quiet_start ?? "21:00"} onChange={(e) => e.target.value && save({ quiet_start: e.target.value })} /></NtfRow>
            <NtfRow label="Until"><input type="time" className="ntf-time lq-num" aria-label="Quiet until" value={prefs.quiet_end ?? "07:00"} onChange={(e) => e.target.value && save({ quiet_end: e.target.value })} /></NtfRow>
          </>
        )}
      </div>
    </NtfCard>
  );
}
