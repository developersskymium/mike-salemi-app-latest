import { ListSkeleton } from "@/components/today/Skeletons";

export default function Loading() {
  return <ListSkeleton label="Loading your plan" rows={6} />;
}
