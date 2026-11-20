/**
 * THE photo map (spec 11, item 16): every photo of Mike and the retreats the app may show, each with
 * its framing, and which photo goes on which surface. `lib/covers.ts`, `lib/program-photos.ts` and
 * the public site's `discover/public/photos.ts` all read from here, so a change here reaches every
 * page that asks for a program cover or a surface photo.
 *
 * Rules (Summit principle 1 + client feedback, Nov 20):
 * - Full-colour photographs only. No title cards, no lettering or logos baked in, no stock photos of
 *   strangers, no black-and-white.
 * - Every program and surface gets a DIFFERENT photo, so the catalog grid and Home never show the
 *   same shot twice (the old map reused six gym frames everywhere).
 * - `focal` = object-position for wide crops (16:10 cards, 1440px heroes), `focalPhone` = for tall /
 *   narrow crops (390px). Both sit on the face (or the group's faces) so heads are never cut.
 * - `aspect` = the native ratio, so a frame can choose `contain` when its box is much taller.
 *
 * Sources: Mike's own shoots (Red Dot gym, studio), the Men of Movement retreats on Mount Shasta and
 * the old app's program art (text-free frames only). See docs/design/photo-sources.md.
 */
export type Photo = {
  src: string;
  alt: string;
  /** object-position for wide crops. */
  focal: string;
  /** object-position for tall phone crops. */
  focalPhone: string;
  /** native width / height. */
  aspect: number;
  /** Local stand-in used if `src` is ever remote and fails to load. */
  fallback?: string;
};

const S = (f: string) => `/media/summit/${f}`;
const R = (f: string) => `/media/retreats/${f}`;
const L = (f: string) => `/media/retreats/live/${f}`;
const E = (id: string, f: string) => `/media/l5e/${id}/${f}`;
/** Mike's own site (mikesalemi.io) media CDN — served through next/image (remotePatterns). */
const W = (f: string) => `https://assets.cdn.filesafe.space/UighMD1kAbJoZtbTe7zW/media/${f}`;

