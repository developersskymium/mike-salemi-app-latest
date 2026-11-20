import type { Metadata } from "next";
import { Suspense } from "react";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, LargeTitle } from "@/components/ui";
import { ProgramsContent, ProgramsSkeleton } from "@/components/discover/ProgramsTab";
import "@/components/discover/discover.css";
import "@/components/discover/catalog/catalog.css";

export const metadata: Metadata = {
  title: "Programs",
  description: "Courses, coaching and retreats from Mike Salemi alongside Kettlebell Lifestyle: Mastering the Kettlebell, Athleticism 4 Life, Men of Movement and more.",
};

export default function ProgramsPage() {
  return (
    <>
      <AmbientBackdrop src="/media/l5e/2c8245bf-d2f2-4483-8be4-dccd5af4dbef/mastering-the-kettlebell.png" fixed position="50% 20%" />
      <LargeTitle title="Programs" eyebrow="Beyond the program" trailing={<span className="dsc-phone-only"><UserButton /></span>} />
      <Suspense fallback={<ProgramsSkeleton />}>
        <ProgramsContent />
      </Suspense>
    </>
  );
}
