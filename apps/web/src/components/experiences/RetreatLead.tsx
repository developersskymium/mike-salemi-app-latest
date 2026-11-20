"use client";

import { useState, useTransition } from "react";
import { Button, Icon } from "@/components/ui";
import { retreatLeadAction } from "@/lib/actions/retreats";

/**
 * Small email forms for the retreats index: "Notify me" (new dates) and "Questions? Book a 15-min call".
 * One field (two for the call), one button, an inline confirmation. Nothing blocks the page.
 */
export function RetreatLeadForm({
  kind,
  email: initial,
  runId,
  callUrl,
}: {
  kind: "notify" | "question_call";
  email?: string | null;
  runId?: string | null;
  /** A booking link for the 15-min call, when Mike has one: the button opens it instead of the form. */
  callUrl?: string | null;
}) {
  const [email, setEmail] = useState(initial ?? "");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const call = kind === "question_call";

  if (call && callUrl) {
    return <Button href={callUrl} target="_blank" rel="noopener" variant="glass" size="md" icon="video">Book a 15-min call</Button>;
  }
  if (done) {
    return (
      <p className="rtp-done" role="status">
        <Icon name="check" size="sm" />
        {call ? "Got it. Mike’s team will email you a time for a 15-minute call." : "You’re on the list. New dates reach you before they’re announced."}
      </p>
    );
  }
  return (
    <form
      className="rtp-form"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await retreatLeadAction({ kind, email, runId: runId ?? null, note: call ? note : null });
          if (r.ok) setDone(true);
          else setErr(r.message);
        });
      }}
    >
      {call && (
        <label className="rtp-field">
          <span className="lq-sr">Your question (optional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="What would you like to ask? (optional)" />
        </label>
      )}
      <div className="rtp-row">
        <label className="rtp-field">
          <span className="lq-sr">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
        <Button type="submit" variant={call ? "glass" : "filled"} size="md" disabled={pending}>{pending ? "Sending…" : call ? "Request a call" : "Notify me"}</Button>
      </div>
      {err && <p className="rtp-err" role="alert">{err}</p>}
    </form>
  );
}
