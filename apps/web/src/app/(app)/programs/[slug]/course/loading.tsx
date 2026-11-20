import { Skeleton } from "@/components/ui";
import "@/components/journey/journey.css";

/** Journey home while it loads: hero, signature view and the side rail in their final boxes. */
export default function Loading() {
  return (
    <div className="jy" aria-busy="true" aria-label="Loading program">
      <Skeleton shape="card" height={440} style={{ borderRadius: 28 }} />
      <div className="jy-cols">
        <div className="jy-main">
          <Skeleton shape="title" width={280} />
          <Skeleton shape="card" height={520} />
        </div>
        <div className="jy-side">
          <Skeleton shape="card" height={300} />
          <Skeleton shape="card" height={180} />
        </div>
      </div>
    </div>
  );
}
