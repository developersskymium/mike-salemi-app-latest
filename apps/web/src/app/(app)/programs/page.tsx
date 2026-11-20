import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgramsCatalog } from "@/components/access/ProgramsCatalog";
import { ProgramsSkeleton } from "@/components/discover/ProgramsTab";
import "@/components/discover/discover.css";

export const metadata: Metadata = {
  title: "Programs",
  description: "Courses, coaching and retreats from Mike Salemi alongside Kettlebell Lifestyle: Mastering the Kettlebell, Athleticism 4 Life, Men of Movement and more.",
};

/** Programs catalog (spec 11/12): Your programs · Included in your plan · Explore · Train with Mike in person. */
export default function ProgramsPage() {
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <ProgramsCatalog />
    </Suspense>
  );
}
