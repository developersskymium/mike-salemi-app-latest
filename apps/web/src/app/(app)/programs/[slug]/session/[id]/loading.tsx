import { Skeleton } from "@/components/ui";
import "@/components/selfguided/selfguided.css";

export default function Loading() {
  return (
    <div className="sg-page sg-stack" aria-busy="true" aria-label="Loading session">
      <Skeleton height={64} glass />
      <Skeleton height={360} glass />
      <Skeleton height={120} glass />
    </div>
  );
}
