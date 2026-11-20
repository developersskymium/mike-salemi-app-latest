"use client";

import { useState, useTransition } from "react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { Button, Glass, Toggle, useToast } from "@/components/ui";
import { ChannelsCard, QuietHoursCard, TrainingRemindersCard, WhatWeSendCard } from "@/components/notifications/ReminderCards";
import { usePrefs } from "@/components/notifications/usePrefs";
import { setAutoplay, updateDisplayName, type ActionResult } from "@/lib/actions/today-plan-you";
import type { SettingsData } from "@/lib/loaders/today-plan-you";
import type { NotificationsData } from "@/lib/loaders/notifications";
import "@/components/today/tpy.css";

/** Account › Notifications (original layout): Training reminders | What we send, then Channels | Quiet hours. */
function NotificationsPanel({ n }: { n: NotificationsData }) {
  const p = usePrefs(n.prefs, n.timezone);
  return (
    <div className="ntf-grid">
      <TrainingRemindersCard p={p} today={n.today} now={n.now} />
      <WhatWeSendCard p={p} />
      <ChannelsCard p={p} today={n.today} now={n.now} email={n.email} emailReady={n.emailReady} pushKey={n.pushKey} isAdmin={n.isAdmin} />
      <QuietHoursCard p={p} />
    </div>
  );
}

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

/** Profile, appearance, playback and notifications. Every change saves on its own. */
export function SettingsView({ d, n }: { d: SettingsData; n: NotificationsData }) {
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

      <section aria-labelledby="notifications-t" id="notifications" data-wide style={{ scrollMarginTop: 80 }}>
        <h2 id="notifications-t" className="tpy-section-title">Notifications</h2>
        <NotificationsPanel n={n} />
      </section>
    </div>
  );
}
