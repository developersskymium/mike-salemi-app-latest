import type { NodeInfo, NodeState, RoadmapMovement } from "@ms/core";
import { Icon, type IconName } from "@/components/ui";

export const STATE_LABEL: Record<NodeState, string> = { locked: "Locked", learning: "Learning", practising: "Practising", passed: "Passed" };
export const STATE_ICON: Record<NodeState, IconName> = { locked: "lock", learning: "steps", practising: "repeat", passed: "check" };

export function StatePill({ state, mastery }: { state: NodeState; mastery?: boolean }) {
  return (
    <span className="rm-pill" data-state={state}>
      <Icon name={STATE_ICON[state]} size="xs" />
      {mastery && state === "practising" ? "Mastery" : STATE_LABEL[state]}
    </span>
  );
}

/** The result screen's list: every movement of the phase with its state and why. */
export function NodeStateList({ movements, nodes }: { movements: RoadmapMovement[]; nodes: NodeInfo[] }) {
  return (
    <ul className="rm-states">
      {movements.map((m) => {
        const n = nodes.find((x) => x.key === m.key);
        if (!n) return null;
        return (
          <li key={m.key} data-state={n.state}>
            <span className="rm-states-dot" aria-hidden><Icon name={STATE_ICON[n.state]} size="xs" /></span>
            <span className="rm-states-t">
              <b className="lq-t15">{m.name}</b>
              <span className="lq-t13 lq-c2">{n.why}</span>
            </span>
            <StatePill state={n.state} mastery={m.kind === "mastery"} />
          </li>
        );
      })}
    </ul>
  );
}
