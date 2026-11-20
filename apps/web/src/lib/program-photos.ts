/**
 * Summit photography per program: full-colour photos of Mike with no baked-in text, and a focal
 * point (object-position) that keeps faces in frame. Used by the shell (resume card, access list)
 * and as a fallback cover wherever a program's own media carries text.
 */
export type ProgramPhoto = { src: string; position: string; alt: string };

import { PHOTO, PROGRAM_COVER } from "@/lib/photos";

/** Derived from the central map (lib/photos.ts): one distinct photo per program. */
export const PROGRAM_PHOTOS: Record<string, ProgramPhoto> = Object.fromEntries(
  Object.entries(PROGRAM_COVER).map(([slug, name]) => [slug, { src: PHOTO[name].src, position: PHOTO[name].focal, alt: PHOTO[name].alt }]),
);

export const MIKE_FACE = "/media/summit/mike-face.png";

export function programPhoto(slug: string | null | undefined): ProgramPhoto {
  return (slug && PROGRAM_PHOTOS[slug]) || PROGRAM_PHOTOS["kettlebell-lifestyle"]!;
}
