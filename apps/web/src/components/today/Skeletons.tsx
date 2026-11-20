import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "./tpy.css";
import "./home.css";
import "./summit-home.css";

export function TodaySkeleton() {
  return (
    <div className="sh" aria-busy="true" aria-label="Loading Home">
      <Skeleton shape="card" height={520} style={{ borderRadius: "var(--r-hero)" }} />
      <div className="sh-grid">
        <Skeleton shape="card" height={420} />
        <Skeleton shape="card" height={420} />
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <Skeleton shape="title" width={200} />
        <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} shape="card" height={320} style={{ flex: "0 0 17.5rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <div className="tpy-title" style={{ paddingTop: 56, marginBottom: 20 }}>
        <Skeleton shape="title" width={160} />
      </div>
      <div className="tpy-stack">
        <Glass radius="card" className="tpy-pad"><SkeletonText lines={2} /></Glass>
        <Glass radius="card" className="tpy-pad" style={{ display: "grid", gap: 16 }}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Skeleton shape="block" width={40} height={40} style={{ borderRadius: 12 }} />
              <div style={{ flex: 1 }}><SkeletonText lines={2} /></div>
            </div>
          ))}
        </Glass>
      </div>
    </div>
  );
}
