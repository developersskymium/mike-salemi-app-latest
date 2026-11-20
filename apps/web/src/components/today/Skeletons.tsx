import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "./tpy.css";

export function TodaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Today">
      <div className="tpy-title" style={{ paddingTop: 56, marginBottom: 20 }}>
        <Skeleton shape="text" width={160} />
        <Skeleton shape="title" width={140} style={{ marginTop: 8 }} />
      </div>
      <div className="tpy-today">
        <Skeleton shape="card" height={300} glass style={{ borderRadius: "var(--r-hero)" }} />
        <div className="tpy-today-side">
          <Glass radius="card" className="tpy-pad" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Skeleton shape="circle" width={104} />
            <div style={{ flex: 1 }}><SkeletonText lines={3} /></div>
          </Glass>
          <Glass radius="card" className="tpy-pad"><Skeleton shape="block" height={72} /></Glass>
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
