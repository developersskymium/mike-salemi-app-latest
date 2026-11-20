/**
 * Photography for the public site: full-colour photos of Mike and the retreats, no baked-in text,
 * each with a focal point (object-position) for wide crops and one for tall phone crops, so faces
 * never fall out of frame.
 */
export type PubPhoto = { src: string; alt: string; focal: string; focalPhone?: string; /** Large landscape original: safe as a full-bleed background. */ wide?: boolean };

const S = (f: string) => `/media/summit/${f}`;
const R = (f: string) => `/media/retreats/live/${f}`;

export const PHOTOS = {
  hero: { src: S("mike-standing.jpg"), alt: "Mike Salemi standing in his gym with a kettlebell", focal: "64% 30%", focalPhone: "66% 24%", wide: true },
  windmill: { src: S("mike-windmill.jpg"), alt: "Mike in a kettlebell windmill", focal: "50% 35%", focalPhone: "52% 40%", wide: true },
  deadlift: { src: S("mike-deadlift.jpg"), alt: "Mike demonstrating a kettlebell deadlift", focal: "50% 30%" },
  getup: { src: S("mike-getup.jpg"), alt: "Mike in a Turkish get-up", focal: "50% 30%" },
  goblet: { src: S("mike-goblet.jpg"), alt: "Mike holding a kettlebell at the chest", focal: "48% 30%" },
  press: { src: S("mike-press.jpg"), alt: "Mike pressing a kettlebell overhead", focal: "50% 25%" },
  squat: { src: S("mike-squat.jpg"), alt: "Mike in a goblet squat", focal: "50% 30%" },
  coaching: { src: S("mike-coaching.jpg"), alt: "Mike coaching a member through a kettlebell get-up", focal: "40% 30%" },
  face: { src: S("mike-face.png"), alt: "Mike Salemi", focal: "50% 40%" },
  workingIn: { src: S("working-in.jpg"), alt: "Mike and Paul Chek teaching Working In", focal: "50% 35%" },
  summitGroup: { src: S("summit-group.jpg"), alt: "Men of Movement on a ridge facing Mount Shasta", focal: "50% 55%", wide: true },
  ridgeCircle: { src: S("ridge-circle.jpg"), alt: "The group standing in a circle on the ridge", focal: "50% 50%", wide: true },
  shastaRidge: { src: S("shasta-ridge.jpg"), alt: "Morning practice on the rocks below Mount Shasta", focal: "60% 50%", wide: true },
  summitClouds: { src: S("summit-clouds.jpg"), alt: "Peaks above a sea of clouds at sunrise", focal: "50% 45%", wide: true },
  fire: { src: R("fire.jpg"), alt: "Men around the fire at night", focal: "50% 55%", wide: true },
  sweatLodge: { src: R("after-sweat-lodge.jpg"), alt: "The group together after the sweat lodge", focal: "50% 45%", wide: true },
  timsLand: { src: R("tims-land.jpg"), alt: "Walking single file across open land", focal: "50% 55%", wide: true },
  groupLand: { src: R("group-tims-land.jpg"), alt: "Men of Movement group photo on the land", focal: "50% 45%", wide: true },
  meals: { src: R("shared-meals.png"), alt: "Shared meals at the retreat", focal: "50% 45%", wide: true },
  breathwork: { src: R("breathwork.jpg"), alt: "Resting after a breathwork session", focal: "50% 50%" },
  maloca: { src: R("maloca.jpg"), alt: "Inside the maloca at the retreat venue", focal: "50% 60%" },
  facingShasta: { src: R("facing-shasta.png"), alt: "A man looking out toward Mount Shasta", focal: "50% 40%" },
} satisfies Record<string, PubPhoto>;

export type PhotoKey = keyof typeof PHOTOS;

/** Program slug → photo (no baked-in text). */
const BY_SLUG: Record<string, PhotoKey> = {
  "kettlebell-lifestyle": "hero",
  "mastering-the-kettlebell": "deadlift",
  "athleticism-4-life": "getup",
  "working-in": "workingIn",
  "the-path-to-inspired-action": "ridgeCircle",
  "the-grounded-king": "ridgeCircle",
  "men-of-movement": "facingShasta",
  "men-of-movement-retreats": "summitGroup",
  "what-your-kettlebell-swing-is-missing": "goblet",
  "free-6-video-kettlebell-mini-series": "press",
  "kettlebell-roadmap": "squat",
  coaching: "coaching",
  "executive-edge": "shastaRidge",
  "zen-savage": "summitClouds",
};

export function photoFor(slug: string | null | undefined): PubPhoto {
  return PHOTOS[(slug && BY_SLUG[slug]) || "hero"];
}

/** focal points as CSS custom properties for .pub-photo frames. */
export const focalVars = (p: PubPhoto) => ({ "--focal": p.focal, "--focal-phone": p.focalPhone ?? p.focal }) as React.CSSProperties;
