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
