"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Draft, Photo } from "./Pieces";
import type { PubPhoto } from "./photos";

/**
 * Sticky buy bar: appears once the hero's buy row scrolls out of view and hides again near the
 * page end, carrying the live quote from the server (name, price, the one action).
 */
export function BuyBar({ watch, name, photo, price, per, note, draft, label, href }: { watch: string; name: string; photo: PubPhoto; price?: string; per?: string; note?: string; draft?: string | null; label: string; href: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(watch);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  return (
    <div className="pub-buybar" data-show={show ? "" : undefined} aria-hidden={!show} inert={!show}>
      <Photo p={photo} sizes="52px" />
      <div className="pub-buybar-t">
        <b>{name}</b>
        <span>
          {price ? (
            <>
              <em className="pub-buybar-pp">{price}</em>
              {per ?? note}
            </>
          ) : (
            note ?? "By application"
          )}
          <Draft note={draft} />
        </span>
      </div>
      {price && (
        <span className="pub-buybar-price">
          {price}
        </span>
      )}
      <Button href={href} size="md">{label}</Button>
    </div>
  );
}
