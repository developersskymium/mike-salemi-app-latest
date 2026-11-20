"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui";
import type { GalleryPhoto } from "@/lib/loaders/commerce";

/** Photo mosaic with a full-screen viewer (arrow keys, swipe, Esc). Stock photos are left out. */
export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const real = photos.filter((p) => !p.stock);
  const dlg = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState<number | null>(null);
  const x0 = useRef<number | null>(null);
  const open = (n: number) => {
    setI(n);
    dlg.current?.showModal();
  };
  const close = () => dlg.current?.close();
  const step = useCallback((d: number) => setI((n) => (n === null ? n : (n + d + real.length) % real.length)), [real.length]);
  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setI(null);
    el.addEventListener("keydown", onKey);
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("close", onClose);
    };
  }, [step]);
  if (!real.length) return null;
  const cur = i === null ? null : real[i];
  return (
    <>
      <div className="exp-gallery">
        {real.map((p, n) => (
          <button key={p.url} type="button" className="exp-shot lq-press" onClick={() => open(n)} aria-label={`Open photo: ${p.caption}`}>
            <Image src={p.url} alt={p.caption} fill sizes={n === 0 ? "(min-width: 900px) 50vw, 100vw" : "(min-width: 900px) 25vw, 50vw"} />
          </button>
        ))}
      </div>
      <dialog
        ref={dlg}
        className="exp-lightbox"
        aria-label="Photo viewer"
        onPointerDown={(e) => (x0.current = e.clientX)}
        onPointerUp={(e) => {
          if (x0.current !== null && Math.abs(e.clientX - x0.current) > 48) step(e.clientX < x0.current ? 1 : -1);
          x0.current = null;
        }}
      >
        <div className="exp-lb-bar">
          <span className="lq-t13 lq-num" style={{ opacity: 0.8 }}>{i === null ? "" : `${i + 1} / ${real.length}`}</span>
          <IconButton icon="close" label="Close" variant="clear" onClick={close} />
        </div>
        <div className="exp-lb-stage">{cur && <Image key={cur.url} src={cur.url} alt={cur.caption} fill sizes="100vw" />}</div>
        <div className="exp-lb-foot">
          <IconButton icon="prev" label="Previous photo" variant="clear" onClick={() => step(-1)} />
          <p className="lq-t15" style={{ textAlign: "center" }}>{cur?.caption}</p>
          <IconButton icon="next" label="Next photo" variant="clear" onClick={() => step(1)} />
        </div>
      </dialog>
    </>
  );
}
