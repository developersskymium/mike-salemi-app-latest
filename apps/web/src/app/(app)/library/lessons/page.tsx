import type { Metadata } from "next";
import { Suspense } from "react";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { LessonsView } from "@/components/discover/library/LessonsView";
import { LibrarySkeleton } from "@/components/discover/library/LibrarySkeleton";
import { loadLibraryPage, loadProgramsTab } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/library/library.css";

export const metadata: Metadata = {
  title: "All lessons",
  description: "Every lesson from every program, in one searchable list.",
};

type SP = Record<string, string | undefined>;

export default async function AllLessonsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<LibrarySkeleton kind="lessons" />}>
      <Content sp={sp} />
    </Suspense>
  );
}

async function Content({ sp }: { sp: SP }) {
  const { supabase, user } = await getUser();
  const [data, tab] = await Promise.all([loadLibraryPage(supabase, user!.id).catch(() => null), loadProgramsTab(supabase).catch(() => null)]);
  if (!data) {
    return (
      <div className="w1-lib">
        <EmptyState
          title="The lessons didn't load"
          body="Check your connection and try again."
          illustration={<EmptyScene scene="offline" size={160} />}
          action={<Button variant="glass" size="md" href="/library/lessons">Try again</Button>}
        />
      </div>
    );
  }
  return <LessonsView data={data} catalog={tab?.catalog ?? []} initial={sp} />;
}
