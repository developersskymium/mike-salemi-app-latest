# Liquid design system

Mike's photography fills the screen; controls float above it as glass. The UI itself is monochrome (white and graphite glass, true neutrals). Colour comes from the photos. The accent, **Glacier blue**, marks only the one primary action on a screen and "now" states (today, the current step, live).

Reference: `/gallery` (every primitive, both themes) and `/gallery/shell` (the shell with a Today composition). Approved mockup: `/home/claude/design/directions/liquid/` (Ahmed's changes override it: less colour, almost no shadow, Glacier instead of Alpenglow, more micro-interactions).

## Tokens
- Source of truth: `packages/tokens/src/tokens.ts`. Edit it, then run `pnpm --filter @ms/tokens build:css` to regenerate `tokens.css`. Never edit `tokens.css` by hand, and never put raw colours, radii, blurs or shadows in components.
- CSS variables (selected): `--bg --bg-elev --label --label-2 --label-3 --sep --fill --fill-2 --track`, `--accent --accent-hi --accent-deep --accent-ink --accent-soft --on-accent`, `--ring-1..3(-hi)`, glass recipe `--glass-fill --glass-filter --glass-rim --glass-hl --glass-edge --glass-thick --glass-thick-filter --glass-solid`, clear glass `--clear-*`, `--float-shadow`, type `--t-34` … `--t-10` (plus `-size -line -weight -track`), radii `--r-*`, spacing `--s-*`, motion `--curve-* --dur-*`, layers `--z-*`.
- Tailwind maps the same tokens (`bg-bg`, `text-label-2`, `bg-accent`, `text-34`, `rounded-card`, `shadow-float`, `ease-spring` …). Utilities follow the theme automatically.
- Themes: `<html data-theme="system|light|dark">`. The cookie `ms-theme` is applied by an inline script before first paint; the member's choice is saved in `profiles.preferences.theme` (`ThemeSwitch` in `components/shell`). Any element can force a theme with `data-theme`.
- Type: Apple system font on Apple devices, self-hosted Inter (optical sizes) elsewhere. iOS scale: 34 Large Title, 28, 22, 17 Headline, 15 Body, 13 Footnote, 11/10 captions. Tabular figures for numbers (`lq-num`).

## Primitives (`@/components/ui`)
| Use | Primitive |
| --- | --- |
| Any floating surface | `Glass` level `regular` (cards, bars), `thick` (sheets, tables), `clear` / `clear-deep` (over photos, white content). `interactive` adds press, sweep and cursor specular; `float` adds the one float shadow; `tint` colours the fill. |
| The one primary action | `Button` variant `filled`. Secondary: `glass`, `fill`. Over photos: `white`. Tertiary: `tint`, `plain`. Sizes `lg` 52, `md` 44, `sm` 36. `href` renders a Link. |
| Completing a step | `CompleteButton`: spring press, the check draws itself, soft pulse and haptic tick. |
| Icon-only control | `IconButton` (circular glass, `label` required). `Icon` for the SF-like set (`ICON_NAMES`). |
| Filters, options | `Chip` (`score` badge, `dot`), `Segmented` (lens slides and stretches; arrow keys), `Toggle` (iOS switch, squash and stretch). |
| Progress | `Rings` (tone 1 Glacier, 2 neutral, 3 ice; spring overshoot fill), `StatTile` + `Ticker` (counting numbers), `ProgressBar`, `StepSegments`. |
| Photography | `Card` (photo + clear-glass footer), `Poster` (video poster; `glyph` slot for custom graphics, overlay children, `parallax`), `HeroPhoto` (full-bleed, fades into the page, scroll parallax), `AmbientBackdrop` (blurred copy of a photo as the page colour field). |
| Page header | `LargeTitle` (collapses into a centred inline title over the edge blur on phone; plain header on desktop). |
| Overlays | `Sheet` (bottom sheet with detents, swipe down, rubber band; centre or side panel on desktop; native dialog focus trap and Esc), `useToast()` (`ToastProvider` is in the shell). |
| States | `Skeleton` / `SkeletonText` (glass shimmer; mark the region `aria-busy`), `EmptyState` (`illustration` slot from `components/graphics`, one action), `Avatar`. |
| Workout table | `WorkoutTable`, `ExerciseRow`, `RestRow`. |

Shell (`@/components/shell`): `AppShell` (used by `(app)/layout.tsx`), `UserButton` and `useShellUser()` for headers, `SidebarGroup` for desktop extras, `ThemeSwitch`.

## Glass rules
- Never stack glass more than two levels deep (page backdrop → card → control is the limit).
- Regular glass sits over the page backdrop. Over photography use `clear` (white content) so text keeps AA contrast; add `--photo-scrim` behind white titles on bright photos.
- At most about three blurred layers on screen at once (backdrop-filter is costly). The ambient backdrop is one image filter, not a backdrop-filter.
- `prefers-reduced-transparency` swaps glass for solid `--glass-solid` surfaces automatically.
- Depth comes from blur, the 1px specular rim and the top highlight. No drop shadows; `--float-shadow` only on floating layers (tab bar, sheets, toasts).

## Colour rules
- Glacier (`--accent`) = the one primary action per screen and "now" (today, current step, live, active tab text). Everything else is neutral.
- Accent text uses `--accent-ink`. Filled buttons use `--on-accent` (white, AA on both themes).
- Rings: one blue family plus a neutral. No other data colours.

## Motion rules
- Values live in `tokens.motion` (`--curve-spring`, `--dur-*`; physics springs for native).
- Motion answers the member: press (scale .97 spring + light sweep), lens morph between tabs and segments, check draws on complete, rings fill once on load with overshoot, numbers tick, sheet rubber-bands, toggles squash, cards lift 3px on hover, cursor-reactive specular on glass (desktop), hero photos drift with scroll, page crossfade (View Transitions; CSS fallback).
- No decorative looping motion except the skeleton shimmer and the "playing" equaliser.
- `prefers-reduced-motion`: everything above is off; states change instantly.

## Imagery rules
- Real photography only (program media, video posters, Mike's photos). No stock, no placeholders.
- Always `next/image`. Static imports get blur placeholders automatically; pass `blurDataURL` for remote images.
- Low-res renditions only behind blur (`AmbientBackdrop` loads a ~96px image). Crisp photos at hero sizes only when the source is at least 1.5× the display size.

## Accessibility
- Text on glass passes AA in both themes; filled accent passes AA with white.
- Focus: 2px `--focus` outline, offset 2px, on every interactive element.
- Targets: 44px minimum (`--target`).
