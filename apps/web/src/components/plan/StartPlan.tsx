"use client";

import type { IsoDate } from "@ms/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Segmented, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { startTemplatePlan } from "@/lib/actions/today-plan-you";
import { nextMonday, WEEKDAYS } from "@/components/today/dates";
import "@/components/today/tpy.css";

/** Seven day toggles, Monday first. Values are JS weekdays (0 = Sunday). */
export function DayPicker({ value, onChange, label = "Training days" }: { value: number[]; onChange: (d: number[]) => void; label?: string }) {
  return (
    <div className="tpy-days" role="group" aria-label={label}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={on}
            aria-label={d.short}
            onClick={() => {
              haptic(6);
              onChange(on ? value.filter((x) => x !== d.value) : [...value, d.value].sort());
            }}
          >
            {d.short.slice(0, 1)}
            <span className="lq-sr">{d.short}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "Which days, and from when" + the one primary action that starts the template. */
export function StartPlanForm({
  templateId,
  initialDays,
  today,
  onStarted,
  cta = "Start this plan",
}: {
  templateId: string;
  initialDays: number[];
  today: IsoDate;
  onStarted?: (planId: string) => void;
  cta?: string;
}) {
  const [days, setDays] = useState(initialDays);
  const [when, setWhen] = useState<"today" | "monday">("today");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const monday = nextMonday(today);

  const submit = () =>
    start(async () => {
      const res = await startTemplatePlan(templateId, days, when === "today" ? today : monday);
      if (!res.ok) {
        toast(res.error === "offline" ? "Preview mode can't save plans. It works on the live app." : res.error, { icon: "close" });
        return;
      }
      setDone(true);
      haptic(12);
      toast("Plan started", { tone: "success", icon: "check" });
      if (onStarted) onStarted(res.data);
      else router.push(`/plan/${res.data}`);
    });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Train on</div>
        <DayPicker value={days} onChange={setDays} />
        <div className="lq-t13 lq-c2">{days.length} sessions a week</div>
      </div>
      {monday !== today && (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Start</div>
          <Segmented
            label="Start date"
            variant="fill"
            value={when}
            onChange={setWhen}
            options={[
              { value: "today", label: "Today" },
              { value: "monday", label: "Next Monday" },
            ]}
          />
        </div>
      )}
      <Button block onClick={submit} disabled={!days.length || pending} state={done ? "success" : "idle"} icon={pending ? undefined : "sparkle"}>
        {pending ? "Starting…" : cta}
      </Button>
    </div>
  );
}
