# Summit design system

**Daylight, photo-led training with Mike.** Warm chalk ground, crisp white cards with real depth, Mike in full colour on every key screen, strong Archivo headlines, glacier blue for "do this", ember for progress — and every member is on a climb up Mount Shasta. Approved Nov 20 (spec 10); it **replaces Trace** entirely (Trace was rejected as washed out, glassy and "cyber").

Reference: `/gallery` (the whole system, light/dark switch at the top) and `/gallery/shell` (the shell with the approved Home composition). Approved mockups: `docs/design/summit/*.html` and `shots/*.png` (01 home desktop, 02 home phone, 03 program, 04 day (+dark), 05 catalog, 06 day phone, 07 day complete, 08 design system). Layouts follow the original app (`docs/specs/08-legacy-parity.md` §L); Summit is the visual language on top.

## Principles
1. **Mike leads.** Full-colour, warm photos of Mike on every key screen. Never tinted, graded, desaturated or washed out. One ink scrim for legible type, nothing else.
2. **Daylight surfaces.** Warm chalk ground, crisp white cards, three depth levels, strong contrast. Dark mode is warm ink and still photo-rich.
3. **Glass only on small overlays**: the phone tab bar, video controls, photo badges. Everything else is solid.
4. **Bold, legible type.** Archivo 800 at normal width for headlines and numbers; Inter for everything you read. Nothing stretched.
5. **Glacier + Ember.** Glacier blue = act (primary actions, links, selection). Ember = progress, streaks, achievement. Gold = medals only. Green = done. Ink for text.
6. **The Climb.** A level is a route up Mount Shasta: phases are camps, the last day is the summit, the member is marked on it.
7. **One obvious next step per screen** (usually "Start" or "Resume").
8. **Offers as the next camp.** Next programs appear tied to progress ("Beyond the summit"), with real value; contextual help can be a cross-sell. Never as ads.

## Tokens
Source: `packages/tokens/src/tokens.ts` → `pnpm --filter @ms/tokens build:css` → `tokens.css`. Never edit `tokens.css` or put raw colours in components. **Old names keep working**: every Liquid/Trace variable (`--bg`, `--label*`, `--fill*`, `--sep`, `--film`, `--ink*`, `--trace*`, `--glass-*`, `--ring-*`, `--t-*`, `--r-*`, `--dur-*` …) now resolves to a Summit value, so existing pages restyle without edits. New pages should prefer the Summit names below.

### Colour roles
| Summit role | Light | Dark | Old names mapped onto it |
| --- | --- | --- | --- |
| `--bg` | chalk `#F5F2EC` | warm ink `#101215` | `--ground`, `--exposure` |
| `--surface` | `#FFFFFF` | `#181B20` | `--bg-elev`, `--film`, `--glass-fill` |
| `--surface-2` | `#FBFAF7` | `#1D2127` | `--film-2` |
| `--surface-sunk` | `#F1EDE6` | `#14171B` | `--fill` (inputs, wells, tracks) |
| `--line` / `--line-strong` | `#E6E0D6` / `#D6CEC1` | `#2A2F37` / `#383E48` | `--sep`, `--rule`, `--edge`, `--trace-dim` |
| `--text` / `--text-2` / `--text-3` | ink 900 / 600 / 500 | `#F5F2EC` / `#B3B9C2` / `#858D98` | `--label*`, `--ink*` |
| `--accent` (glacier) | `#1A85D6` | `#3FA0E6` | `--trace`, `--ring-1`, `--focus` |
| `--accent-strong` / `-soft` / `-ink` | `#146CB4` / `#EEF6FD` / `#135690` | `#62B4EE` / 13% / `#8CCBF5` | `--accent-deep`, `--accent-hi` |
| `--warm` (ember) | `#F2632A` | `#FF7F3F` | `--ring-2` |
| `--warm-soft` / `--warm-ink` | `#FFF3EC` / `#A93C12` | 13% / `#FFB58C` | |
| `--ok` / `--ok-soft` | `#1F9D6A` / `#E5F5EE` | `#37C08A` / 14% | `--ring-3` |
| `--gold` | `#E8B43C` | same | medals only |

Palette scales (theme-independent): `--glacier-50…900`, `--ember-50…700`, `--ink-400…900`, `--chalk-0…300`, `--gold`, `--gold-50`.
Scrims (the only overlay on photos): `--scrim-left` (desktop heroes), `--scrim-bottom` (cards, phone), `--scrim-soft`. Photo glass: `--clear-fill`, `--clear-filter`. Tab bar glass: `--glass-bar`, `--glass-bar-edge`.
Ink panel: `.lq-night` / `Glass level="night"` stays dark in both themes (resume card, video, completion).
Illustration palette (flat daytime cut paper; owned by the illustrator, consumed by `components/graphics` and The Climb): `--fig-*`, `--sc-*` (sky, sun, mountain, snow, ridge, ground, tree) and the kept `--gfx-*` hooks.

