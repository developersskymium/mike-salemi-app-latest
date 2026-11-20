"use client";

import { useState } from "react";
import { Button, Icon, Sheet } from "@/components/ui";
import { Field } from "@/components/ui/form";
import { requestDeletion } from "@/lib/settings/actions";
import type { SettingsHub } from "@/lib/settings/model";
import { Group, Row } from "./parts";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const dm = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * Privacy: download my data (instant JSON) and a calm, three-step delete request. Sending the request stops
 * any card-billed plan renewing and cancels upcoming coaching; Mike's team deletes the account itself.
 */
export function PrivacyGroup({ requests, billing, deletion }: { requests: SettingsHub["requests"]; billing?: SettingsHub["billing"]; deletion?: SettingsHub["deletion"] }) {
  const pendingDelete = requests.some((r) => r.kind === "delete" && r.status === "open");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [requested, setRequested] = useState(pendingDelete);
  const [outcome, setOutcome] = useState<{ plansStopped: number; sessionsCancelled: number; problems: string[] } | null>(null);

  const plan = billing?.plan && billing.plan.rank > 0 ? billing.plan : null;
  const sessions = deletion?.coachingSessions ?? [];
  const retreats = deletion?.retreats ?? [];

  const confirm = async () => {
    setBusy(true);
    const r = await requestDeletion(reason);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setOutcome(r.data);
    setRequested(true);
    setStep(2);
  };

  return (
    <Group id="privacy" title="Privacy">
      <Row label="Download my data" detail="Your profile, settings, plan and receipts as a file.">
        <a className="st-pdf lq-press" href="/you/settings/export" download><Icon name="download" size="xs" /> Download</a>
      </Row>
      <Row label="Delete account" detail={requested ? "Requested. Mike's team will confirm by email." : "Removes your account and training history."}>
        <Button size="sm" variant="plain" disabled={requested} onClick={() => { setOpen(true); setStep(0); setTyped(""); setErr(null); }}>{requested ? "Requested" : "Delete…"}</Button>
      </Row>
      <Sheet open={open} onClose={() => setOpen(false)} title="Delete your account" detents={["large"]}
        footer={
          step === 0 ? (
            <div className="st-foot2">
              <Button block size="lg" variant="secondary" onClick={() => setStep(1)}>Continue</Button>
              <Button block size="md" variant="plain" onClick={() => setOpen(false)}>Keep my account</Button>
            </div>
          ) : step === 1 ? (
            <Button block size="lg" variant="secondary" disabled={busy || typed.trim().toUpperCase() !== "DELETE"} onClick={confirm}>{busy ? "One moment…" : "Request deletion"}</Button>
          ) : (
            <Button block size="lg" onClick={() => setOpen(false)}>Done</Button>
          )
        }>
        <div className="st-sheet">
          {step === 0 && (
            <>
              <p className="st-lede">Take your time. Here&apos;s what happens if you go ahead:</p>
              <p className="st-del-h">Straight away</p>
              <ul className="st-list">
                {plan && billing?.provider === "stripe" && !billing.ending && (
                  <li>Your {plan.name} plan stops renewing. You won&apos;t be charged again{billing.renewsOn ? <>, and it stays open until <span className="lq-num">{day(billing.renewsOn)}</span></> : null}.</li>
                )}
                {plan && billing?.provider === "stripe" && billing.ending && (
                  <li>Your {plan.name} plan already ends{billing.renewsOn ? <> on <span className="lq-num">{day(billing.renewsOn)}</span></> : null}. Nothing more is charged.</li>
                )}
                {plan && billing?.provider !== "stripe" && <li>Your {plan.name} plan from Mike&apos;s team ends with your account. There&apos;s no card to charge.</li>}
                {!plan && <li>You have no paid plan, so nothing is charged.</li>}
                {sessions.length > 0 ? (
                  <li>
                    {sessions.length === 1 ? "Your coaching session" : `Your ${sessions.length} upcoming coaching sessions`} on{" "}
                    <span className="lq-num">{sessions.length > 3 ? `${sessions.slice(0, 3).map((x) => dm(x.startsAt)).join(", ")} and more` : listOf(sessions.map((x) => dm(x.startsAt)))}</span>{" "}
                    {sessions.length === 1 ? "is" : "are"} cancelled.
                  </li>
                ) : (
                  <li>You have no coaching sessions booked.</li>
                )}
                {retreats.map((name) => (
                  <li key={name}>Your place on {name} stays booked for now. Mike&apos;s team will talk it through with you first.</li>
                ))}
              </ul>
              <p className="st-del-h">When Mike&apos;s team confirms, within 7 days</p>
              <ul className="st-list">
                <li>Your profile, training history, notes and badges are removed.</li>
                <li>Receipts are kept for tax law.</li>
                <li>This can&apos;t be undone once it&apos;s done.</li>
              </ul>
              <p className="st-note">Want a copy first? <a className="fm-link" href="/you/settings/export">Download your data</a>.</p>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Anything we could have done better?" optional>
                {(ids) => <textarea {...ids} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
              <Field label={<>Type <b>DELETE</b> to confirm</>} error={err}>
                {(ids) => <input {...ids} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />}
              </Field>
            </>
          )}
          {step === 2 && (
            <div className="st-done" role="status">
              <span className="st-done-icon"><Icon name="check" size="md" /></span>
              <h3 className="lq-d-sm">Request received</h3>
              <p className="st-lede">Mike&apos;s team will confirm by email within 7 days. You can keep using the app until then, and change your mind by replying to that email.</p>
              {outcome && (outcome.plansStopped > 0 || outcome.sessionsCancelled > 0) && (
                <ul className="st-list">
                  {outcome.plansStopped > 0 && <li>Your plan won&apos;t renew.</li>}
                  {outcome.sessionsCancelled > 0 && <li>{outcome.sessionsCancelled === 1 ? "1 coaching session is" : `${outcome.sessionsCancelled} coaching sessions are`} cancelled.</li>}
                </ul>
              )}
              {outcome && outcome.problems.length > 0 && (
                <p className="st-note">We couldn&apos;t finish everything here. Mike&apos;s team will stop any renewal and cancel any sessions for you.</p>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </Group>
  );
}
