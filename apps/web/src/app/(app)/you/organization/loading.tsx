import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "@/components/commerce/commerce.css";
import "@/components/orgs/orgs.css";

export default function Loading() {
  return (
    <div className="com-page" aria-busy="true" aria-label="Loading organization">
      <div style={{ padding: "56px 4px 16px" }}><Skeleton shape="text" width={220} height={34} /></div>
      <Glass radius="card" className="org-hero"><Skeleton width={64} height={64} /><SkeletonText lines={2} /></Glass>
      <div className="com-section"><Skeleton height={240} glass /></div>
    </div>
  );
}
