import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "@/components/experiences/experiences.css";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading retreat">
      <div className="exp-hero" style={{ background: "var(--fill)" }}>
        <div className="exp-hero-copy">
          <Skeleton shape="text" width={120} />
          <Skeleton shape="text" width="70%" height={44} />
          <Skeleton shape="text" width="50%" />
        </div>
      </div>
      <div className="exp-section"><Glass radius="card" className="com-panel"><SkeletonText lines={4} /></Glass></div>
    </div>
  );
}
