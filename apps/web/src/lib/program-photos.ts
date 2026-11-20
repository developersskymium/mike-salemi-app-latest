/**
 * Summit photography per program: full-colour photos of Mike with no baked-in text, and a focal
 * point (object-position) that keeps faces in frame. Used by the shell (resume card, access list)
 * and as a fallback cover wherever a program's own media carries text.
 */
export type ProgramPhoto = { src: string; position: string; alt: string };

const P = (file: string, position: string, alt: string): ProgramPhoto => ({ src: `/media/summit/${file}`, position, alt });

export const PROGRAM_PHOTOS: Record<string, ProgramPhoto> = {
  "kettlebell-lifestyle": P("mike-standing.jpg", "62% 28%", "Mike Salemi in the gym with a kettlebell"),
  "working-in": P("working-in.jpg", "50% 42%", "Mike coaching a Working In session"),
  "mastering-the-kettlebell": P("mike-deadlift.jpg", "50% 30%", "Mike demonstrating a kettlebell deadlift"),
  "athleticism-4-life": P("mike-getup.jpg", "50% 25%", "Mike in a Turkish get-up"),
  "the-path-to-inspired-action": P("tgk.jpg", "50% 35%", "Men gathered in a circle outdoors"),
  "the-grounded-king": P("tgk.jpg", "50% 35%", "Men gathered in a circle outdoors"),
  "men-of-movement": P("summit-group.jpg", "50% 40%", "Men of Movement on Mount Shasta"),
  "men-of-movement-retreats": P("summit-group.jpg", "50% 40%", "Men of Movement on Mount Shasta"),
  "what-your-kettlebell-swing-is-missing": P("mike-goblet.jpg", "50% 30%", "Mike holding a kettlebell"),
  "free-6-video-kettlebell-mini-series": P("mike-press.jpg", "50% 25%", "Mike pressing a kettlebell"),
  "kettlebell-roadmap": P("mike-windmill.jpg", "40% 30%", "Mike in a kettlebell windmill"),
  coaching: P("mike-coaching.jpg", "50% 30%", "Mike coaching one to one"),
  "executive-edge": P("mike-coaching.jpg", "50% 30%", "Mike coaching one to one"),
  "zen-savage": P("summit-clouds.jpg", "50% 50%", "Mount Shasta above the clouds"),
};

export const MIKE_FACE = "/media/summit/mike-face.png";

export function programPhoto(slug: string | null | undefined): ProgramPhoto {
  return (slug && PROGRAM_PHOTOS[slug]) || PROGRAM_PHOTOS["kettlebell-lifestyle"]!;
}
