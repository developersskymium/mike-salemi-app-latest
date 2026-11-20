import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "./training.css";

export function ProgramSkeleton() {
  return (
    <div className="trn-prog" aria-busy="true" aria-label="Loading program">
      <div className="trn-prog-top">
        <Skeleton shape="circle" width={44} glass />
      </div>
      <header className="trn-prog-head">
        <Skeleton shape="text" width={180} />
        <Skeleton shape="title" width="70%" style={{ marginTop: 10 }} />
        <Skeleton shape="text" width="55%" style={{ marginTop: 10 }} />
      </header>
      <div className="trn-prog-grid">
        <div className="trn-prog-main">
          <div className="trn-levels">
            <Skeleton shape="card" height={68} glass />
            <Skeleton shape="card" height={68} glass />
          </div>
          <Glass radius="hero" className="trn-hero">
            <Skeleton height={180} glass style={{ borderRadius: 0 }} />
            <div className="trn-hero-foot">
              <SkeletonText lines={2} />
              <Skeleton shape="card" height={52} style={{ borderRadius: 999, marginTop: 12 }} />
            </div>
          </Glass>
          <Skeleton shape="card" height={220} glass style={{ marginTop: 24 }} />
        </div>
        <aside className="trn-prog-side">
          <Skeleton shape="card" height={160} glass />
        </aside>
      </div>
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="trn-player" aria-busy="true" aria-label="Loading day">
      <div className="trn-player-scroll">
        <div className="trn-player-main" style={{ paddingTop: 72 }}>
          <Skeleton shape="card" glass style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-card)" }} />
          <Skeleton shape="text" width="40%" style={{ marginTop: 22 }} />
          <Skeleton shape="title" width="70%" style={{ marginTop: 10 }} />
          <div style={{ marginTop: 20 }}>
            <SkeletonText lines={3} />
          </div>
        </div>
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
