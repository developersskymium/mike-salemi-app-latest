import "@/components/course/course.css";

/** Course frame while the lesson loads: bar, curriculum column and a stage skeleton. */
export default function Loading() {
  return (
    <div className="crs" aria-busy="true">
      <div className="crs-bar lq-glass" data-level="thick"><div className="crs-bar-row" /></div>
      <div className="crs-body">
        <aside className="crs-side"><div className="crs-nav-head">{[0, 1, 2].map((i) => <span key={i} className="lq-skel" style={{ height: i === 2 ? 38 : 10, borderRadius: 8 }} />)}</div></aside>
        <main className="crs-main">
          <div className="crs-stage">
            <span className="lq-skel" style={{ display: "block", height: 12, width: "40%", borderRadius: 6 }} />
            <span className="lq-skel" style={{ display: "block", height: 34, width: "70%", borderRadius: 10, marginTop: 14 }} />
            <span className="lq-skel" style={{ display: "block", aspectRatio: "16 / 9", borderRadius: 20, marginTop: 28 }} />
          </div>
        </main>
      </div>
    </div>
  );
}
