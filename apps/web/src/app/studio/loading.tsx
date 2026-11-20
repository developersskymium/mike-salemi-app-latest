import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "grid", gap: 16 }}>
      <Skeleton style={{ height: 40, width: 260, borderRadius: 12 }} />
      <Skeleton style={{ height: 120, borderRadius: 20 }} />
      <Skeleton style={{ height: 320, borderRadius: 20 }} />
    </div>
  );
}
