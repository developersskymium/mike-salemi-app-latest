"use client";

import Link from "next/link";
import { useState } from "react";
import { Toggle } from "@/components/ui";
import { saveMatrix, saveQuietHours, saveReminderTime } from "@/lib/settings/actions";
import { NOTIFY_TOPICS, type Channel, type NotifyMatrix, type SettingsHub } from "@/lib/settings/model";
import { Group, hm, Row, useSave } from "./parts";

/** Notifications: topic × Push/Email matrix (offers can be off), reminder time, quiet hours. */
export function NotificationsGroup({ d }: { d: SettingsHub }) {
  const [m, setM] = useState<NotifyMatrix>(d.settings.matrix);
  const [time, setTime] = useState(hm(d.reminders.time) || "07:00");
  const [quiet, setQuiet] = useState(Boolean(d.reminders.quietStart && d.reminders.quietEnd));
  const [qs, setQs] = useState(hm(d.reminders.quietStart) || "21:30");
  const [qe, setQe] = useState(hm(d.reminders.quietEnd) || "07:00");
  const { save } = useSave();

  const flip = (topic: keyof NotifyMatrix, ch: Channel, v: boolean) => {
    const before = m;
    const next = { ...m, [topic]: { ...m[topic], [ch]: v } };
    save(() => setM(next), () => setM(before), () => saveMatrix(next), "");
  };
  const allOff = NOTIFY_TOPICS.every((t) => !m[t.id].push && !m[t.id].email);

  return (
    <Group id="notifications" title="Notifications" action={<Link href="/you/notifications" className="fm-link lq-t13">Delivery history</Link>}>
      <div className="st-matrix" role="table" aria-label="What we send, and where">
        <div className="st-matrix-head" role="row">
          <span role="columnheader" className="st-sr">Topic</span>
          <span role="columnheader">Push</span>
          <span role="columnheader">Email</span>
        </div>
        {NOTIFY_TOPICS.map((t) => (
          <div key={t.id} className="st-matrix-row" role="row">
            <span role="rowheader" className="st-row-main">
              <span className="st-row-label" id={`nt-${t.id}`}>{t.label}</span>
              <span className="st-row-detail">{t.detail}</span>
            </span>
            {(["push", "email"] as const).map((ch) => (
              <span role="cell" key={ch}>
                <Toggle aria-label={`${t.label} by ${ch}`} checked={m[t.id][ch]} onChange={(v) => flip(t.id, ch, v)} />
              </span>
            ))}
          </div>
        ))}
      </div>
      {allOff && <p className="st-note" role="status">Everything is off. You&apos;ll still get receipts and account emails.</p>}
      <Row label="Reminder time" detail={`Your time (${d.reminders.timezone.replace(/_/g, " ")}).`} id="st-rt">
        <input
          type="time"
          className="st-time"
          aria-labelledby="st-rt"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={() => time !== hm(d.reminders.time) && save(() => {}, () => setTime(hm(d.reminders.time)), () => saveReminderTime(time), "Reminder time saved")}
        />
      </Row>
      <Row label="Quiet hours" detail={quiet ? `Nothing between ${qs} and ${qe}. Saved up for the morning.` : "No pings while you sleep or focus."} id="st-qh">
        <Toggle aria-labelledby="st-qh" checked={quiet} onChange={(v) => save(() => setQuiet(v), () => setQuiet(!v), () => saveQuietHours(v ? qs : null, v ? qe : null), v ? "Quiet hours on" : "Quiet hours off")} />
      </Row>
      {quiet && (
        <div className="st-row st-quiet">
          <label className="st-time-field">
            <span>From</span>
            <input type="time" className="st-time" value={qs} onChange={(e) => setQs(e.target.value)} onBlur={() => save(() => {}, () => {}, () => saveQuietHours(qs, qe), "Quiet hours saved")} />
          </label>
          <label className="st-time-field">
            <span>Until</span>
            <input type="time" className="st-time" value={qe} onChange={(e) => setQe(e.target.value)} onBlur={() => save(() => {}, () => {}, () => saveQuietHours(qs, qe), "Quiet hours saved")} />
          </label>
        </div>
      )}
    </Group>
  );
}
