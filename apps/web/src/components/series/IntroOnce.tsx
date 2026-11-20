"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";

/**
 * Mike's intro clip, first visit only (spec 12 program idea 8). After that, "Watch intro" lives in
 * the ⋯ menu. Hidden on the server render and until the device says it is a first visit: no flash.
 */
export function IntroOnce({ slug, href, photo, name }: { slug: string; href: string; photo: { src: string; position: string }; name: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const k = `intro-seen:${slug}`;
    try {
      if (!window.localStorage.getItem(k)) {
        setShow(true);
        window.localStorage.setItem(k, "1");
      }
    } catch {}
  }, [slug]);
  if (!show) return null;
  return (
    <Link href={href} className="sr-intro lq-press" prefetch>
      <span className="sr-intro-thumb">
        <Image src={photo.src} alt="" fill sizes="160px" style={{ objectPosition: photo.position }} />
        <span className="sr-play" aria-hidden><Icon name="play" size="xs" /></span>
      </span>
      <span className="sr-today-body">
        <span className="sr-eyebrow" data-tone="warm">A word from Mike</span>
        <b>Welcome to {name}</b>
        <small>Watch the short intro first: what this is for and how to use it.</small>
      </span>
      <button type="button" className="sr-x" aria-label="Dismiss" onClick={(e) => (e.preventDefault(), setShow(false))}><Icon name="close" size="xs" /></button>
    </Link>
  );
}
