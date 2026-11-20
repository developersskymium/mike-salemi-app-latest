"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Button, Icon } from "@/components/ui";
import { postWallPhotoAction } from "@/lib/actions/retreats";

export interface WallPhoto { id: string; url: string; caption: string | null; by: string; mine: boolean }

/** Shrinks a photo in the browser (longest side 2000 px, JPEG) so uploads stay small on mountain signal. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", 0.85));
  } catch {
    return file; // HEIC and friends: send as is.
  }
}

/**
 * Shared photo wall (live and after): every man booked on the run can add photos; only they can see it.
 * New photos appear at once (optimistic), then save in the background.
 */
export function PhotoWall({ runId, photos, canPost = true }: { runId: string; photos: WallPhoto[]; canPost?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(photos);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = (file: File) => {
    setMsg(null);
    const local = URL.createObjectURL(file);
    const temp: WallPhoto = { id: `local-${local}`, url: local, caption: null, by: "You", mine: true };
    setItems((x) => [temp, ...x]);
    start(async () => {
      const blob = await shrink(file);
      const fd = new FormData();
      fd.set("runId", runId);
      fd.set("photo", new File([blob], blob === file ? file.name : "photo.jpg", { type: blob.type || file.type }));
      const r = await postWallPhotoAction(fd);
      if (!r.ok) {
        setItems((x) => x.filter((p) => p.id !== temp.id));
        setMsg(r.message);
      } else setMsg("Shared with the group.");
    });
  };

  return (
    <div className="rtp-wall">
      {canPost && (
        <div className="rtp-wall-bar">
          <p className="lq-t13 lq-c2">Only the men on this retreat can see these.</p>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = ""; }} />
          <Button variant="glass" size="sm" icon="plus" onClick={() => input.current?.click()} disabled={pending}>{pending ? "Sharing…" : "Add a photo"}</Button>
        </div>
      )}
      {msg && <p className="lq-t13 lq-c2" role="status">{msg}</p>}
      {items.length ? (
        <ul className="rtp-wall-grid" role="list">
          {items.map((p) => (
            <li key={p.id}>
              <figure>
                <span className="rtp-wall-shot">
                  {p.url.startsWith("blob:") ? <img src={p.url} alt={p.caption ?? "Your photo"} /> : <Image src={p.url} alt={p.caption ?? `Photo from ${p.by}`} fill sizes="(min-width: 1024px) 260px, 45vw" />}
                </span>
                <figcaption className="lq-t12 lq-c2">{p.caption ? `${p.caption} · ` : ""}{p.by}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rtp-wall-empty"><Icon name="grid" size="md" /><p className="lq-t15">No photos yet. Be the first to share one from the land.</p></div>
      )}
    </div>
  );
}
