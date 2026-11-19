import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import type { RetreatPhoto } from "@/content/retreat-gallery";

/** Airbnb-style 5-up photo grid with a full-screen viewer. */
export function RetreatPhotoGrid({ photos }: { photos: RetreatPhoto[] }) {
  const [at, setAt] = useState<number | null>(null);
  const [hero, ...rest] = photos;
  if (!hero) return null;
  const side = rest.slice(0, 4);

  return (
    <>
      <div className="relative grid gap-1.5 overflow-hidden rounded-[1.5rem] sm:grid-cols-2 lg:h-[30rem] lg:grid-cols-4 lg:grid-rows-[1fr_1fr]">
        {[hero, ...side].map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setAt(i)}
            className={`group relative overflow-hidden bg-muted lg:min-h-0 ${i === 0 ? "sm:col-span-2 lg:row-span-2" : "hidden sm:block"}`}
          >
            <img
              src={p.src}
              alt={p.caption}
              loading={i === 0 ? "eager" : "lazy"}
              className={`w-full object-cover lg:absolute lg:inset-0 lg:h-full transition-transform duration-700 group-hover:scale-[1.04] ${i === 0 ? "h-72 sm:h-full" : "h-full min-h-[12rem] lg:min-h-0"}`}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAt(0)}
          className="pressable absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background/90 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur"
        >
          <Images className="h-3.5 w-3.5" /> Show all {photos.length} photos
        </button>
      </div>
      {at !== null && <Viewer photos={photos} at={at} setAt={setAt} />}
    </>
  );
}

/** Horizontal thumbnail strip that opens the same viewer. */
export function RetreatPhotoStrip({ photos }: { photos: RetreatPhoto[] }) {
  const [at, setAt] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <button
            key={`${p.src}-${i}`}
            type="button"
            onClick={() => setAt(i)}
            className="group relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-muted"
          >
            <img src={p.src} alt={p.caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>
      {at !== null && <Viewer photos={photos} at={at} setAt={setAt} />}
    </>
  );
}

function Viewer({ photos, at, setAt }: { photos: RetreatPhoto[]; at: number; setAt: (n: number | null) => void }) {
  const step = (d: number) => setAt((at + d + photos.length) % photos.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });
  const p = photos[at];
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo gallery" className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 sm:px-8">
        <p className="text-sm font-semibold text-foreground">{at + 1} / {photos.length}</p>
        <button type="button" onClick={() => setAt(null)} aria-label="Close gallery" className="pressable grid h-9 w-9 place-items-center rounded-full border border-hairline">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
        <img src={p.src} alt={p.caption} className="max-h-full max-w-full rounded-2xl object-contain" />
        <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="pressable absolute left-3 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-background/80">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Next photo" className="pressable absolute right-3 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-background/80">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="px-4 py-4 text-center text-sm text-muted-foreground">{p.caption}</p>
    </div>
  );
}
