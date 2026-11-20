# Photo sources and assignments (spec 11, item 16)

One map: `apps/web/src/lib/photos.ts` (`PHOTO` library, `PROGRAM_COVER`, `SURFACE`).
`lib/covers.ts` (`coverFor`, `safePhoto`, `focalOf`), `lib/program-photos.ts` (`programPhoto`, `PROGRAM_PHOTOS`) and the public site's `components/discover/public/photos.ts` (`photoFor`) all read from it. Exported names and shapes did not change.

Contact sheet (each photo with its wide 16:10 crop and its tall phone crop, using the set focal points): `docs/screenshots/imagery/contact-sheet.jpg`.

## What changed
- Every program now has its own photo; before, six gym frames repeated across programs, the rail and Home (for example the get-up was both A4L and Zen Savage, the coaching shot was both Coaching and Executive Edge, and `tgk.jpg` was both The Path and Grounded King).
- Added photos that were in the repo but never used as covers: the swing in the Red Dot gym, the studio hinge, the Bulgarian bag squat, the valley at first light, the retreat conversation circle, the walk across the land, the group on the land and the sweat-lodge group.
- Removed stock photos of places that are not Mike's (`summit-clouds.jpg` alpine sea of clouds, and the `retreats/online/*` landscapes) from cover use. Zen Savage used the stock alpine photo; it now uses Mike's Turkish get-up. The landing page's closing photo (`PHOTOS.summitClouds` key, kept) is now the Men of Movement group.
- For known programs, the curated photo now wins over the `/media/covers/*` and `/media/l5e/*` files stored in `program_media`. A Studio upload (a remote storage URL) still wins. Studio focal points (`programs.meta.cover`) apply only when that stored image is the one shown.

## Assignments
| Surface | Photo (key) | File | Source |
|---|---|---|---|
| Kettlebell Lifestyle, Home hero, auth hero | standing | /media/summit/mike-standing.jpg | Mike's Red Dot gym shoot |
| Mastering the Kettlebell | squat | /media/summit/mike-squat.jpg | Red Dot gym shoot |
| Athleticism 4 Life | bag | /media/l5e/f9cc…/athleticism-4-life.png | Old app's program art (text-free frame) |
| Working-In | workingIn | /media/summit/working-in.jpg | Working-In course (Mike and Paul Chek) |
| Zen Savage | getup | /media/summit/mike-getup.jpg | Red Dot gym shoot |
| The Path to Inspired Action | valley | /media/l5e/16aa…/path-to-inspired-action.png | Old app's program art (text-free) |
| The Grounded King | breathwork | /media/summit/tgk.jpg | Men of Movement retreat |
| Men of Movement (pre-retreat prep) | walk | /media/retreats/live/tims-land.jpg | Men of Movement retreat |
| Men of Movement Retreats, retreats surface | summitGroup | /media/retreats/summit-group.jpg | Men of Movement retreat, Mount Shasta |
| Free 6-video mini-series | swingGym | /media/l5e/d44b…/free-6-video-kettlebell-mini-series.png | Old app's program art (text-free) |
| What your swing is missing | hinge | /media/l5e/925a…/what-your-kettlebell-swing-is-missing.png | Old app's program art (text-free) |
| Kettlebell Roadmap | goblet | /media/summit/mike-goblet.jpg | Studio shoot |
| Coaching (1:1) | coaching | /media/summit/mike-coaching.jpg | Red Dot gym shoot |
| Executive Edge | conversation | /media/retreats/trail-walk.jpg | Men of Movement retreat |
| Home empty state | press | /media/summit/mike-press.jpg | Red Dot gym shoot |
| You | groupLand | /media/retreats/live/group-tims-land.jpg | Men of Movement retreat |
| Empty states | facingShasta | /media/retreats/live/facing-shasta.png | Men of Movement retreat |
| Error states | ridgeCircle | /media/retreats/ridge-circle.jpg | Men of Movement retreat |
| Rewards | sweatLodge | /media/retreats/live/after-sweat-lodge.jpg | Men of Movement retreat |
| Library only (unassigned) | windmill, deadlift, qiGong, meals, fire, maloca | /media/summit/*, /media/retreats/live/* | as above |

## New photos from Mike's websites: blocked in this session
The brief asked for new photos from Mike's sites, referenced by their public CDN URLs. That was not possible here:
- The sandbox network blocks Mike's sites and CDNs (mikesalemi.com, kettlebelllifestyle.com, cloudfront, vimeocdn, supabase): the proxy returns 403.
- WebFetch returns page text without image URLs, could not read robots.txt on mikesalemi.com, and errors on image files, so no remote photo could be looked at or checked for baked-in text, logos or crops.
- Creating a Vercel Sandbox to download and inspect the images was refused by the permission system.
- The only listing that loaded, the WordPress media library at app.kettlebelllifestyle.com/wp-json/wp/v2/media, holds title cards (phase overviews, numbered banners), not photographs.

No unverified remote image is wired in, and `next.config` `images.remotePatterns` is unchanged. To add photos from Mike's sites: put the files in `apps/web/public/media/mike/` (or give their CDN host) and add entries to `PHOTO` in `lib/photos.ts`. Each `Photo` has a `fallback` field for a local stand-in if a remote `src` fails.

## Hard-coded photo paths outside the map (owners: please switch to `surfacePhoto()`/`photo()`)
- `components/training/ProgramView.tsx` (KBL hero windmill, next-step cards), `DayPlayer.tsx`, `model.ts`: journeys-a / kbl
- `app/(app)/coaching/page.tsx`, `components/experiences/CoachingStory.tsx`: `/media/summit/breathwork.jpg` is the same photo as Grounded King's `tgk.jpg`
- `app/(app)/experiences/page.tsx`, `components/experiences/RetreatPage.tsx`: retreat galleries
- `components/discover/library/model.ts` `MOVE_PHOTOS`, `components/discover/tools/meta.ts`, `app/(app)/tools/page.tsx`: library
- `components/today/TodayScreen.tsx` heroes force `focal: "62% 26%"`, which overrides the map's focal point; `buildHome.ts` hard-codes the get-up for KBL Level II
- `app/page.tsx` (landing): the hero `PHOTOS.hero` and the KBL program tile (`photoFor`) are the same photo
