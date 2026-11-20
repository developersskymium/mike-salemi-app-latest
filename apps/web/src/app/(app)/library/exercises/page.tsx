import type { Metadata } from "next";
import { Suspense } from "react";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ExercisesView } from "@/components/discover/library/ExercisesView";
import { LibrarySkeleton } from "@/components/discover/library/LibrarySkeleton";
import { loadLibraryPage } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/library/library.css";

export const metadata: Metadata = { title: "Exercises A–Z", description: "Every exercise Mike teaches, A to Z, each with a demo video." };

export default function ExercisesPage() {
  return (
    <Suspense fallback={<LibrarySkeleton kind="exercises" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { supabase, user } = await getUser();
  const data = await loadLibraryPage(supabase, user!.id).catch(() => null);
  if (!data) {
    return (
      <div className="w1-lib">
        <EmptyState title="The exercises didn't load" body="Check your connection and try again." illustration={<EmptyScene scene="offline" size={160} />} action={<Button variant="glass" size="md" href="/library/exercises">Try again</Button>} />
      </div>
    );
  }
  return <ExercisesView index={data.index} />;
}
