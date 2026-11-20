"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon, IconButton } from "@/components/ui";

export interface TourPhoto { url: string; caption: string }

/**
 * Airbnb-style photo tour: a five-photo mosaic (desktop) or a swipeable strip with a counter (phone),
 * "Show all photos" opens a full-screen tour (every photo, large), and any photo opens the viewer
 * (arrows, swipe, ←/→, Esc). Photos are always full colour; nothing is cropped in the viewer.
 */
export function PhotoTour({ photos, name, priority = true }: { photos: TourPhoto[]; name: string; priority?: boolean }) {
  const tour = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<number | null>(null);
  const [at, setAt] = useState(0);
  const x0 = useRef<number | null>(null);
  const n = photos.length;

  const openTour = (i: number | null = null) => {
    tour.current?.showModal();
    setView(i);
    if (i === null) tour.current?.querySelector(".rt-tour-body")?.scrollTo({ top: 0 });
  };
  const close = () => {
    if (view !== null) setView(null);
    else tour.current?.close();
  };
  const step = (d: number) => setView((v) => (v === null ? v : (v + d + n) % n));

  useEffect(() => {
    const el = tour.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape" && view !== null) {
        e.preventDefault();
        setView(null);
      }
    };
    const onClose = () => setView(null);
    el.addEventListener("keydown", onKey);
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("close", onClose);
    };
  }, [step, view]);

  if (!n) return null;
  const top = photos.slice(0, 5);
  const cur = view === null ? null : photos[view];

  return (
    <>
      {/* Desktop mosaic */}
      <div className="rt-mosaic" data-n={top.length}>
        {top.map((p, i) => (
          <button key={p.url} type="button" className="rt-mosaic-cell" onClick={() => openTour(i)} aria-label={`Open photo ${i + 1} of ${n}: ${p.caption}`}>
            <Image src={p.url} alt={i === 0 ? `${name}: ${p.caption}` : p.caption} fill priority={priority && i === 0} sizes={i === 0 ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 280px, 50vw"} />
          </button>
        ))}
        <button type="button" className="rt-showall lq-press" onClick={() => openTour(null)}>
          <Icon name="grid" size="xs" /> Show all {n} photos
        </button>
      </div>

      {/* Phone strip */}
      <div className="rt-strip-wrap">
        <div
          ref={strip}
          className="rt-strip"
          onScroll={(e) => {
            const el = e.currentTarget;
            setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {photos.map((p, i) => (
            <button key={p.url} type="button" className="rt-strip-cell" onClick={() => openTour(i)} aria-label={`Open photo ${i + 1} of ${n}: ${p.caption}`}>
              <Image src={p.url} alt={i === 0 ? `${name}: ${p.caption}` : p.caption} fill sizes="100vw" />
            </button>
          ))}
        </div>
        <span className="rt-strip-count lq-num" aria-hidden>{at + 1} / {n}</span>
      </div>

      <dialog ref={tour} className="rt-tour" aria-label={`${name} photos`}>
        <div className="rt-tour-bar">
          <IconButton icon={view === null ? "close" : "back"} label={view === null ? "Close photos" : "Back to all photos"} variant="fill" size="sm" onClick={close} />
          <span className="lq-t15 rt-tour-title">{view === null ? name : <span className="lq-num">{view + 1} / {n}</span>}</span>
          <span style={{ width: 36 }} />
        </div>
        {view === null ? (
          <div className="rt-tour-body">
            <div className="rt-tour-grid">
              {photos.map((p, i) => (
                <figure key={p.url} className="rt-tour-fig" data-wide={i % 3 === 0 ? "" : undefined}>
                  <button type="button" className="rt-tour-shot" onClick={() => setView(i)} aria-label={`Open photo: ${p.caption}`}>
                    <Image src={p.url} alt={p.caption} fill sizes={i % 3 === 0 ? "(min-width: 900px) 880px, 100vw" : "(min-width: 900px) 440px, 50vw"} />
                  </button>
                  <figcaption className="lq-t13 lq-c2">{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="rt-view"
            onPointerDown={(e) => (x0.current = e.clientX)}
            onPointerUp={(e) => {
              if (x0.current !== null && Math.abs(e.clientX - x0.current) > 48) step(e.clientX < x0.current ? 1 : -1);
              x0.current = null;
            }}
          >
            <div className="rt-view-stage">{cur && <Image key={cur.url} src={cur.url} alt={cur.caption} fill sizes="100vw" />}</div>
            <div className="rt-view-foot">
              <IconButton icon="arrowLeft" label="Previous photo" variant="fill" onClick={() => step(-1)} />
              <p className="lq-t15">{cur?.caption}</p>
              <IconButton icon="arrowRight" label="Next photo" variant="fill" onClick={() => step(1)} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
