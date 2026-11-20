import { GuideSkeleton } from "@/components/training/PlayerSkeleton";

/** Self-Guided days render inside the shell (no focus mode), so the skeleton does too (D10). */
export default function Loading() {
  return <GuideSkeleton />;
}
