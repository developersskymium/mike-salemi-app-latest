"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Sheet, useToast } from "@/components/ui";
import { updatePlanStatus, type ActionResult } from "@/lib/actions/today-plan-you";

/** Edit / Pause (or Resume) / Remove for one plan card on Manage plans. Paused plans are listed under "Paused". Remove = end the plan (it leaves the calendar). */
export function ManagePlanActions({ planId, name, status }: { planId: string; name: string; status: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult<unknown>>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error === "offline" ? "Preview mode can't save changes. They work on the live app." : r.error, { icon: "close" });
      toast(ok, { tone: "success", icon: "check" });
      setConfirm(false);
      router.refresh();
    });
  return (
    <div className="mng-acts">
      <Button size="sm" variant="secondary" href={`/plan/${planId}`}>Edit</Button>
      {status === "paused" ? (
        <Button size="sm" variant="plain" disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "active"), "Plan resumed")}>Resume</Button>
      ) : (
        <Button size="sm" variant="plain" disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "paused"), "Plan paused. Find it under Paused to resume.")}>Pause</Button>
      )}
      <Button size="sm" variant="plain" disabled={pending} onClick={() => setConfirm(true)}>Remove</Button>
      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Remove ${name}?`}
        description="It leaves your calendar. Lessons you finished stay finished."
        detents={["medium"]}
        footer={
          <div style={{ display: "grid", gap: 8 }}>
            <Button block disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "archived"), "Plan removed")}>Remove plan</Button>
            <Button block variant="plain" onClick={() => setConfirm(false)}>Keep it</Button>
          </div>
        }
      />
    </div>
  );
}
