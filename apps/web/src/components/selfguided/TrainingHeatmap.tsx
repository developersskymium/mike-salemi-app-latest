import { loadTrainingStats } from "@/lib/loaders/selfguided";
import { HeatmapGrid } from "./parts";
import "./selfguided.css";

/** Server component: the training calendar heatmap across every program (You / passport). */
export async function TrainingHeatmap({ weeks = 26, title = "Training days", className }: { weeks?: number; title?: string; className?: string }) {
  const stats = await loadTrainingStats(weeks).catch(() => null);
  if (!stats) return null;
  return (
    <div className={className}>
      <HeatmapGrid entries={stats.heatmap} today={stats.today} weeks={weeks} title={title} />
    </div>
  );
}
