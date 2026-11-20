import type { Metadata } from "next";
import { Suspense } from "react";
import { AmbientBackdrop, Button, EmptyState, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { LibraryView } from "@/components/discover/library/LibraryView";
import { fromParams, type LibState } from "@/components/discover/library/model";
import { loadLibraryPage } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/library/library.css";

export const metadata: Metadata = {
  title: "Library",
  description: "Every training video in one place. Filter by level, then category, then tag — On Ramp, phases, technique and workouts.",
};

type SP = Record<string, string | undefined>;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const state = fromParams(sp);
  const playing = sp.v && /^[0-9a-f-]{36}$/i.test(sp.v) ? sp.v : null;
  return (
    <>
      <AmbientBackdrop src="/media/library/Goblet-Squat.png" fixed position="40% 40%" />
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent state={state} playing={playing} />
      </Suspense>
    </>
  );
}

async function LibraryContent({ state, playing }: { state: LibState; playing: string | null }) {
  const { supabase, user } = await getUser();
  const data = await loadLibraryPage(supabase, user!.id).catch(() => null);
  if (data) return <LibraryView data={data} initial={state} initialPlaying={playing} />;
  return (
    <div className="w1-lib">
      <EmptyState
        title="The library didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/library">Try again</Button>}
      />
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="w1-lib" aria-busy="true" aria-label="Loading library">
      <Skeleton glass height={60} style={{ borderRadius: 28 }} />
      <Skeleton glass height={40} width={360} style={{ borderRadius: 999 }} />
      <div className="w1-lib-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} glass shape="card" style={{ aspectRatio: "4 / 6" }} />
        ))}
      </div>
    </div>
  );
}