### Elevation
`--sh-1` flat (lists, tiles) · `--sh-2` card (program cards, panels; the default `Glass`) · `--sh-3` hero (heroes, players, sheets, modals). Soft, short, real shadows — never glow. Primary buttons carry a coloured lift: `--sh-accent`, `--sh-warm`. Dark mode swaps them for inset highlights + deep shadows.

### Type
Self-hosted variable files in `apps/web/src/app/fonts/` loaded with `next/font/local` (preloaded, metric-matched Arial fallbacks → no layout shift). Variables `--ff-archivo` / `--ff-inter`; tokens build `--font-display` and `--font` on them. Anybody and Hanken Grotesk are removed.

| Class | Spec | Use |
| --- | --- | --- |
| `.lq-d-xxl` | Archivo 800 64/63, −3.5% | Hero titles |
| `.lq-d-xl` = `.lq-display` | 800 48/49, −3% | Page heroes |
| `.lq-d-lg` | 800 36/38 | Section heads |
| `.lq-d-md` | 750 26/29 | Card heads ("You're 38% of the way up.") |
| `.lq-d-sm` | 700 20/24 | Card titles |
| `.lq-d-xs` | 700 16/20 | Small titles |
| `.lq-t34 … .lq-t17` | Archivo 800–700 | Old scale names, kept |
| `.lq-lede` | Inter 16.5/26 | Intros |
| `.lq-t15` / `.lq-t13` / `.lq-t12` | Inter 400 15/22, 500 13.5/19, 600 12/15 | Body, meta, captions |
| `.lq-eyebrow` | Inter 650 11.5 caps, +9% | Eyebrows (`data-tone="accent|warm"`) |
| `.lq-dnum` / `StretchNumber` | Archivo 800 tabular | Numbers are heroes |

### Radii, space, layout
Radii 8 · 12 · 16 · 20 · 26 · 32 (`--r-xs … --r-2xl`); role names kept (`--r-card` 20, `--r-hero` 28, `--r-sheet` 28, `--r-control` 12). 4pt spacing `--s-1…--s-18`. Rail 264px, top bar 60px, announcement 40px, content max 1240px, phone tab bar 68px floating 12px in.

### Motion
| Name | Spec | Where |
| --- | --- | --- |
| Press | 80ms squeeze to 97%, spring back (`--curve-spring`) | Every button, tab, card (`.lq-press` + a global rule for buttons; plain links dim) |
| Rise | 600ms ease-out `(.2,.8,.2,1)`, 10px, 40ms stagger | `.lq-rise` / `[data-rise]` with `--i` |
| Fill | 700ms ease-out | Bars, rings, the climb route |
| Celebrate | 1.2s spring `(.34,1.56,.64,1)` | `Flare`, completion |
| Breathe | 4s loop | The "You" pin on the climb |
| Page | 220ms view transition | `PageTransition` (React `<ViewTransition>`): old page fades, new rises 6px; the shell stays |
Everything is off under `prefers-reduced-motion`.

## Primitives (`components/ui`, APIs unchanged, props only added)
- **Button** — `filled` glacier primary (the one action) · `warm` ember (resume/progress) · `ink` · `glass`/`secondary` white + hairline · `ghost` accent text · `tint` accent wash · `fill` sunk · `plain` link · `white`/`onphoto` over photos. Sizes `xs sm md lg`. `streak` is accepted and ignored.
- **IconButton** — round white + hairline; `fill`, `plain`, `accent`, `clear` (glass on photos).
- **Chip** — sunk + hairline; `tint/accent`, `warm`, `ok`, `solid`, `ink`, `outline`, `clear` (photo badge); `size="sm"`. **Tag** (new) — uppercase label: `CONTINUE` (warm), `BEST NEXT STEP` (accent), `NEW BADGE` (gold), `light`.
- **Glass** — the Summit surface: `regular` white card (sh-2), `thick` floating panel (solid, sh-3), `clear`/`clear-deep` glass over photos, `night` ink panel.
- **Segmented** — sunk track, white pill with sh-2. **Toggle** — glacier track, white knob.
- **ProgressBar** — 8px sunk track, glacier gradient; `tone="warm|ok|white"`, `size="thin"`. **StepSegments** — step dots (done green, now ember). **Rings** — hairline track + round-capped arc; tones 1 glacier, 2 ember, 3 green; `onPhoto`.
- **Card / Poster / HeroPhoto** — full colour (`grade="none"` default; every grade now renders as shot), ink scrim, white footer. **AmbientBackdrop** is retired (renders nothing).
- **Sheet** — solid surface, sh-3, sunk grabber. **Toast** — ink pill. **Skeleton** — sunk with a soft shimmer; `shape="card"` is a white card.
- **Icon** — Lucide geometry (same family as the original app) + the kettlebell; names stable, new: `home`, `account`, `retreats`, `tools`, `coaching`, `gift`, `shop`, `grid`, `arrowRight`, `chevronUp`, `trophy`, `medal`, `dumbbell` ….

