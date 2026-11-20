import { loadTrainingStats } from "@/lib/loaders/selfguided";
import { StatTiles } from "./parts";
import "./selfguided.css";

/** Server component: minutes, sessions, streak and this week across every program (You / passport). */
export async function TrainingStats({ className }: { className?: string }) {
  const stats = await loadTrainingStats(26).catch(() => null);
  if (!stats) return null;
  return (
    <div className={className}>
      <StatTiles stats={stats} />
    </div>
  );
}
