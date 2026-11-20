import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AmbientBackdrop, Button, EmptyState, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { VideoView } from "@/components/discover/VideoView";
import { programPhoto } from "@/components/discover/access";
import { loadProgramsTab, loadVideo } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";

export const metadata: Metadata = { title: "Video" };

export default async function VideoPage({ params }: { params: Promise<{ video: string }> }) {
  const { video } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(video)) notFound();
  return (
    <Suspense fallback={<VideoSkeleton />}>
      <VideoContent id={video} />
    </Suspense>
  );
}

async function VideoContent({ id }: { id: string }) {
  const { supabase, user } = await getUser();
  let page, tab;
  try {
    [page, tab] = await Promise.all([loadVideo(supabase, user!.id, id), loadProgramsTab(supabase)]);
  } catch {
    return (
      <EmptyState
        title="This video didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href={`/library/${id}`}>Try again</Button>}
      />
    );
  }
  if (!page.video) {
    return (
      <EmptyState
        title="Video not available"
        body="It may be part of a program you don't have yet."
        icon="lock"
        action={<Button variant="glass" size="md" href="/library">Back to library</Button>}
      />
    );
  }
  const photos: Record<string, string> = {};
  for (const p of tab.catalog) {
    const ph = programPhoto(p);
    if (ph) photos[p.slug] = ph.src;
  }
  return (
    <>
      {page.video.thumbnail_url && <AmbientBackdrop src={page.video.thumbnail_url} fixed />}
      <VideoView video={page.video} related={page.related} collections={page.collections} programPhotos={photos} />
    </>
  );
}

function VideoSkeleton() {
  return (
    <div className="dsc-video" aria-busy="true" aria-label="Loading video">
      <Skeleton shape="circle" width={44} height={44} />
      <Skeleton glass shape="card" style={{ aspectRatio: "16 / 9", marginTop: 12 }} />
      <Skeleton shape="title" width="70%" style={{ marginTop: 18 }} />
    </div>
  );
}
