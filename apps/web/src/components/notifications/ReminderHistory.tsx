"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { EmptyScene } from "@/components/graphics";
import { Button, EmptyState, Glass, Icon, Sheet, Ticker, useToast, type IconName } from "@/components/ui";
import { clearReminderHistory } from "@/lib/actions/notifications";
import type { HistoryData, ReminderEvent } from "@/lib/loaders/notifications";
import "./ntf.css";

const STATUS: Record<ReminderEvent["status"], { label: string; icon: IconName }> = {
  queued: { label: "Queued", icon: "clock" },
  sent: { label: "Sent", icon: "bell" },
  opened: { label: "Opened", icon: "check" },
  failed: { label: "Failed", icon: "close" },
  snoozed: { label: "Snoozed", icon: "moon" },
  skipped: { label: "Skipped", icon: "next" },
};
const CHANNEL: Record<ReminderEvent["channel"], string> = { email: "Email", push: "Device notification", in_app: "In-app" };
const KIND: Record<string, string> = {
  training_reminder: "Training reminder", streak_nudge: "Streak nudge", weekly_summary: "Weekly summary", win_back: "Welcome back",
  reward: "Reward", certificate: "Certificate", tool_result: "Tool result", schedule_created: "Schedule", welcome: "Welcome", test: "Test",
};

function dayLabel(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });
}
function timeLabel(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}

/** L19 Reminder history: stats (Delivered, Opened, Snoozed/skipped, Failed) → event list → Clear history. */
export function ReminderHistory({ d }: { d: HistoryData }) {
  const [events, setEvents] = useState(d.events);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const stats = useMemo(() => {
    const n = (...s: string[]) => events.filter((e) => s.includes(e.status)).length;
    return [
      { label: "Delivered", value: n("sent", "opened"), icon: "bell" as const },
      { label: "Opened", value: n("opened"), icon: "check" as const },
      { label: "Snoozed or skipped", value: n("snoozed", "skipped"), icon: "moon" as const },
      { label: "Failed", value: n("failed"), icon: "close" as const },
    ];
  }, [events]);
  const groups = useMemo(() => {
    const m = new Map<string, ReminderEvent[]>();
    for (const e of events) {
      const k = dayLabel(e.created_at, d.timezone);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [events, d.timezone]);

  const clear = () =>
    start(async () => {
      const r = await clearReminderHistory();
      setConfirm(false);
      if (!r.ok) return void toast(r.error === "offline" ? "Preview mode can't clear history. It works on the live app." : r.error, { icon: "close" });
      setEvents([]);
      toast("Reminder history cleared", { tone: "success", icon: "check" });
      router.refresh();
    });

  return (
    <div className="ntf-page">
      <div className="ntf-stats" role="list" aria-label="Reminder totals">
        {stats.map((s) => (
          <Glass key={s.label} radius="card" className="ntf-stat" role="listitem">
            <span className="ntf-ic" aria-hidden><Icon name={s.icon} size="sm" /></span>
            <b><Ticker value={s.value} /></b>
            <span>{s.label}</span>
          </Glass>
        ))}
      </div>

      {events.length === 0 ? (
        <Glass radius="card">
          <EmptyState
            title="No reminders yet"
            body="Once a training reminder goes out, it shows up here with its delivery result — so you can see exactly what happened."
            illustration={<EmptyScene scene="plan-empty" size={180} />}
            action={<Button icon="bell" href="/plan#reminders">Set up reminders</Button>}
          />
        </Glass>
      ) : (
        <Glass radius="card" aria-label="Reminder events">
          {groups.map(([day, list]) => (
            <section key={day} aria-label={day}>
              <h2 className="ntf-day">{day}</h2>
              <ul className="ntf-events">
                {list.map((e, i) => {
                  const s = STATUS[e.status] ?? STATUS.sent;
                  return (
                    <li key={e.id} className="ntf-event" data-status={e.status} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                      <span className="ntf-ic" aria-hidden><Icon name={s.icon} size="sm" /></span>
                      <div className="ntf-ev-main">
                        <span className="ntf-ev-title" title={KIND[e.kind] ?? e.kind}>{e.title}</span>
                        {(e.body || e.error) && <span className="ntf-ev-body">{e.status === "failed" && e.error ? e.error : e.body}</span>}
                        <span className="ntf-ev-meta">
                          <span><Icon name="clock" size="xs" /> {timeLabel(e.created_at, d.timezone)}</span>
                          <span>· {CHANNEL[e.channel] ?? e.channel}</span>
                          {e.detail && <span>· {e.detail}</span>}
                        </span>
                      </div>
                      <span className="ntf-pill" data-status={e.status}>{s.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </Glass>
      )}

      {events.length > 0 && (
        <div>
          <Button variant="plain" icon="close" onClick={() => setConfirm(true)} disabled={pending}>Clear history</Button>
        </div>
      )}
      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear reminder history?"
        description="Your reminders and settings stay as they are. Only this list is emptied."
        detents={["medium"]}
        footer={
          <div style={{ display: "grid", gap: 8 }}>
            <Button block onClick={clear} disabled={pending}>{pending ? "Clearing…" : "Clear history"}</Button>
            <Button block variant="plain" onClick={() => setConfirm(false)}>Keep it</Button>
          </div>
        }
      />
    </div>
  );
}
