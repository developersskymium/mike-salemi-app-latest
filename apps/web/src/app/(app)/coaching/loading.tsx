import { Skeleton } from "@/components/ui";
import "@/components/coaching/coach.css";

export default function Loading() {
  return (
    <div className="com-page co-page" aria-busy="true" aria-label="Loading coaching">
      <Skeleton height={48} width={360} />
      <Skeleton height={420} />
      <Skeleton height={120} />
      <div className="co-paths"><Skeleton height={300} /><Skeleton height={300} /><Skeleton height={300} /></div>
    </div>
  );
}
