"use client";

import { useState, type ReactNode } from "react";
import { Button, CompleteButton, Rings, Segmented, Sheet, Toggle, useToast } from "@/components/ui";
import { StretchNumber } from "@/components/signature";

const QUESTIONS: [string, string[], number][] = [
  ["How did you sleep?", ["Poorly", "Okay", "Well", "Great"], 2],
  ["Energy right now", ["Low", "Fair", "Good", "High"], 2],
  ["Muscle soreness", ["A lot", "Some", "A little", "None"], 1],
  ["Stress today", ["High", "Some", "Low", "Calm"], 2],
  ["Joints feel", ["Sore", "Stiff", "Fine", "Great"], 3],
];

export function SheetDemo({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button variant="glass" size="md" icon="sparkle" onClick={() => setOpen(true)}>
        Readiness sheet
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Training readiness"
        description="Five questions pick today’s workout."
        detents={["large", "medium"]}
        footer={<Button block onClick={() => setOpen(false)}>Start Workout III</Button>}
      >
        <div style={{ display: "grid", gap: 14 }}>
          {QUESTIONS.map(([q, opts, s], i) => (
            <div key={q}>
              <div className="lq-t13" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{q}</span>
                <span className="lq-c3 lq-num">{i + 1}/5</span>
              </div>
              <Segmented label={q} size="sm" defaultValue={opts[s]!} options={opts.map((o) => ({ value: o, label: o }))} />
            </div>
          ))}
          <div className="lq-sunk" style={{ marginTop: 6, padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
            <Rings size={76} stroke={8} rings={[{ value: 14 / 20, tone: 1 }]} label="Score 14 of 20">
              <span className="lq-dnum" style={{ fontSize: 22 }}>14</span>
            </Rings>
            <div>
              <div className="lq-t17">Chart 2 modification</div>
              <div className="lq-t13 lq-c2" style={{ marginTop: 4 }}>Moderate bells, full volume. Keep two reps in reserve.</div>
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export function ToastDemo() {
  const toast = useToast();
  return (
    <Button variant="fill" size="md" icon="bookmark" onClick={() => toast("Saved to You", { tone: "success", action: { label: "Undo", onClick: () => {} } })}>
      Save
    </Button>
  );
}

export function ControlsDemo() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Segmented label="Level" options={[{ value: "1", label: "Level I · Beginner" }, { value: "2", label: "Level II · Intermediate" }]} />
      <Segmented label="Path" size="sm" options={[{ value: "i", label: "Immersion" }, { value: "s", label: "Self-Guided" }]} />
      <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 12, alignItems: "center" }} className="lq-t13 lq-c2">
          <Toggle defaultChecked label="Auto-advance" /> Auto-advance
        </label>
        <label style={{ display: "flex", gap: 12, alignItems: "center" }} className="lq-t13 lq-c2">
          <Toggle label="Reminders" /> Reminders
        </label>
      </div>
      <CompleteButton block onComplete={() => new Promise((r) => setTimeout(r, 250))} doneLabel="Step complete">
        Complete step
      </CompleteButton>
    </div>
  );
}

/** Remounts its children so an entrance animation can be watched again. */
export function Replay({ children, label = "Replay" }: { children: ReactNode; label?: string }) {
  const [k, setK] = useState(0);
  return (
    <div className="g-replay">
      <div key={k} className="g-replay-stage">{children}</div>
      <button type="button" className="g-replay-btn" onClick={() => setK((n) => n + 1)} aria-label={label}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" /></svg>
      </button>
    </div>
  );
}

/** A hero number that counts again on click. */
export function StretchDemo() {
  const [v, setV] = useState(23);
  return (
    <button type="button" className="g-stretch" onClick={() => setV((x) => (x === 23 ? 61 : 23))} aria-label="Count again">
      <StretchNumber value={v} from={v === 23 ? 0 : 23} size={56} />
    </button>
  );
}
