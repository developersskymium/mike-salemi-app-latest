"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ChipChoice, Field, validate } from "@/components/ui/form";
import { sendSupport } from "@/lib/settings/actions";
import type { SettingsHub } from "@/lib/settings/model";
import { Group } from "./parts";

const TOPICS = ["Billing", "Access to a program", "Something isn't working", "Training question", "Other"];

const FAQ = [
  { q: "How do I change my training days?", a: "Settings › Training profile › Days a week. Your schedule and every intake follow it." },
  { q: "Can I pause instead of cancelling?", a: "Yes — Billing › Pause, for 1 to 3 months. Nothing is lost while paused." },
  { q: "Do I keep programs I bought if I cancel?", a: "Yes. Programs bought on their own are yours for good." },
  { q: "Why didn't I get a reminder?", a: "Check Notifications (topic on, quiet hours), then Delivery history for what went out." },
  { q: "How do I add the app to my home screen?", a: "Phone browser menu › “Add to Home Screen”. It then opens full-screen like an app." },
];

/** Help: prefilled support form (context attached) + a short FAQ. */
export function HelpGroup({ d }: { d: SettingsHub }) {
  const [topic, setTopic] = useState<string>(TOPICS[0]!);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const plan = d.billing.plan?.name ?? "Free";

  const submit = async () => {
    const e = validate.required(msg.trim(), "a short message") ?? validate.min(msg, 10, "your message");
    setErr(e);
    if (e) return;
    setBusy(true);
    const r = await sendSupport(topic, msg, { plan, email: d.account.email, page: "settings", device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "" });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setSent(true);
  };

  return (
    <Group id="help" title="Help">
      {sent ? (
        <div className="st-row" role="status"><span className="st-row-main"><span className="st-row-label">Thanks — we&apos;ve got it.</span><span className="st-row-detail">We reply to {d.account.email} within 2 working days.</span></span></div>
      ) : (
        <form className="st-help" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <span className="fm-label" id="st-topic">What&apos;s it about?</span>
          <ChipChoice<string> size="sm" labelledBy="st-topic" options={TOPICS.map((t) => ({ value: t, label: t }))} value={topic} onChange={(v) => setTopic(v as string)} />
          <Field label="Message" error={err} hint={<>We&apos;ll include your email ({d.account.email}) and plan ({plan}) so you don&apos;t have to.</>}>
            {(ids) => <textarea {...ids} value={msg} maxLength={4000} placeholder="What happened, and what did you expect?" onChange={(e) => { setMsg(e.target.value); setErr(null); }} />}
          </Field>
          <Button type="submit" size="md" variant="secondary" disabled={busy}>{busy ? "Sending…" : "Send to Mike's team"}</Button>
        </form>
      )}
      <div className="st-faq">
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </Group>
  );
}
