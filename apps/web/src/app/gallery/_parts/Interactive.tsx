"use client";

import { useState } from "react";
import { Button, CompleteButton, Rings, Segmented, Sheet, Toggle, useToast } from "@/components/ui";

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
        Open readiness sheet
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Training readiness"
        description="Five questions pick today’s workout."
        detents={["large", "medium"]}
        footer={<Button block onClick={() => setOpen(false)}>Start Workout II</Button>}
      >
        <div style={{ display: "grid", gap: 12 }}>
          {QUESTIONS.map(([q, opts, s], i) => (
            <div key={q}>
              <div className="lq-t13" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 650 }}>{q}</span>
                <span className="lq-c2 lq-num">{i + 1}/5</span>
              </div>
              <Segmented label={q} size="sm" variant="fill" defaultValue={opts[s]!} options={opts.map((o) => ({ value: o, label: o }))} />
            </div>
          ))}
          <div style={{ marginTop: 6, padding: 16, borderRadius: "var(--r-panel)", background: "var(--accent-soft)", display: "flex", gap: 16, alignItems: "center" }}>
            <Rings size={72} stroke={8} rings={[{ value: 14 / 20, tone: 1 }]} label="Score 14 of 20">
              <span className="lq-t22 lq-num" style={{ fontWeight: 750 }}>14</span>
            </Rings>
            <div>
              <div className="lq-t17">Chart 2 modification</div>
              <div className="lq-t13 lq-c2" style={{ marginTop: 2 }}>Moderate bells, full volume. Keep two reps in reserve.</div>
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
      <Segmented label="Explore" variant="fill" size="sm" options={[{ value: "t", label: "Training" }, { value: "e", label: "Experiences" }, { value: "f", label: "Free tools" }]} />
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 12, alignItems: "center" }} className="lq-t15">
          <Toggle defaultChecked label="Autoplay next clip" /> Autoplay next clip
        </label>
        <Toggle label="Reminders" />
      </div>
      <CompleteButton block onComplete={() => new Promise((r) => setTimeout(r, 250))} doneLabel="Step complete">
        Complete step
      </CompleteButton>
    </div>
  );
}
