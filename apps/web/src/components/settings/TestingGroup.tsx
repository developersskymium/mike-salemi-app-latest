"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { resetMyProgressAction } from "@/lib/settings/reset";

/** Admins only: start over as a brand-new member (keeps admin role, plan, purchases and billing). */
export function TestingGroup() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = text.trim().toUpperCase() === "RESET";

  return (
    <section className="st-group st-testing" id="testing" aria-labelledby={`${id}-h`}>
      <div className="st-group-head">
        <h2 className="st-group-title" id={`${id}-h`}>Testing</h2>
        <span className="st-testing-tag">Admins only</span>
      </div>
      <div className="st-testing-card">
        <div className="st-testing-copy">
          <b>Reset my progress</b>
          <p>
            Start again as a new member, from the welcome intake. Clears your programs, schedules, intake answers, badges,
            points, notes and tool results. Keeps your admin access, plan, purchases and billing.
          </p>
        </div>
        {!open ? (
          <button type="button" className="lq-btn" data-size="sm" onClick={() => { setOpen(true); setError(null); }}>
            Reset my progress
          </button>
        ) : (
          <form
            className="st-testing-confirm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ready || pending) return;
              start(async () => {
                const r = await resetMyProgressAction(text);
                if (!r.ok) return setError(r.error);
                router.push("/onboarding");
                router.refresh();
              });
            }}
          >
            <label htmlFor={`${id}-c`}>This can&apos;t be undone. Type <b>RESET</b> to confirm.</label>
            <div className="st-testing-row">
              <input id={`${id}-c`} className="lq-input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="RESET" />
              <button type="submit" className="lq-btn st-testing-go" data-size="sm" data-variant="filled" disabled={!ready || pending} aria-busy={pending || undefined}>
                {pending ? "Resetting…" : "Reset now"}
              </button>
              <button type="button" className="lq-btn" data-size="sm" onClick={() => { setOpen(false); setText(""); setError(null); }} disabled={pending}>
                Cancel
              </button>
            </div>
            {error && <p className="st-testing-err" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
