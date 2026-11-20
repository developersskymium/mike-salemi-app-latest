import { Skeleton } from "@/components/ui";
import "./library.css";

/**
 * Loading frame for /library, /library/lessons and /library/exercises. Same header, tabs, search, program row,
 * toolbar and card geometry as the real pages (16:9 thumbnail + title + meta): nothing moves when content lands.
 */
export function LibrarySkeleton({ kind = "videos" }: { kind?: "videos" | "lessons" | "exercises" }) {
  return (
    <div className="w1-lib l2" aria-busy="true" aria-label="Loading library" role="status">
      <header className="l2-head" aria-hidden>
        <div className="l2-head-top">
          <div className="l2-head-copy">
            <Skeleton shape="title" width={120} height={34} />
            <Skeleton shape="text" width={300} />
          </div>
          <Skeleton className="l2-skel-tabs" style={{ borderRadius: 999 }} />
        </div>
        <div className="l2-searchwrap"><Skeleton height={48} style={{ borderRadius: 999, width: "100%" }} /></div>
      </header>
      {kind !== "exercises" && (
        <div className="l2-programs" aria-hidden>
          <div className="l2-programs-track">
            {[64, 170, 190, 150, 290, 170].map((w, i) => (
              <Skeleton key={i} width={w} height={36} style={{ borderRadius: 999, flex: "none" }} />
            ))}
          </div>
        </div>
      )}
      <div className="l2-toolbar" aria-hidden>
        <Skeleton shape="text" width={90} />
        <div className="l2-filters">
          {(kind === "videos" ? [72, 104, 84, 72, 84] : kind === "lessons" ? [72, 88] : []).map((w, i) => (
            <Skeleton key={i} width={w} height={36} style={{ borderRadius: 999, flex: "none" }} />
          ))}
        </div>
      </div>
      {kind === "videos" ? (
        <div className="l2-shelves" aria-hidden>
          {[0, 1].map((s) => (
            <section key={s} className="l2-shelf">
              <div className="l2-shelf-head"><Skeleton shape="text" width={200} height={22} /></div>
              <div className="w1-rail" data-start="">
                <div className="w1-rail-track" style={{ overflow: "hidden" }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="w1-rail-item" style={{ ["--w1-item" as string]: "17rem" }}>
                      <div className="l2-card-btn">
                        <Skeleton className="l2-thumb" style={{ borderRadius: 14 }} />
                        <Skeleton shape="text" width="80%" style={{ marginTop: 10 }} />
                        <Skeleton shape="text" width="50%" style={{ marginTop: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <ul className="w1-lib-lessongrid" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <div className="w1-lib-lesson" data-skel>
                <Skeleton className="w1-lib-lthumb" style={{ borderRadius: 12 }} />
                <span className="w1-lib-lessontext">
                  <Skeleton shape="text" width="40%" />
                  <Skeleton shape="text" width="80%" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
