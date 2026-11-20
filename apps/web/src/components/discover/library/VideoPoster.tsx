"use client";

import type { MoveName } from "@/components/graphics";
import { MovementCover } from "./MovementCover";
import { SafeImage } from "./SafeImage";
import type { MikePhoto } from "./model";

/**
 * A video's poster: the real Vimeo frame, else a full-colour photo of Mike doing the movement (face in
 * frame), else the designed movement cover. Each step falls through when its image fails to load.
 */
export function VideoPoster({
  video, mike, move, seed, level, figure = 96, sizes, priority,
}: {
  video: string | null;
  mike: MikePhoto | null;
  move: MoveName;
  seed: string;
  level?: string | null;
  figure?: number;
  sizes: string;
  priority?: boolean;
}) {
  const designed = <MovementCover move={move} seed={seed} level={level} size={figure} />;
  const photo = mike ? (
    <SafeImage src={mike.src} alt="" fill sizes={sizes} priority={priority} style={{ objectPosition: mike.focal }} data-poster="mike" fallback={designed} />
  ) : (
    designed
  );
  if (!video) return photo;
  return <SafeImage src={video} alt="" fill sizes={sizes} priority={priority} data-poster="video" fallback={photo} />;
}
