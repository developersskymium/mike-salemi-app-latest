/**
 * Program covers (Summit rule: no cover with baked-in text, nothing important cropped).
 *
 * Every cover is a text-free, full-colour photo. Each one carries a focal point (CSS object-position)
 * for wide crops (cards 16:10, heroes) and a second one for tall phone crops, so Mike's face and the
 * bell never fall outside the frame. Title-card artwork (the old covers with lettering) is never used
 * as a cover; covers that used to be title cards now point at /media/covers/* (migration 0019).
 */
import { photoByFile, programCover, PROGRAM_COVER, PHOTO } from "@/lib/photos";

export type Cover = { src: string; alt: string; focal: string; focalPhone: string; fit?: "cover" | "contain" };

type Focus = Omit<Cover, "src">;

/** Focal points by file (basename): the same photo is framed the same way everywhere. */
const FOCUS: Record<string, Focus> = {
  "mastering-the-kettlebell.jpg": { alt: "Mike Salemi in a racked kettlebell squat", focal: "42% 8%", focalPhone: "44% 10%" },
  "working-in.jpg": { alt: "Paul Chek and Mike Salemi leading a Working In session", focal: "42% 30%", focalPhone: "30% 28%" },
  "zen-savage.jpg": { alt: "Mike Salemi in a Turkish get-up", focal: "38% 30%", focalPhone: "36% 28%" },
  "coaching.jpg": { alt: "Mike Salemi coaching a member through a kettlebell drill", focal: "30% 22%", focalPhone: "30% 18%" },
  "kettlebell-lifestyle.jpg": { alt: "Mike Salemi pressing a kettlebell overhead in the gym", focal: "62% 36%", focalPhone: "58% 30%" },
  "athleticism-4-life.png": { alt: "Mike Salemi swinging a Bulgarian bag", focal: "60% 46%", focalPhone: "62% 40%" },
  "what-your-kettlebell-swing-is-missing.png": { alt: "Mike Salemi setting up a kettlebell swing", focal: "50% 42%", focalPhone: "50% 36%" },
  "free-6-video-kettlebell-mini-series.png": { alt: "Mike Salemi coaching a kettlebell deadlift", focal: "52% 40%", focalPhone: "52% 34%" },
  "kettlebell-roadmap.png": { alt: "Mike Salemi lifting a kettlebell", focal: "50% 34%", focalPhone: "48% 30%" },
  "path-to-inspired-action.png": { alt: "A man looking out over the valley at first light", focal: "48% 40%", focalPhone: "46% 36%" },
  "men-of-movement.png": { alt: "Men of Movement in front of Mount Shasta", focal: "50% 58%", focalPhone: "50% 60%" },
  "the-training-room.png": { alt: "Mike Salemi training with a Bulgarian bag", focal: "60% 46%", focalPhone: "62% 40%" },
  "tgk.jpg": { alt: "Men breathing together outdoors", focal: "52% 46%", focalPhone: "62% 44%" },
  "mom-cover.jpg": { alt: "Men of Movement gathered on the ridge", focal: "50% 50%", focalPhone: "58% 46%" },
  "coach.jpg": { alt: "Mike Salemi coaching", focal: "50% 30%", focalPhone: "50% 26%" },
  "beginner.png": { alt: "Mike Salemi with a kettlebell in a lunge", focal: "50% 40%", focalPhone: "50% 36%" },
  "mike-standing.jpg": { alt: "Mike Salemi in the gym with a kettlebell", focal: "52% 22%", focalPhone: "52% 20%" },
  // Summit set (/media/summit): focal points sit on Mike's face so even a thin strip keeps his head in frame.
  "mike-coaching.jpg": { alt: "Mike Salemi coaching a member through a kettlebell drill", focal: "26% 20%", focalPhone: "30% 18%" },
  "mike-deadlift.jpg": { alt: "Mike Salemi setting up a kettlebell deadlift", focal: "45% 4%", focalPhone: "45% 6%" },
  "mike-getup.jpg": { alt: "Mike Salemi in a Turkish get-up", focal: "35% 30%", focalPhone: "35% 28%" },
  "mike-press.jpg": { alt: "Mike Salemi pressing a kettlebell overhead", focal: "60% 14%", focalPhone: "58% 14%" },
  "mike-goblet.jpg": { alt: "Mike Salemi holding a kettlebell in the goblet position", focal: "52% 10%", focalPhone: "52% 12%" },
  "mike-squat.jpg": { alt: "Mike Salemi in a racked kettlebell squat", focal: "40% 6%", focalPhone: "42% 8%" },
  "mike-windmill.jpg": { alt: "Mike Salemi in a kettlebell windmill", focal: "70% 38%", focalPhone: "70% 36%" },
  "mike-portrait.jpg": { alt: "Mike Salemi with kettlebells in the gym", focal: "50% 20%", focalPhone: "50% 18%" },
  "mike-bag.jpg": { alt: "Mike Salemi training with a Bulgarian bag", focal: "60% 30%", focalPhone: "60% 28%" },
  "summit-group.jpg": { alt: "Men of Movement on Mount Shasta", focal: "50% 55%", focalPhone: "50% 55%" },
  "summit-clouds.jpg": { alt: "Mount Shasta above the clouds", focal: "50% 50%", focalPhone: "50% 50%" },
};

