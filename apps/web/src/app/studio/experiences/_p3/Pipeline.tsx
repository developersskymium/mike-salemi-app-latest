"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRun } from "@/components/studio/forms";
import { coachingApplication, retreatPipeline } from "./actions";
import "./pipeline.css";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }) + " PT" : null);

/** The three steps for one application, with the next admin action highlighted. */
export function RetreatPipeline({ a }: { a: { id: string; status: string; call_at?: string | null; call_url?: string | null; call_done_at?: string | null; decided_at?: string | null; payment_link_sent_at?: string | null } }) {
  const { run, pending } = useRun();
  const [link, setLink] = useState(a.call_url ?? "");
  const done = ["accepted", "booked", "declined"].includes(a.status);
  const steps = [
    { k: "Applied", v: "Received", on: true },
    { k: "Call", v: a.call_done_at ? `Done ${when(a.call_done_at)}` : a.call_at ? `Booked ${when(a.call_at)}` : "Not booked yet", on: Boolean(a.call_done_at) },
    { k: "Decision", v: a.status === "declined" ? "Declined" : a.status === "accepted" || a.status === "booked" ? `Approved${a.payment_link_sent_at ? " · payment sent" : ""}` : "Waiting", on: done },
    { k: "Paid", v: a.status === "booked" ? "Booked" : "—", on: a.status === "booked" },
  ];
  return (
    <div className="st-pipe">
      <ol className="st-pipe-steps">
        {steps.map((s) => <li key={s.k} data-on={s.on ? "" : undefined}><b>{s.k}</b><span>{s.v}</span></li>)}
      </ol>
      <div className="st-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {!a.call_done_at && a.status !== "booked" && <Button size="sm" variant={a.call_at ? "filled" : "fill"} disabled={pending} onClick={() => run(() => retreatPipeline(a.id, "call_done"), "Call marked done")}>Mark call done</Button>}
        {!done && <Button size="sm" variant={a.call_done_at ? "filled" : "fill"} disabled={pending} onClick={() => run(() => retreatPipeline(a.id, "approve"), "Approved · member notified")}>Approve</Button>}
        {!done && <Button size="sm" variant="fill" disabled={pending} onClick={() => run(() => retreatPipeline(a.id, "decline"), "Declined")}>Decline</Button>}
        {a.status === "accepted" && <Button size="sm" variant={a.payment_link_sent_at ? "fill" : "filled"} disabled={pending} onClick={() => run(() => retreatPipeline(a.id, "send_payment"), "Payment step sent")}>{a.payment_link_sent_at ? "Send payment reminder" : "Send payment link"}</Button>}
        {a.status === "accepted" && <Button size="sm" variant="plain" disabled={pending} onClick={() => run(() => retreatPipeline(a.id, "mark_booked"), "Marked booked")}>Mark paid by hand</Button>}
      </div>
      {!a.call_done_at && a.status !== "booked" && (
        <div className="st-row" style={{ gap: 6, marginTop: 8 }}>
          <input className="st-in" style={{ maxWidth: 360 }} placeholder="Call link (Zoom / Meet)" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Call link" />
          <Button size="sm" variant="fill" disabled={pending || link === (a.call_url ?? "")} onClick={() => run(() => retreatPipeline(a.id, "call_link", link), "Call link saved")}>Save link</Button>
        </div>
      )}
    </div>
  );
}

export function CoachingApplicationActions({ id, status }: { id: string; status: string }) {
  const { run, pending } = useRun();
  return (
    <div className="st-row" style={{ gap: 6 }}>
      {status === "submitted" && <Button size="sm" variant="fill" disabled={pending} onClick={() => run(() => coachingApplication(id, "call_booked"), "Marked call booked")}>Call booked</Button>}
      {status !== "accepted" && <Button size="sm" variant="filled" disabled={pending} onClick={() => run(() => coachingApplication(id, "accepted"), "Accepted")}>Accept</Button>}
      {status !== "declined" && <Button size="sm" variant="fill" disabled={pending} onClick={() => run(() => coachingApplication(id, "declined"), "Declined")}>Decline</Button>}
    </div>
  );
}
