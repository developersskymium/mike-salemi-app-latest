/**
 * Program covers (Summit rule: no cover with baked-in text, nothing important cropped).
 *
 * Every cover is a text-free, full-colour photo. Each one carries a focal point (CSS object-position)
 * for wide crops (cards 16:10, heroes) and a second one for tall phone crops, so Mike's face and the
 * bell never fall outside the frame. Title-card artwork (the old covers with lettering) is never used
 * as a cover; covers that used to be title cards now point at /media/covers/* (migration 0019).
 */
export type Cover = { src: string; alt: string; focal: string; focalPhone: string; fit?: "cover" | "contain" };

type Focus = Omit<Cover, "src">;

/** Focal points by file (basename): the same photo is framed the same way everywhere. */
const FOCUS: Record<string, Focus> = {
  "mastering-the-kettlebell.jpg": { alt: "Mike Salemi in a racked kettlebell squat", focal: "50% 38%", focalPhone: "46% 30%" },
  "working-in.jpg": { alt: "Paul Chek and Mike Salemi leading a Working In session", focal: "42% 30%", focalPhone: "30% 28%" },
  "zen-savage.jpg": { alt: "Mike Salemi in a Turkish get-up", focal: "45% 30%", focalPhone: "40% 26%" },
  "coaching.jpg": { alt: "Mike Salemi coaching a member through a kettlebell drill", focal: "42% 30%", focalPhone: "38% 26%" },
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
  "mike-standing.jpg": { alt: "Mike Salemi in the gym with a kettlebell", focal: "62% 28%", focalPhone: "62% 24%" },
};

/** Default cover per program (used when a program has no media yet, and in preview mode). */
const BY_SLUG: Record<string, string> = {
  "kettlebell-lifestyle": "/media/covers/kettlebell-lifestyle.jpg",
  "mastering-the-kettlebell": "/media/covers/mastering-the-kettlebell.jpg",
  "working-in": "/media/covers/working-in.jpg",
  "zen-savage": "/media/covers/zen-savage.jpg",
  coaching: "/media/covers/coaching.jpg",
  "executive-edge": "/media/covers/coaching.jpg",
  "athleticism-4-life": "/media/l5e/f9cc9459-fd95-4602-9ba0-1137217fdbfa/athleticism-4-life.png",
  "what-your-kettlebell-swing-is-missing": "/media/l5e/925ade4e-a748-4805-9745-bec41aaeb8d5/what-your-kettlebell-swing-is-missing.png",
  "free-6-video-kettlebell-mini-series": "/media/l5e/d44b5ed0-8c18-4ebc-8f7d-1113a79eee1d/free-6-video-kettlebell-mini-series.png",
  "kettlebell-roadmap": "/media/l5e/56d44c1a-3caf-4646-83a3-2e4169771e25/kettlebell-roadmap.png",
  "the-path-to-inspired-action": "/media/l5e/16aadc2c-a37d-488e-9a9e-0e1ddc6a51ec/path-to-inspired-action.png",
  "men-of-movement": "/media/l5e/54062bc2-c7f2-45a2-b97a-79f0ad066ba7/men-of-movement.png",
  "the-grounded-king": "/media/l5e/4d58243d-0c93-4bb6-8011-a1928d2004d0/tgk.jpg",
  "men-of-movement-retreats": "/media/retreats/mom-cover.jpg",
};

/** Old title-card files (lettering baked in). They may appear as artwork, never as a cover. */
const TITLE_CARDS = new Set(["mastering-the-kettlebell.png", "working-in.png"]);

const base = (url: string) => url.split("?")[0]!.split("/").pop() ?? "";

/** True for an image that has text baked in (a title card). */
export const isTitleCard = (url: string | null | undefined) => Boolean(url && url.startsWith("/media/l5e/") && TITLE_CARDS.has(base(url)));

/**
 * The cover for a program: its own card/hero media unless that is a title card, else the program's
 * default photo, with the focal points for that file. `meta` (programs.meta.cover) can override
 * the focal points from Studio.
 */
export function coverFor(slug: string, mediaUrl?: string | null, meta?: { focal?: unknown; focal_phone?: unknown } | null): Cover {
  const own = mediaUrl && !isTitleCard(mediaUrl) && !/vimeocdn/.test(mediaUrl) ? mediaUrl : null;
  const src = own ?? BY_SLUG[slug] ?? "/media/covers/kettlebell-lifestyle.jpg";
  const f = FOCUS[base(src)] ?? { alt: "", focal: "50% 35%", focalPhone: "50% 30%" };
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { src, alt: f.alt, focal: str(meta?.focal) ?? f.focal, focalPhone: str(meta?.focal_phone) ?? f.focalPhone, fit: f.fit };
}

/** Mike's portrait for instructor lines. */
export const MIKE_FACE = "/media/summit/mike-face.png";

/** A program with no media of its own still has a curated photo. */
export const hasCover = (slug: string) => slug in BY_SLUG;
