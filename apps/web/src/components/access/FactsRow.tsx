import { Icon } from "@/components/ui";
import type { Facts } from "./catalog-meta";

/** Facts row: weeks · min/session · equipment · level (All programs #6). */
export function FactsRow({ facts, compact }: { facts: Facts; compact?: boolean }) {
  return (
    <ul className="ac-facts lq-t12" data-compact={compact ? "" : undefined} aria-label="At a glance">
      <li><Icon name="calendar" size="xs" /> {facts.weeks}</li>
      <li><Icon name="clock" size="xs" /> {facts.minutes}</li>
      <li><Icon name="kettlebell" size="xs" /> {facts.equipment}</li>
      <li><Icon name="trophy" size="xs" /> {facts.level}</li>
    </ul>
  );
}
