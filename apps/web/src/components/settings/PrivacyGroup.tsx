"use client";

import { useState } from "react";
import { Button, Icon, Sheet } from "@/components/ui";
import { Field } from "@/components/ui/form";
import { requestDeletion } from "@/lib/settings/actions";
import type { SettingsHub } from "@/lib/settings/model";
import { Group, Row } from "./parts";

/** Privacy: download my data (instant JSON) and a calm, three-step delete request (no deletion in the app). */
export function PrivacyGroup({ requests }: { requests: SettingsHub["requests"] }) {
  const pendingDelete = requests.some((r) => r.kind === "delete" && r.status === "open");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [requested, setRequested] = useState(pendingDelete);

  const confirm = async () => {
    setBusy(true);
    const r = await requestDeletion(reason);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
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
              <ul className="st-list">
                <li>Your profile, training history, notes and badges are removed.</li>
                <li>Any plan stops renewing. Receipts are kept for tax law.</li>
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
            </div>
          )}
        </div>
      </Sheet>
    </Group>
  );
}