/** The library: one entry per distinct photograph (duplicates in /public are aliased in covers.ts). */
export const PHOTO = {
  // Gym and studio: training
  standing: { src: S("mike-standing.jpg"), alt: "Mike Salemi standing in his gym with a kettlebell at his feet", focal: "54% 24%", focalPhone: "53% 20%", aspect: 1.32 },
  windmill: { src: S("mike-windmill.jpg"), alt: "Mike Salemi in a kettlebell windmill", focal: "70% 38%", focalPhone: "70% 36%", aspect: 1.79 },
  press: { src: S("mike-press.jpg"), alt: "Mike Salemi pressing a kettlebell overhead", focal: "60% 14%", focalPhone: "58% 14%", aspect: 0.9 },
  squat: { src: S("mike-squat.jpg"), alt: "Mike Salemi in a racked kettlebell squat", focal: "42% 8%", focalPhone: "44% 10%", aspect: 1.08 },
  deadlift: { src: S("mike-deadlift.jpg"), alt: "Mike Salemi setting up a kettlebell deadlift", focal: "45% 6%", focalPhone: "45% 8%", aspect: 0.97 },
  getup: { src: S("mike-getup.jpg"), alt: "Mike Salemi in a Turkish get-up", focal: "33% 32%", focalPhone: "33% 30%", aspect: 0.92 },
  goblet: { src: S("mike-goblet.jpg"), alt: "Mike Salemi holding a kettlebell at his chest in a wide stance", focal: "50% 12%", focalPhone: "50% 12%", aspect: 1.13 },
  swingGym: { src: E("d44b5ed0-8c18-4ebc-8f7d-1113a79eee1d", "free-6-video-kettlebell-mini-series.png"), alt: "Mike Salemi coaching a kettlebell swing in the gym", focal: "42% 14%", focalPhone: "42% 14%", aspect: 1 },
  hinge: { src: E("925ade4e-a748-4805-9745-bec41aaeb8d5", "what-your-kettlebell-swing-is-missing.png"), alt: "Mike Salemi hinging to pick up a kettlebell", focal: "60% 12%", focalPhone: "62% 12%", aspect: 1 },
  bag: { src: E("f9cc9459-fd95-4602-9ba0-1137217fdbfa", "athleticism-4-life.png"), alt: "Mike Salemi squatting with a Bulgarian bag", focal: "70% 30%", focalPhone: "72% 30%", aspect: 1 },
  // Coaching and teaching
  coaching: { src: S("mike-coaching.jpg"), alt: "Mike Salemi coaching a member through a kettlebell drill", focal: "28% 20%", focalPhone: "30% 18%", aspect: 0.96 },
  workingIn: { src: S("working-in.jpg"), alt: "Paul Chek and Mike Salemi teaching a Working In session", focal: "40% 30%", focalPhone: "30% 28%", aspect: 1.86 },
  conversation: { src: R("trail-walk.jpg"), alt: "Men talking together in a circle at a Men of Movement retreat", focal: "50% 42%", focalPhone: "55% 40%", aspect: 1.5 },
  // Outdoors and retreats
  breathwork: { src: S("tgk.jpg"), alt: "Men breathing together on the grass", focal: "55% 45%", focalPhone: "62% 44%", aspect: 1.5 },
  qiGong: { src: L("qi-gong.png"), alt: "Morning movement practice on the rocks below Mount Shasta", focal: "58% 50%", focalPhone: "56% 50%", aspect: 1.87 },
  summitGroup: { src: R("summit-group.jpg"), alt: "Men of Movement on a ridge in front of Mount Shasta", focal: "50% 55%", focalPhone: "50% 56%", aspect: 1.5 },
  ridgeCircle: { src: R("ridge-circle.jpg"), alt: "The group standing in a circle on the ridge at first light", focal: "50% 50%", focalPhone: "30% 55%", aspect: 1.33 },
  walk: { src: L("tims-land.jpg"), alt: "The men walking single file across open land", focal: "60% 50%", focalPhone: "62% 50%", aspect: 1.33 },
  facingShasta: { src: L("facing-shasta.png"), alt: "A man looking out toward Mount Shasta", focal: "52% 20%", focalPhone: "52% 22%", aspect: 0.78 },
  valley: { src: E("16aadc2c-a37d-488e-9a9e-0e1ddc6a51ec", "path-to-inspired-action.png"), alt: "A man looking out over the valley as the light breaks through", focal: "45% 38%", focalPhone: "45% 38%", aspect: 1 },
  groupLand: { src: L("group-tims-land.jpg"), alt: "Men of Movement together on the land", focal: "50% 36%", focalPhone: "50% 36%", aspect: 1.33 },
  sweatLodge: { src: L("after-sweat-lodge.jpg"), alt: "The group together after the sweat lodge", focal: "50% 52%", focalPhone: "45% 52%", aspect: 1.33 },
  meals: { src: L("shared-meals.png"), alt: "Shared meals at the retreat", focal: "50% 30%", focalPhone: "50% 32%", aspect: 1.5 },
  fire: { src: L("fire.jpg"), alt: "Men around the fire at night", focal: "50% 55%", focalPhone: "50% 55%", aspect: 1.33 },
  maloca: { src: L("maloca.jpg"), alt: "Inside the maloca at the retreat venue", focal: "50% 55%", focalPhone: "50% 55%", aspect: 0.75 },
  // From mikesalemi.io (Nov 20): training, coaching and retreat moments not in the old app.
  bagSpin: { src: W("692854bb354d2b20f4843699.jpg"), alt: "Mike Salemi spinning a Bulgarian bag in the gym", focal: "52% 30%", focalPhone: "52% 30%", aspect: 1.5, fallback: E("f9cc9459-fd95-4602-9ba0-1137217fdbfa", "athleticism-4-life.png") },
  certificate: { src: W("6929df9a999333197b0ec84b.jpg"), alt: "Mike Salemi presenting a certificate to a coach", focal: "48% 24%", focalPhone: "56% 22%", aspect: 1.5, fallback: S("mike-coaching.jpg") },
  overlook: { src: W("67fc786971384b2381b4546b.jpeg"), alt: "Two men watching the sun set over the high desert", focal: "45% 55%", focalPhone: "45% 55%", aspect: 0.75, fallback: L("facing-shasta.png") },
  celebration: { src: W("69196d5b12b5eb1378df1576.jpg"), alt: "Men celebrating together at a Men of Movement retreat", focal: "45% 30%", focalPhone: "40% 28%", aspect: 1.5, fallback: L("group-tims-land.jpg") },
  groupGrass: { src: W("6a0a414eea36308bcf882705.jpg"), alt: "The Men of Movement group together on the grass", focal: "50% 48%", focalPhone: "50% 48%", aspect: 1.33, fallback: L("group-tims-land.jpg") },
  lodge: { src: W("6a0a0a870a69f1e766ce6a3a.jpg"), alt: "The men gathered inside the round lodge", focal: "50% 50%", focalPhone: "50% 50%", aspect: 0.75, fallback: L("maloca.jpg") },
  forestWalk: { src: W("6a0b71b42e98e28fa1ad5cbb.jpg"), alt: "Men walking barefoot along a forest trail", focal: "50% 45%", focalPhone: "50% 45%", aspect: 0.75, fallback: L("tims-land.jpg") },
  brothers: { src: W("6942ff803bbe75e93d1190b9.png"), alt: "Mike Salemi smiling with men from the retreat", focal: "50% 35%", focalPhone: "50% 35%", aspect: 1.5, fallback: L("group-tims-land.jpg") },
} satisfies Record<string, Photo>;

