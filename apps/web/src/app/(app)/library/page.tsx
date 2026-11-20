import type { Metadata } from "next";
import { Suspense } from "react";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { LibrarySkeleton } from "@/components/discover/library/LibrarySkeleton";
import { LibraryView } from "@/components/discover/library/LibraryView";
import { fromParams, type LibState } from "@/components/discover/library/model";
import { loadLibraryPage, loadLibraryPicks } from "@/lib/loaders/discover";
import { loadSavedLists } from "@/lib/loaders/saved-lists";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/library/library.css";

export const metadata: Metadata = {
  title: "Library",
  description: "Every training video in one place. Pick a program, then filter by type, movement, length or level.",
};

type SP = Record<string, string | undefined>;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const state = fromParams(sp);
  const playing = sp.v && /^[0-9a-f-]{36}$/i.test(sp.v) ? sp.v : null;
  return (
    <>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent state={state} playing={playing} />
      </Suspense>
    </>
  );
}

async function LibraryContent({ state, playing }: { state: LibState; playing: string | null }) {
  const { supabase, user } = await getUser();
  const data = await loadLibraryPage(supabase, user!.id).catch(() => null);
  if (data) {
    const [picks, lists] = await Promise.all([
      loadLibraryPicks(supabase, data.index.videos.map((v) => v.id)).catch(() => []),
      loadSavedLists(data.index.videos.slice(0, 5).map((v) => v.id)),
    ]);
    return <LibraryView data={data} initial={state} initialPlaying={playing} picks={picks} lists={lists} />;
  }
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
