import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "./training.css";
import "./program-summit.css";

/* The day skeleton lives in ./PlayerSkeleton with the day stylesheets, so the program segment
   (whose loading UI stays mounted around every day page) never ships day.css a second time. */

export function ProgramSkeleton() {
  return (
    <div className="pv" aria-busy="true" aria-label="Loading program">
      <Skeleton shape="card" height={520} style={{ borderRadius: "var(--r-hero)" }} />
      <Skeleton shape="card" height={44} width={340} style={{ borderRadius: 999 }} />
      <Skeleton shape="card" height={300} />
      <div className="pv-body">
        <div className="pv-main">
          <Skeleton shape="title" width={180} />
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} shape="card" height={38} width={110} style={{ borderRadius: 999 }} />
            ))}
          </div>
          <Glass radius="card" style={{ padding: 24, display: "grid", gap: 16 }}>
            <SkeletonText lines={3} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} shape="text" width={`${92 - i * 4}%`} />
            ))}
          </Glass>
        </div>
        <aside className="pv-side">
          <Skeleton shape="card" height={260} />
          <Skeleton shape="card" height={180} />
        </aside>
      </div>
    </div>
  );
}

export function CertificateSkeleton() {
  return (
    <div className="trn-cert-page" aria-busy="true" aria-label="Loading certificate">
      <Skeleton shape="card" glass height={520} style={{ borderRadius: "var(--r-hero)" }} />
    </div>
  );
}