export type PhotoName = keyof typeof PHOTO;

/**
 * Program covers: one distinct photo per program (no two programs share a shot, so the catalog,
 * the rail's access list and Home never repeat a photo).
 */
export const PROGRAM_COVER: Record<string, PhotoName> = {
  "kettlebell-lifestyle": "standing",
  "mastering-the-kettlebell": "squat",
  "athleticism-4-life": "bagSpin",
  "working-in": "workingIn",
  "zen-savage": "getup",
  "the-path-to-inspired-action": "valley",
  "the-grounded-king": "breathwork",
  "men-of-movement": "forestWalk",
  "men-of-movement-retreats": "summitGroup",
  "free-6-video-kettlebell-mini-series": "swingGym",
  "what-your-kettlebell-swing-is-missing": "hinge",
  "kettlebell-roadmap": "goblet",
  coaching: "coaching",
  "executive-edge": "overlook",
};

/** Surfaces that are not a single program. Different from each other and from the covers they sit next to. */
export const SURFACE: Record<"authHero" | "homeHero" | "homeEmpty" | "retreats" | "coaching" | "executiveEdge" | "you" | "empty" | "error" | "rewards", PhotoName> = {
  authHero: "standing",
  homeHero: "standing",
  homeEmpty: "press",
  retreats: "summitGroup",
  coaching: "coaching",
  executiveEdge: "overlook",
  you: "celebration",
  empty: "facingShasta",
  error: "ridgeCircle",
  rewards: "certificate",
};

export const photo = (name: PhotoName): Photo => PHOTO[name];
export const programCover = (slug: string | null | undefined): Photo | null => (slug && PROGRAM_COVER[slug] ? PHOTO[PROGRAM_COVER[slug]] : null);
export const surfacePhoto = (s: keyof typeof SURFACE): Photo => PHOTO[SURFACE[s]];

const base = (url: string) => url.split("?")[0]!.split("/").pop() ?? "";
const BY_FILE: Record<string, Photo> = Object.fromEntries(Object.values(PHOTO).map((p) => [base(p.src), p]));
/** Framing for a known file (any folder: the same photo is framed the same way everywhere). */
export const photoByFile = (url: string | null | undefined): Photo | null => (url ? BY_FILE[base(url)] ?? null : null);