/** Black-and-white or graded photos: never a cover (Summit principle 1: full colour, never washed out). */
const MONO = new Set(["coach.jpg"]);
/** Stock photos of strangers: never stand in for Mike. */
const STOCK = new Set(["downshift.jpg", "summit-clouds.jpg", "alpine-pines.jpg", "campfire-men.jpg", "foggy-forest.jpg", "forest-path.jpg", "misty-ridge.jpg", "sunrise-camp.jpg"]);

/** Default cover per program: the curated map in lib/photos.ts (one distinct photo per program). */
const BY_SLUG: Record<string, string> = Object.fromEntries(Object.entries(PROGRAM_COVER).map(([slug, name]) => [slug, PHOTO[name].src]));

/** Old title-card files (lettering baked in). They may appear as artwork, never as a cover. */
const TITLE_CARDS = new Set(["mastering-the-kettlebell.png", "working-in.png"]);

const base = (url: string) => url.split("?")[0]!.split("/").pop() ?? "";

/** Framing for a file: the curated library first (lib/photos.ts), then the older per-file table. */
const focusOf = (url: string): Focus | undefined => {
  const p = photoByFile(url);
  return p ? { alt: p.alt, focal: p.focal, focalPhone: p.focalPhone } : FOCUS[base(url)];
};

/** True for an image that has text baked in (a title card). */
export const isTitleCard = (url: string | null | undefined) =>
  Boolean(url && ((url.startsWith("/media/l5e/") && TITLE_CARDS.has(base(url))) || url.startsWith("/media/library/") || url.startsWith("/media/ext/")));

/**
 * True for an image that may not be used as a cover: lettering baked in, black-and-white/graded, or a
 * stock photo of a stranger. Remote Vimeo thumbnails pass (they are frames of Mike's videos).
 */
export const isUnfitCover = (url: string | null | undefined) => {
  if (!url) return true;
  const b = base(url);
  return isTitleCard(url) || MONO.has(b) || STOCK.has(b);
};

/** Focal point for any known photo (by file), for crops that are not program covers. */
export const focalOf = (url: string | null | undefined, fallback = "50% 30%") => (url && focusOf(url)?.focal) || fallback;

/**
 * A photo for a slot: the given image when it is fit to be a cover, else the program's curated photo
 * of Mike. Use wherever stored media (program_media, offers, products) is shown as a picture.
 */
export function safePhoto(url: string | null | undefined, slug?: string | null, alt?: string | null): Cover {
  if (url && !isUnfitCover(url)) {
    const f = focusOf(url);
    return { src: url, alt: alt ?? f?.alt ?? "", focal: f?.focal ?? "50% 35%", focalPhone: f?.focalPhone ?? "50% 30%", fit: f?.fit };
  }
  return coverFor(slug ?? "kettlebell-lifestyle");
}

/**
 * The cover for a program: its own card/hero media unless that is a title card, else the program's
 * default photo, with the focal points for that file. `meta` (programs.meta.cover) can override
 * the focal points from Studio.
 */
export function coverFor(slug: string, mediaUrl?: string | null, meta?: { focal?: unknown; focal_phone?: unknown } | null): Cover {
  // The curated photo wins for known programs (client, Nov 20: the stored /media covers repeat the same
  // few gym frames). A Studio upload (remote storage URL, not a bundled /media file) still wins.
  const uploaded = mediaUrl && /^https?:/.test(mediaUrl) && !/vimeocdn/.test(mediaUrl) && !isUnfitCover(mediaUrl) ? mediaUrl : null;
  const own = mediaUrl && !isUnfitCover(mediaUrl) && !/vimeocdn/.test(mediaUrl) ? mediaUrl : null;
  const curated = programCover(slug);
  const src = uploaded ?? curated?.src ?? own ?? "/media/covers/kettlebell-lifestyle.jpg";
  const f = focusOf(src) ?? { alt: "", focal: "50% 35%", focalPhone: "50% 30%" };
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  // Studio focal points were set for the program's stored image; they only apply when that image is shown.
  const m = src === curated?.src && !uploaded ? null : meta;
  return { src, alt: f.alt, focal: str(m?.focal) ?? f.focal, focalPhone: str(m?.focal_phone) ?? f.focalPhone, fit: f.fit };
}

/** Mike's portrait for instructor lines. */
export const MIKE_FACE = "/media/summit/mike-face.png";

/** A program with no media of its own still has a curated photo. */
export const hasCover = (slug: string) => slug in BY_SLUG;
