"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Sheet, useToast } from "@/components/ui";
import { fixMyPlan, updatePlanStatus, type ActionResult } from "@/lib/actions/today-plan-you";
import { plural } from "@/components/today/model";

export function PlanActions({ planId, status, missed }: { planId: string; status: string; missed: number }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult<unknown>>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error === "offline" ? "Preview mode can't save changes. They work on the live app." : r.error, { icon: "close" });
      toast(ok, { tone: "success", icon: "check" });
      after ? after() : router.refresh();
    });
  return (
    <div className="tpy-row-actions">
      {missed > 0 && (
        <Button size="md" icon="repeat" disabled={pending} onClick={() => run(() => fixMyPlan(planId), `${plural(missed, "session")} moved forward`)}>
          Fix my plan
        </Button>
      )}
      {status === "paused" ? (
        <Button size="md" variant="fill" disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "active"), "Plan resumed")}>Resume</Button>
      ) : (
        <Button size="md" variant="fill" icon="pause" disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "paused"), "Plan paused")}>Pause</Button>
      )}
      <Button size="md" variant="plain" disabled={pending} onClick={() => setConfirm(true)}>End plan</Button>
      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="End this plan?"
        description="It leaves your calendar. Lessons you finished stay finished."
        detents={["medium"]}
        footer={
          <div style={{ display: "grid", gap: 8 }}>
            <Button block disabled={pending} onClick={() => run(() => updatePlanStatus(planId, "archived"), "Plan ended", () => router.push("/plan"))}>End plan</Button>
            <Button block variant="plain" onClick={() => setConfirm(false)}>Keep it</Button>
          </div>
        }
      />
    </div>
  );
}
