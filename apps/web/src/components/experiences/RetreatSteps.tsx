import { Icon } from "@/components/ui";
import type { RetreatStep } from "@/lib/retreat-stage";

/**
 * The three-step sign-up (Apply → Schedule a call → If approved, pay) with clear state:
 * done = green tick, now = glacier (the one action), wait = ember clock (Mike's turn).
 * `rail` stacks the steps (booking card); `bar` lays them in a row (Home, hub, cards).
 */
export function RetreatSteps({ steps, variant = "rail", onPhoto }: { steps: RetreatStep[]; variant?: "rail" | "bar"; onPhoto?: boolean }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <ol className="rt-steps" data-variant={variant} data-photo={onPhoto ? "" : undefined} aria-label={`Sign-up: ${done} of ${steps.length} steps done`}>
      {steps.map((s, i) => (
        <li key={s.key} className="rt-step" data-state={s.state} aria-current={s.state === "now" ? "step" : undefined}>
          <span className="rt-step-dot" aria-hidden>
            {s.state === "done" ? <Icon name="check" size="xs" /> : s.state === "wait" ? <Icon name="clock" size="xs" /> : <span className="lq-num">{i + 1}</span>}
          </span>
          <span className="rt-step-text">
            <span className="rt-step-label">{s.label}</span>
            <span className="rt-step-detail">{s.detail}</span>
          </span>
          <span className="lq-sr">{s.state === "done" ? "(done)" : s.state === "now" ? "(current step)" : s.state === "wait" ? "(waiting on Mike)" : ""}</span>
        </li>
      ))}
    </ol>
  );
}
