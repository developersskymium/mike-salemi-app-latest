import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "@/components/commerce/commerce.css";

export default function Loading() {
  return (
    <div className="com-page" aria-busy="true" aria-label="Loading billing">
      <div style={{ padding: "56px 4px 16px" }}><Skeleton shape="text" width={160} height={34} /></div>
      <Glass radius="card" className="com-plan-hero">
        <Skeleton shape="circle" width={88} height={88} />
        <SkeletonText lines={3} />
      </Glass>
      <div className="com-section"><Skeleton width="100%" height={220} glass /></div>
    </div>
  );
}
