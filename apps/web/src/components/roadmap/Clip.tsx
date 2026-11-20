"use client";

import { useEffect, useRef, useState } from "react";
import type { RoadmapClip } from "@ms/core";

/**
 * Mike's single-rep clip, looping silently (Vimeo background mode: muted, no controls, loops).
 * The thumbnail sits underneath so the box is never empty; no clip → Mike's photo + "Clip coming".
 */
export function Clip({ clip, title, note, play = true, ratio = "16 / 9", fallback = "/media/summit/mike-goblet.jpg" }: {
  clip: RoadmapClip | null;
  title: string;
  note?: string;
  play?: boolean;
  ratio?: string;
  fallback?: string;
}) {
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, []);
  if (!clip) {
    return (
      <div className="rm-clip" style={{ aspectRatio: ratio }} data-empty="">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallback} alt="" className="rm-clip-poster" />
        <span className="rm-clip-badge">{note ?? "Clip coming"}</span>
      </div>
    );
  }
  const src = `https://player.vimeo.com/video/${clip.providerId}?${new URLSearchParams({
    ...(clip.hash ? { h: clip.hash } : {}), background: "1", dnt: "1", muted: "1", loop: "1", autopause: "0",
  })}`;
  return (
    <div className="rm-clip" style={{ aspectRatio: ratio }} data-ready={ready ? "" : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={broken ? fallback : clip.thumb ?? fallback} alt="" className="rm-clip-poster" data-fallback={broken ? "" : undefined} onError={() => setBroken(true)} />
      {play && !broken && <iframe src={src} title={`${title} — Mike's rep`} allow="autoplay; fullscreen; picture-in-picture" onLoad={() => setReady(true)} loading="lazy" />}
      <span className="rm-clip-badge">{broken ? "Clip loads online" : "Mike's rep · loops"}</span>
    </div>
  );
}
