"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Icon, haptic, useToast } from "@/components/ui";
import { saveCoachPrepAction } from "@/lib/actions/coaching";

type Init = { goals: string; since_last: string; watch: string; footage_url: string };

/**
 * Idea 3 · Pre-call form: three questions, prefilled from your booking note, your homework ticks and
 * Mike's last notes. Grouped on desktop, one question per screen on phone.
 */
export function PrepForm({ bookingId, init, prefilled, back }: { bookingId: string; init: Init; prefilled: Partial<Record<keyof Init, boolean>>; back: string }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(init);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof Init) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await saveCoachPrepAction({ bookingId, ...v });
      if (r.ok) {
        haptic(14);
        toast("Shared with Mike", { tone: "success", icon: "check" });
        router.push(back);
      } else setErr(r.message);
    });

  const qs: { k: keyof Init; label: string; why?: string; rows: number; placeholder: string }[] = [
    { k: "goals", label: "What do you want to leave this call with?", rows: 5, placeholder: "A plan to get my press past 24 kg, and a reset for the afternoon slump." },
    { k: "since_last", label: "How did your one thing go since the last call?", rows: 5, placeholder: "Did it most days. Easier in the morning; skipped on travel days." },
    { k: "watch", label: "What should Mike look at?", rows: 4, placeholder: "My swing at rep 15+: the bell floats and my back tightens." },
  ];
  const left = 3 - step;
  return (
    <div className="co-card co-form">
      <div className="co-progress" aria-hidden><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <p className="lq-t13 co-muted" style={{ margin: 0 }}>About {left === 1 ? "30 seconds" : "1 minute"} left · Mike reads this before the call</p>
      <div className="co-qs" data-stepped="">
        {qs.map((q, i) => (
          <div key={q.k} className="co-q" data-on={i === step ? "" : undefined}>
            <label htmlFor={`q-${q.k}`}>{q.label}</label>
            {prefilled[q.k] && <span className="co-prefill"><Icon name="sparkle" size="xs" />Prefilled for you · edit</span>}
            <textarea id={`q-${q.k}`} rows={q.rows} maxLength={2000} value={v[q.k]} onChange={set(q.k)} placeholder={q.placeholder} onFocus={() => setStep(i)} />
            {q.k === "watch" && (
              <>
                <label htmlFor="q-footage" className="lq-t13" style={{ fontWeight: 600, marginTop: 6 }}>Footage link <span className="co-faint">(optional)</span></label>
                <input id="q-footage" inputMode="url" value={v.footage_url} onChange={set("footage_url")} placeholder="https://drive.google.com/…" aria-describedby="foot-help" />
                <span id="foot-help" className="lq-t12 co-faint">Film from the side, full body, a few working reps. Drive, Dropbox or unlisted YouTube.</span>
              </>
            )}
          </div>
        ))}
      </div>
      {err && <p className="co-err" role="alert">{err}</p>}
      <div className="co-form-foot">
        <span className="co-ic lq-t13 co-muted"><Icon name="lock" size="xs" />Only you and Mike see this.</span>
        <div className="co-acts">
          {step > 0 && <Button variant="plain" size="md" onClick={() => setStep(step - 1)} className="co-phone-only">Back</Button>}
          {step < 2 && <Button variant="secondary" size="md" onClick={() => setStep(step + 1)} className="co-phone-only" iconAfter="arrowRight">Next</Button>}
          <Button size="lg" icon="check" onClick={save} disabled={pending || v.goals.trim().length < 3} aria-busy={pending} className={step < 2 ? "co-desk-only" : undefined}>{pending ? "Saving…" : "Share with Mike"}</Button>
        </div>
      </div>
    </div>
  );
}
