import { Skeleton } from "@/components/ui";
import "./library.css";

/**
 * Loading frame for /library and /library/lessons. Same wrapper, chip row, tool row and grid
 * classes as the real page, same card geometry (16:9 poster + fixed text block): nothing moves when content lands.
 */
export function LibrarySkeleton({ kind = "videos" }: { kind?: "videos" | "lessons" }) {
  return (
    <div className="w1-lib" aria-busy="true" aria-label={kind === "videos" ? "Loading library" : "Loading lessons"} role="status">
      <header className="w1-lib-head">
        <Skeleton shape="title" width={kind === "videos" ? 140 : 180} height={34} />
      </header>
      <div className="w1-lib-programs" aria-hidden>
        {[56, 150, 170, 130, 150, 120].map((w, i) => (
          <Skeleton key={i} width={w} height={32} style={{ borderRadius: 999, flex: "none" }} />
        ))}
      </div>
      <div className="w1-lib-tools" aria-hidden>
        <Skeleton height={44} style={{ borderRadius: 999 }} />
        <div className="w1-lib-filters">
          {[104, 128, 112, 96].map((w, i) => (
            <Skeleton key={i} width={w} height={36} style={{ borderRadius: 999, flex: "none" }} />
          ))}
        </div>
      </div>
      <div className="w1-lib-results"><Skeleton shape="text" width={110} /></div>
      {kind === "videos" ? (
        <ul className="w1-lib-grid" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <div className="w1-lib-cardbtn" data-skel>
                <Skeleton className="w1-lib-poster" style={{ borderRadius: "calc(var(--r-card) - 5px)" }} />
                <span className="w1-lib-text">
                  <Skeleton shape="text" width="40%" />
                  <Skeleton shape="text" width="86%" />
                </span>
              </div>
            </li>
          ))}
        </ul>
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
