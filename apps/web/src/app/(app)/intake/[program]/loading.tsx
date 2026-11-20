import "@/components/intake/intake.css";

export default function Loading() {
  return (
    <div className="itk" aria-busy="true">
      <div className="itk-head lq-glass" data-level="thick"><div className="itk-col"><div className="itk-head-row" /></div></div>
      <div className="itk-body"><div className="itk-col itk-scene">
        <span className="lq-skel" style={{ display: "block", height: 12, width: 120, borderRadius: 6 }} />
        <span className="lq-skel" style={{ display: "block", height: 30, width: "80%", borderRadius: 10, marginTop: 14 }} />
        {[0, 1, 2].map((i) => <span key={i} className="lq-skel" style={{ display: "block", height: 52, borderRadius: 18, marginTop: i ? 8 : 28 }} />)}
      </div></div>
    </div>
  );
}
