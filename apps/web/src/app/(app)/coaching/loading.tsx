import { Glass, Skeleton, SkeletonText } from "@/components/ui";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export default function Loading() {
  return (
    <div className="com-page" aria-busy="true" aria-label="Loading coaching">
      <div style={{ padding: "56px 4px 16px" }}><Skeleton shape="text" width={180} height={34} /></div>
      <div className="coa-layout">
        <Glass radius="card" className="coa-credits"><Skeleton shape="circle" width={92} height={92} /><SkeletonText lines={3} /></Glass>
        <Skeleton height={260} glass />
      </div>
    </div>
  );
}
