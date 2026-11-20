import type { Metadata } from "next";
import { Suspense } from "react";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, EmptyState, LargeTitle, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { LibraryBrowser } from "@/components/discover/LibraryBrowser";
import { loadLibrary } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";

export const metadata: Metadata = { title: "Library" };

type SP = { q?: string; tags?: string; program?: string; saved?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const query = {
    q: sp.q?.slice(0, 80) ?? "",
    tags: sp.tags ? sp.tags.split(",").filter(Boolean).slice(0, 8) : [],
    program: sp.program ?? null,
    saved: sp.saved === "1",
  };
  return (
    <>
      <AmbientBackdrop src="/media/library/Goblet-Squat.png" fixed position="40% 40%" />
      <LargeTitle title="Library" trailing={<span className="dsc-phone-only"><UserButton /></span>} />
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent query={query} />
      </Suspense>
    </>
  );
}

async function LibraryContent({ query }: { query: { q: string; tags: string[]; program: string | null; saved: boolean } }) {
  const { supabase, user } = await getUser();
  const data = await loadLibrary(supabase, user!.id, query).catch(() => null);
  if (data) return <LibraryBrowser data={data} initial={query} />;
  {
    return (
      <div className="dsc-stack">
        <EmptyState
          title="The library didn't load"
          body="Check your connection and try again."
          illustration={<EmptyScene scene="offline" size={160} />}
          action={<Button variant="glass" size="md" href="/library">Try again</Button>}
        />
      </div>
    );
  }
}

function LibrarySkeleton() {
  return (
    <div className="dsc-lib" aria-busy="true" aria-label="Loading library">
      <Skeleton glass height={48} style={{ borderRadius: 999 }} />
      <div className="dsc-vgrid" style={{ marginTop: 16 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} glass shape="card" height={230} />
        ))}
      </div>
    </div>
  );
}
