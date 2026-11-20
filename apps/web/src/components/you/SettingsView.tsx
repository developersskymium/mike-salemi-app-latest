"use client";

import { useState, useTransition } from "react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { Button, Glass, Toggle, useToast } from "@/components/ui";
import { DayPicker } from "@/components/plan/StartPlan";
import { saveNotificationPrefs, setAutoplay, updateDisplayName, type ActionResult } from "@/lib/actions/today-plan-you";
import type { NotificationPrefs, SettingsData } from "@/lib/loaders/today-plan-you";
import "@/components/today/tpy.css";

function ToggleRow({ id, title, detail, checked, onChange }: { id: string; title: string; detail?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tpy-row">
      <span className="tpy-row-main" style={{ whiteSpace: "normal" }}>
        <span className="lq-t15" id={id}>{title}</span>
        {detail && <span className="lq-t13 lq-c2" style={{ whiteSpace: "normal" }}>{detail}</span>}
      </span>
      <Toggle checked={checked} onChange={onChange} aria-labelledby={id} />
    </div>
  );
}

/** Profile, appearance, playback and notification preferences. Every change saves on its own. */
export function SettingsView({ d }: { d: SettingsData }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(d.notifications);
  const [autoplay, setAuto] = useState(d.profile.preferences.autoplay ?? true);
  const [name, setName] = useState(d.profile.displayName);
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = <T,>(apply: () => void, revert: () => void, action: () => Promise<ActionResult<T>>, ok = "Saved") => {
    apply();
    start(async () => {
      const r = await action();
      if (r.ok) return toast(ok, { tone: "success", icon: "check" });
      revert();
      toast(r.error === "offline" ? "Preview mode can't save settings. They work on the live app." : r.error, { icon: "close" });
    });
  };
  const setPref = <K extends keyof NotificationPrefs>(k: K, v: NotificationPrefs[K]) => {
    const prev = prefs;
    save(() => setPrefs({ ...prefs, [k]: v }), () => setPrefs(prev), () => saveNotificationPrefs({ [k]: v }));
  };

  return (
    <div className="tpy-you-grid">
      <section aria-labelledby="profile-t">
        <h2 id="profile-t" className="tpy-section-title">Profile</h2>
        <Glass radius="card" className="tpy-pad">
          <form
            className="tpy-field"
            onSubmit={(e) => {
              e.preventDefault();
              save(() => {}, () => setName(d.profile.displayName), () => updateDisplayName(name), "Name updated");
            }}
          >
            <label htmlFor="tpy-name" className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Your name</label>
            <input id="tpy-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
            <div className="lq-t13 lq-c2">Shown on your certificates. Email: {d.profile.email}</div>
            {name.trim() !== d.profile.displayName && (
              <Button size="md" type="submit" disabled={pending || !name.trim()} style={{ justifySelf: "start", marginTop: 6 }}>Save name</Button>
            )}
          </form>
        </Glass>
      </section>

      <section aria-labelledby="look-t">
        <h2 id="look-t" className="tpy-section-title">Appearance and playback</h2>
        <Glass radius="card" className="tpy-list">
          <div className="tpy-row" style={{ display: "grid", gap: 8 }}>
            <span className="lq-t15">Theme</span>
            <ThemeSwitch />
          </div>
          <ToggleRow
            id="set-autoplay"
            title="Autoplay next clip"
            detail="In a day player, the next clip starts after a 5 second countdown."
            checked={autoplay}
            onChange={(v) => save(() => setAuto(v), () => setAuto(!v), () => setAutoplay(v))}
          />
        </Glass>
      </section>

      <section aria-labelledby="reminders" id="reminders-section">
        <h2 id="reminders" className="tpy-section-title">Reminders</h2>
        <Glass radius="card" className="tpy-list">
          <ToggleRow id="set-push" title="Push notifications" detail="On this device, when the app is installed." checked={prefs.push_enabled} onChange={(v) => setPref("push_enabled", v)} />
          <ToggleRow id="set-email" title="Email reminders" checked={prefs.email_enabled} onChange={(v) => setPref("email_enabled", v)} />
          <div className="tpy-row" style={{ display: "grid", gap: 10 }}>
            <span className="lq-t15">Remind me on</span>
            <DayPicker label="Reminder days" value={prefs.reminder_days} onChange={(days) => setPref("reminder_days", days)} />
          </div>
          <label className="tpy-row" htmlFor="set-time">
            <span className="tpy-row-main"><span className="lq-t15">At</span></span>
            <input
              id="set-time"
              type="time"
              className="tpy-search"
              style={{ width: "auto" }}
              value={prefs.reminder_time.slice(0, 5)}
              onChange={(e) => e.target.value && setPref("reminder_time", e.target.value)}
            />
          </label>
          <label className="tpy-row" htmlFor="set-quiet">
            <span className="tpy-row-main"><span className="lq-t15">Quiet hours</span><span className="lq-t13 lq-c2">No nudges between these times</span></span>
            <input id="set-quiet" type="time" className="tpy-search" style={{ width: "auto" }} aria-label="Quiet from" value={prefs.quiet_start?.slice(0, 5) ?? ""} onChange={(e) => setPref("quiet_start", e.target.value || null)} />
            <span className="lq-c3" aria-hidden>–</span>
            <input type="time" className="tpy-search" style={{ width: "auto" }} aria-label="Quiet until" value={prefs.quiet_end?.slice(0, 5) ?? ""} onChange={(e) => setPref("quiet_end", e.target.value || null)} />
          </label>
        </Glass>
      </section>

      <section aria-labelledby="notify-t">
        <h2 id="notify-t" className="tpy-section-title">What we send</h2>
        <Glass radius="card" className="tpy-list">
          <ToggleRow id="set-streak" title="Streak nudge" detail="A gentle note when your streak is about to break." checked={prefs.streak_nudge} onChange={(v) => setPref("streak_nudge", v)} />
          <ToggleRow id="set-recap" title="Weekly recap" detail="Sunday summary of your week and what's next." checked={prefs.weekly_recap} onChange={(v) => setPref("weekly_recap", v)} />
          <ToggleRow id="set-offers" title="News and offers" detail="New programs, retreats and member offers." checked={prefs.offers_email} onChange={(v) => setPref("offers_email", v)} />
        </Glass>
      </section>
    </div>
  );
}
