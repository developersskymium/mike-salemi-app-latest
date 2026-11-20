import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "./training.css";
import "./day.css";

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
    <div className="kd-day" aria-busy="true" aria-label="Loading day">
      <header className="kd-top lq-glass">
        <Skeleton shape="circle" width={36} />
        <div className="kd-top-t">
          <Skeleton shape="text" width={150} />
          <Skeleton shape="text" width={110} style={{ marginTop: 6 }} />
        </div>
        <Skeleton shape="circle" width={34} />
      </header>
      <div className="kd-body">
        <div className="kd-col">
          <div className="kd-stage-wrap">
            <div className="kd-stage" data-flush="" />
          </div>
          <section className="kd-meta">
            <div className="kd-meta-t">
              <Skeleton shape="text" width={120} />
              <Skeleton shape="title" width="55%" style={{ marginTop: 8 }} />
            </div>
          </section>
          <div className="kd-sec">
            <div className="kd-sec-in">
              <SkeletonText lines={3} />
            </div>
          </div>
        </div>
        <aside className="kd-rail">
          <div className="kd-rail-h">
            <Skeleton shape="text" width={130} />
          </div>
          <div style={{ padding: 16, display: "grid", gap: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} shape="text" width={`${80 - i * 7}%`} />
            ))}
          </div>
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
