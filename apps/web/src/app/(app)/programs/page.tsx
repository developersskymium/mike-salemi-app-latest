import type { Metadata } from "next";
import { Suspense } from "react";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, LargeTitle } from "@/components/ui";
import { ProgramsContent, ProgramsSkeleton } from "@/components/discover/ProgramsTab";
import "@/components/discover/discover.css";
import type { ExploreTab } from "@/components/discover/ExploreTabs";

export const metadata: Metadata = { title: "Programs" };

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial: ExploreTab = tab === "experiences" || tab === "free" ? tab : "training";
  return (
    <>
      <AmbientBackdrop src="/media/l5e/2c8245bf-d2f2-4483-8be4-dccd5af4dbef/mastering-the-kettlebell.png" fixed position="50% 20%" />
      <LargeTitle title="Programs" trailing={<span className="dsc-phone-only"><UserButton /></span>} />
      <Suspense fallback={<ProgramsSkeleton />}>
        <ProgramsContent initial={initial} />
      </Suspense>
    </>
  );
}
