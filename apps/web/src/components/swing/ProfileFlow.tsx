"use client";

import { useState } from "react";
import { IntakeArt } from "@/components/intake/IntakeArt";
import { ChoiceCards, NumberStepper, QuestionShell } from "@/components/intake/QuestionShell";
import "@/components/intake/intake.css";
import { Button } from "@/components/ui";
import type { BellType, Goal, SetupProfile } from "@/lib/swing";

const SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40];

/** Three questions, one per screen: neck history, the bell, the goal. Each one changes the coaching. */
export function ProfileFlow({
  initial,
  suggestedKg,
  kgSource,
  onSave,
  onClose,
}: {
  initial: SetupProfile | null;
  suggestedKg: number;
  kgSource: string | null;
  onSave: (p: { neck_history: boolean; bell_type: BellType; bell_kg: number; goal: Goal }) => void;
  onClose: () => void;
}) {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [neck, setNeck] = useState<string | undefined>(initial ? (initial.neck_history ? "yes" : "no") : undefined);
  const [type, setType] = useState<BellType>(initial?.bell_type ?? "cast-iron");
  const startKg = initial?.bell_kg ?? suggestedKg;
  const [kgIdx, setKgIdx] = useState(Math.max(0, SIZES.findIndex((s) => s >= startKg)));
  const [goal, setGoal] = useState<string | undefined>(initial?.goal ?? undefined);
  const advance = () => {
    setDir("fwd");
    setAt((n) => n + 1);
  };
  const back = at > 0 ? () => { setDir("back"); setAt((n) => n - 1); } : undefined;
  const close = { label: "Close", icon: true, onClick: onClose };

  return <div data-shell-focus>{screen()}</div>;

  function screen() {
  if (at === 0)
    return (
      <QuestionShell at={0} total={3} onBack={back} close={close} sceneKey="neck" dir={dir} art={<IntakeArt topic="body" move="swing" />}
        eyebrow="Swing Set-Up Coach" title="Have you had neck problems?" help="If yes, your head advice stays neutral. The coach never asks you to look up.">
        <ChoiceCards label="Neck history" value={neck} onPick={(v) => { setNeck(v); window.setTimeout(advance, 250); }}
          options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes", hint: "An injury, surgery or recurring pain" }]} />
      </QuestionShell>
    );

  if (at === 1)
    return (
      <QuestionShell at={1} total={3} onBack={back} close={close} sceneKey="bell" dir={dir} art={<IntakeArt topic="equipment" move="swing" />}
        eyebrow="Swing Set-Up Coach" title="Which bell will you swing?" help={kgSource ? `We started from ${kgSource}.` : "Mike's starting point: about 16 kg for men, 8 kg for women."}
        footer={<Button variant="filled" size="lg" block onClick={advance}>Continue</Button>}>
        <ChoiceCards label="Bell type" value={type} onPick={(v) => setType(v as BellType)}
          options={[{ value: "competition", label: "Competition bell", hint: "Steel, the same size at every weight" }, { value: "cast-iron", label: "Cast iron", hint: "Gets bigger as it gets heavier" }]} />
        <div className="sw-qs-kg">
          <p className="sw-qs-label">Weight</p>
          <NumberStepper label="Bell weight" value={kgIdx} min={0} max={SIZES.length - 1} onChange={setKgIdx} format={(i) => `${SIZES[i]} kg`} />
        </div>
      </QuestionShell>
    );

  return (
    <QuestionShell at={2} total={3} onBack={back} close={close} sceneKey="goal" dir={dir} art={<IntakeArt topic="goal" move="swing" />}
      eyebrow="Swing Set-Up Coach" title="What do you want from it?">
      <ChoiceCards label="Goal" value={goal}
        onPick={(v) => {
          setGoal(v);
          window.setTimeout(() => onSave({ neck_history: neck === "yes", bell_type: type, bell_kg: SIZES[kgIdx]!, goal: v as Goal }), 250);
        }}
        options={[
          { value: "learn", label: "Learn the set-up", hint: "Go through Mike's 7 steps and check each one" },
          { value: "fix", label: "Fix a fault I know about", hint: "Film it and get one fix at a time" },
          { value: "program", label: "Start the 2-week program", hint: "Six sessions on the minute, with the Approach before each set" },
        ]} />
    </QuestionShell>
  );
}
}
