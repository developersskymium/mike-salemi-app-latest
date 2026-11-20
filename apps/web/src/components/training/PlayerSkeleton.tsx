import { Skeleton } from "@/components/ui";
import "./day-styles";
import "./day-calm.css";

/** The day view while it loads, in the final layout's exact boxes (header, 16:9 player + playlist, step bar, table card). */
export function PlayerSkeleton() {
  return (
    <div className="kd-day kc-day" aria-busy="true" aria-label="Loading day">
      <div className="kc-scroll">
        <header className="kc-top">
          <span className="kc-icon" data-off="" />
          <div className="kc-top-t">
            <Skeleton shape="text" width={140} />
            <Skeleton shape="text" width={110} style={{ marginTop: 4 }} />
          </div>
          <div className="kc-top-a">
            <span className="kc-icon" data-off="" />
            <span className="kc-icon" data-off="" />
          </div>
        </header>
        <main className="kc-main">
          <div className="kc-hero">
            <div className="kc-player">
              <div className="kd-stage kc-still" />
            </div>
            <aside className="kc-pl">
              <div className="kc-pl-in">
                <div className="kc-pl-h">
                  <Skeleton shape="text" width={120} />
                </div>
                <ol className="kc-pl-list">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i}>
                      <span className="kc-pl-item">
                        <span className="kc-pl-th" />
                        <span className="kc-pl-t">
                          <Skeleton shape="text" width={50} />
                          <Skeleton shape="text" width={`${90 - i * 8}%`} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
          <section className="kc-now">
            <div className="kc-now-t">
              <Skeleton shape="text" width={120} />
              <Skeleton shape="title" width={240} />
            </div>
          </section>
          <Skeleton shape="card" height={320} style={{ borderRadius: 20 }} />
        </main>
      </div>
      <div className="kc-bar">
        <Skeleton shape="card" height={52} style={{ borderRadius: 99 }} />
      </div>
    </div>
  );
}