## Signature (`components/signature`)
- **Climb** — the Mount Shasta route: phases → camps, summit flag, dotted path ahead, "You · Day N" pin with a breathing ring, camp labels. Art is clean swappable SVG layers (`CLIMB_LAYERS`: sky, range, mountain, snow, ground, trees); the illustrator replaces any layer via the `art` prop without touching route/camps/labels.
- **PhotoHero** — full-colour hero with one scrim (`left|bottom|soft|none`, phone override) and a **focal point** (`focal`, `focalPhone` → object-position; `fit="contain"` when a crop would cut a face). Fixed box → zero layout shift.
- **NextStepCard** — one obvious next step (photo, tag, title, meta, optional progress, one CTA).
- **BeyondTheSummit** — progress-tied next programs ("peaks": Level II, MTK, retreats) with tag/badge and quiet locked state.
- **StreakChip**, **WeekDots** — ember streak chip; seven day dots (done ember ✓, today ember ring with date).
- Trace names keep compiling, restyled: `TraceLine` (solid route + dotted ahead), `SwingRibbon` (day progress by phase), `WeekTrace` (day dots), `LightPill` (= primary Button; `tone="ember"`), `OrbitLoader` (spinner), `Flare` (ember burst), `StretchNumber` (Archivo 800 count-up), `PhotoGrade` (full colour), `TraceRule`/`TraceDash`. `StarTrails`, `SnowContours`, `LivingBackdrop` render nothing.

## Shell (`components/shell`, legacy L0)
- **Desktop rail** (264px, white): wordmark (bell mark tile + MIKE SALEMI) → **resume card** (photo, "UP NEXT · LEVEL I", day title, meta, % ring) → Home `/today`, Programs `/programs`, Retreats `/experiences` (Apply chip), Library `/library`, Schedule `/plan`, Account `/you` → **Your access** (program thumbnails) → **Additional** (collapsible: Tools `/tools`, Coaching `/coaching`, Referrals `/you/referrals` "Earn a free month" (only the inviter is rewarded), Shop `/shop` when `site_settings.shop.enabled`, always for admins with an "Admin" chip) → member + theme toggle (sticky at the bottom).
- **Top bar** (sticky, blurred chalk): avatar, greeting + date in the member's time, search (⌘K → Library search), streak chip, notifications. **Announcement bar** above it (first live `notices` banner).
- **Phone**: header (bell mark, date over greeting, streak, avatar), the announcement as an ink card, and the floating **glass tab bar** Home / Programs / Profile / More (More opens a sheet with the rest + appearance).
- **Data**: `lib/loaders/shell.ts` — the resume card and access list come from ONE RPC (`my_enrollments`) in parallel with the profile and the banner; the streak (`my_rewards`) streams in under `<Suspense>` with a reserved slot. Photos per program: `lib/program-photos.ts` (no baked-in text, focal points).
- **Focus mode**: full-screen players (`.kd-day`, or any `[data-shell-focus]`) hide the rail, bars and header.
- Navigation lists live in `lib/nav.ts` (`NAV`, `ADDITIONAL`, `SHOP`, `PHONE_TABS`, `activeHref`).

## Smoothness
- `loading.tsx` in every `(app)` segment (shared `PageSkeleton` in the shape of the coming page) → instant feedback on every tap.
- All shell links `prefetch`; Library search prefetches on focus.
- Press feedback on every interactive element (global rule + `.lq-press`); a 3px glacier route-progress bar while a route loads.
- View transitions between pages (`PageTransition`); the shell never re-renders on navigation.
- No layout shift: `next/font` fallbacks, fixed image boxes (`fill` in sized frames, `aspect-ratio`), reserved streak slot.

## Rules for pages
- One primary (glacier) action per screen; ember for resume/progress actions.
- Photos: never grade, tint or blur; set a focal point; no cover images with baked-in text (use `lib/program-photos.ts`).
- No glass except tab bar, video controls and photo badges. No glows. No stretched type.
- Light + dark, phone (390) + desktop (1440) screenshots before shipping.

## Measurements (Lighthouse, production build, Nov 20)
Performance score · LCP · TBT · CLS, before (Trace, `v2` b55e533) → after (Summit). Mobile = Lighthouse default throttling.

| Page | Desktop | Mobile |
| --- | --- | --- |
| `/gallery/shell` (shell + Home) | 98 · 1.1s · 60ms · 0.001 → **99 · 0.8s · 90ms · 0** | 57 · 4.3s · 1970ms · 0.006 → **91 · 3.1s · 190ms · 0** |
| `/signin` | 100 · 0.7s · 0ms · 0 → **99 · 0.9s · 0ms · 0** | 91 · 3.3s · 130ms · 0 → **91 · 2.9s · 230ms · 0** |
| `/gallery` | 100 · 0.7s · 60ms · 0 → **100 · 0.8s · 10ms · 0** | 96 · 2.4s · 160ms · 0 → **84 · 3.7s · 270ms · 0** (the new sheet leads with photography; LCP is Mike's photo instead of text) |

Member pages need Supabase and cannot be measured in the sandbox; they share the shell measured on `/gallery/shell`.
