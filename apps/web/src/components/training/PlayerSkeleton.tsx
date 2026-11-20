import { Skeleton } from "@/components/ui";
import "./day-styles";

export function PlayerSkeleton() {
  return (
    <div className="kd-day" aria-busy="true" aria-label="Loading day">
      <header className="kd-top">
        <div className="kd-top-l">
          <Skeleton shape="card" width={92} height={40} style={{ borderRadius: 999 }} />
        </div>
        <div className="kd-top-t">
          <Skeleton shape="text" width={150} />
          <Skeleton shape="text" width={110} style={{ marginTop: 6 }} />
        </div>
        <div className="kd-top-a">
          <Skeleton shape="circle" width={36} />
        </div>
      </header>
      <div className="kd-body">
        <div className="kd-col">
          <div className="kd-colin">
            <div className="kd-stage-wrap">
              <div className="kd-stage" data-flush="" />
            </div>
            <section className="kd-meta">
              <div className="kd-meta-t">
                <Skeleton shape="text" width={120} />
                <Skeleton shape="title" width="55%" style={{ marginTop: 10 }} />
                <Skeleton shape="text" width="70%" style={{ marginTop: 10 }} />
              </div>
            </section>
            <Skeleton shape="card" height={180} />
          </div>
        </div>
        <aside className="kd-rail">
          <div className="kd-rail-h">
            <Skeleton shape="text" width={130} />
            <Skeleton shape="title" width={180} />
          </div>
          <div style={{ padding: 16, display: "grid", gap: 18 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} shape="text" width={`${80 - i * 7}%`} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Self-Guided day while it loads: the same boxes as `SelfGuidedDay` (sticky context bar with chips,
 * intro, first lesson) inside the normal shell, so nothing moves when the page arrives (D10).
 */
export function GuideSkeleton() {
  return (
    <div className="kd-guide" aria-busy="true" aria-label="Loading day">
      <div className="kd-ctx">
        <div className="kd-ctx-row">
          <Skeleton shape="circle" width={36} />
          <div className="kd-ctx-t">
            <Skeleton shape="text" width={180} />
            <Skeleton shape="text" width={120} style={{ marginTop: 6 }} />
          </div>
        </div>
        <div className="kd-chips" aria-hidden>
          {[96, 132, 110, 92, 120].map((w, i) => (
            <Skeleton key={i} width={w} height={32} style={{ borderRadius: 999, flex: "none" }} />
          ))}
        </div>
      </div>
      <header className="kd-guide-intro">
        <Skeleton shape="text" width={220} />
        <Skeleton shape="title" width="60%" height={50} />
        <Skeleton shape="text" width="80%" height={25} />
        <Skeleton shape="card" height={88} style={{ marginTop: 14, borderRadius: 18 }} />
      </header>
      <div className="kd-guide-list">
        <section className="kd-gl">
          <div className="kd-gl-meta">
            <Skeleton shape="text" width={110} />
            <Skeleton shape="title" width="70%" />
          </div>
          <div className="kd-gl-body">
            <Skeleton shape="card" style={{ aspectRatio: "16 / 9", height: "auto", borderRadius: 20 }} />
          </div>
        </section>
      </div>
    </div>
  );
}
