import "@/components/course/mtk/mtk.css";

export default function Loading() {
  return (
    <div className="mtk" aria-busy="true">
      <span className="lq-skel" style={{ display: "block", height: 36, width: 280, borderRadius: 999 }} />
      <span className="lq-skel" style={{ display: "block", height: 12, width: 160, borderRadius: 6, marginTop: 30 }} />
      <span className="lq-skel" style={{ display: "block", height: 44, width: "60%", borderRadius: 12, marginTop: 12 }} />
      <span className="lq-skel" style={{ display: "block", height: 190, borderRadius: 24, marginTop: 24 }} />
    </div>
  );
}
