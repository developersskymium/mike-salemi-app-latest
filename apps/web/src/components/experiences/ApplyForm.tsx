"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Glass, Icon, haptic } from "@/components/ui";
import { Completion } from "@/components/graphics";
import { applyToRunAction, type ApplicationAnswers } from "@/lib/actions/commerce";

const INTENTIONS = ["Break through patterns I've carried for years", "Reconnect with my body and energy", "Find clarity through a life transition", "Build real brotherhood"];
const EXPERIENCE = ["This is new to me", "I've done some breathwork or men's work", "I have an established practice"];
const STEPS = ["Intention", "Readiness", "Commitment", "Review"] as const;

type A = { intention: string; calling: string; experience: string; health: string; diet: string; sweatLodgeOk: boolean; fullAttendance: boolean; agreements: boolean; phone: string; emergencyName: string; emergencyPhone: string };
const EMPTY: A = { intention: "", calling: "", experience: "", health: "", diet: "", sweatLodgeOk: false, fullAttendance: false, agreements: false, phone: "", emergencyName: "", emergencyPhone: "" };

function Option({ label, selected, onClick, multi }: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected} className="exp-option" onClick={() => { haptic(); onClick(); }}>
      <span className="exp-tick" aria-hidden style={multi ? { borderRadius: 7 } : undefined}>
        <svg viewBox="0 0 24 24"><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
      </span>
      <span className="com-grow">{label}</span>
    </button>
  );
}

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="com-field">
      <label htmlFor={id}>{label}{optional && <span className="lq-c3" style={{ fontWeight: 400 }}> (optional)</span>}</label>
      {children}
    </div>
  );
}

/** Four short steps; nothing is charged. The server validates everything again. */
export function ApplyForm({ runId, runName, dates, waitlist }: { runId: string; runName: string; dates: string; waitlist: boolean }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<A>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof A>(k: K, v: A[K]) => setA((p) => ({ ...p, [k]: v }));

  const ready = [
    a.intention !== "" && a.calling.trim().length >= 10,
    a.experience !== "" && a.sweatLodgeOk,
    a.fullAttendance && a.agreements && a.phone.trim().length >= 7 && a.emergencyName.trim().length >= 2 && a.emergencyPhone.trim().length >= 7,
    true,
  ][step];

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await applyToRunAction(runId, a as ApplicationAnswers);
      if (r.ok) setSent(r.data.status);
      else setError(r.message);
    });

  if (sent) {
    return (
      <Glass radius="card" className="com-result-card" style={{ margin: "0 auto" }}>
        <Completion variant="milestone" size={160} label="Application sent" />
        <h2 className="lq-t28">{sent === "waitlist" ? "You’re on the waitlist" : "Application sent"}</h2>
        <p className="lq-t15 lq-c2">Mike&rsquo;s team reads every application and will reach out to book a short alignment call. Nothing has been charged.</p>
        <Button block href={`/experiences/${runId}`}>Back to {runName}</Button>
      </Glass>
    );
  }

  return (
    <div className="exp-form">
      <div className="exp-steps" role="progressbar" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((s, i) => <i key={s} data-on={i < step ? "" : undefined} data-now={i === step ? "" : undefined} />)}
      </div>
      <Glass radius="card" className="com-panel com-stack" style={{ gap: 20 }}>
        {step === 0 && (
          <>
            <div>
              <div className="exp-kicker">Your intention</div>
              <h2 className="lq-t22">What are you coming to the mountain for?</h2>
            </div>
            <div className="exp-options" role="radiogroup" aria-label="Intention">
              {INTENTIONS.map((o) => <Option key={o} label={o} selected={a.intention === o} onClick={() => set("intention", o)} />)}
            </div>
            <Field id="calling" label="What’s calling you to this work right now?">
              <textarea id="calling" className="com-input" value={a.calling} onChange={(e) => set("calling", e.target.value)} placeholder="A few honest sentences is enough." />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <div>
              <div className="exp-kicker">Readiness</div>
              <h2 className="lq-t22">Where are you starting from?</h2>
              <p className="lq-t13 lq-c2" style={{ marginTop: 4 }}>The practices are scaled to meet you where you are. This helps Mike&rsquo;s team hold you well.</p>
            </div>
            <div className="exp-options" role="radiogroup" aria-label="Experience">
              {EXPERIENCE.map((o) => <Option key={o} label={o} selected={a.experience === o} onClick={() => set("experience", o)} />)}
            </div>
            <Field id="health" label="Health, injuries or medication we should know about" optional>
              <textarea id="health" className="com-input" style={{ minHeight: 88 }} value={a.health} onChange={(e) => set("health", e.target.value)} />
            </Field>
            <Field id="diet" label="Dietary needs for Lauren’s kitchen" optional>
              <input id="diet" className="com-input" value={a.diet} onChange={(e) => set("diet", e.target.value)} />
            </Field>
            <Option multi selected={a.sweatLodgeOk} onClick={() => set("sweatLodgeOk", !a.sweatLodgeOk)} label="I understand the retreat includes breathwork, a sweat lodge and cold creek immersion, and I’ll share any condition that could affect that." />
          </>
        )}
        {step === 2 && (
          <>
            <div>
              <div className="exp-kicker">Commitment</div>
              <h2 className="lq-t22">Fully present, start to finish.</h2>
            </div>
            <Option multi selected={a.fullAttendance} onClick={() => set("fullAttendance", !a.fullAttendance)} label={`I can attend the full retreat: ${dates}`} />
            <Option multi selected={a.agreements} onClick={() => set("agreements", !a.agreements)} label="I agree to the circle agreements: confidentiality, presence and no phones during the work." />
            <Field id="phone" label="Your phone number">
              <input id="phone" className="com-input" inputMode="tel" autoComplete="tel" value={a.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <div className="com-grid-2">
              <Field id="ename" label="Emergency contact">
                <input id="ename" className="com-input" placeholder="Name" value={a.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
              </Field>
              <Field id="ephone" label="Their phone">
                <input id="ephone" className="com-input" inputMode="tel" value={a.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
              </Field>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div>
              <div className="exp-kicker">Review</div>
              <h2 className="lq-t22">Ready to send?</h2>
              <p className="lq-t13 lq-c2" style={{ marginTop: 4 }}>Nothing is charged. Mike&rsquo;s team reviews every application and books a short alignment call.</p>
            </div>
            <div className="exp-review">
              {([
                ["Intention", a.intention],
                ["Why now", a.calling],
                ["Experience", a.experience],
                ["Health", a.health || "Nothing shared"],
                ["Diet", a.diet || "No needs"],
                ["Phone", a.phone],
                ["Emergency", `${a.emergencyName}, ${a.emergencyPhone}`],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <span className="lq-c2">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div aria-live="polite">
          {error && (
            <p className="com-error" role="alert">
              <Icon name="close" size="xs" /> {error}
            </p>
          )}
        </div>
        <div className="com-between">
          {step > 0 ? (
            <Button variant="plain" size="md" icon="back" onClick={() => setStep((s) => s - 1)}>Back</Button>
          ) : (
            <Link href={`/experiences/${runId}`} className="lq-btn lq-press" data-variant="plain" data-size="md">
              <span>Cancel</span>
            </Link>
          )}
          {step < 3 ? (
            <Button size="md" iconAfter="chevron" disabled={!ready} onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button size="md" icon="check" disabled={pending} aria-busy={pending} onClick={submit}>
              {pending ? "Sending…" : waitlist ? "Join the waitlist" : "Send application"}
            </Button>
          )}
        </div>
      </Glass>
    </div>
  );
}
