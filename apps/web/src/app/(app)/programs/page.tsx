import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgramsContent, ProgramsSkeleton } from "@/components/discover/ProgramsTab";
import "@/components/discover/discover.css";
import "@/components/discover/catalog/catalog.css";

export const metadata: Metadata = {
  title: "Programs",
  description: "Courses, coaching and retreats from Mike Salemi alongside Kettlebell Lifestyle: Mastering the Kettlebell, Athleticism 4 Life, Men of Movement and more.",
};

/** Programs catalog (approved Summit mockup 05): the page head lives in the catalog so search and filters sit with it. */
export default function ProgramsPage() {
  return (
    <Suspense fallback={<ProgramsSkeleton />}>
      <ProgramsContent />
    </Suspense>
  );
}
