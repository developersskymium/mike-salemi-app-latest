# Trace design system

**Every rep leaves a mark.** Leave a camera shutter open while Mike swings and the bell paints an arc of light. Trace makes that the language of the app: training is drawn as **glacier light with a hot head and a fading tail**. Dark is a night exposure under Mount Shasta (blue-black ground, matte film, star trails); light is the same mountain in daylight, drawn as glacier contour lines on snow.

Reference pages: `/gallery` (the whole system in both themes; `?only=light|dark` for one) and `/gallery/shell` (the shell with a Today composition in the legacy Home order). Concept (source of truth for the look): `docs/design/trace/concept/` and the `b-*.png` screenshots beside it. Layouts follow the original app (`docs/specs/08-legacy-parity.md` §L): Trace changes the visual language, never the page structure.

## Principles
1. **Light has one source.** Glacier light comes only from traces, the primary pill and real light in photos (fire, dawn). Everything else is night or snow so the light has somewhere to glow.
2. **Progress is drawn, not filled.** Any progress, loader, divider or hero trace follows one drawing rule (below). Each movement has its own shape.
3. **Matte film, not glass.** Surfaces are opaque film. Edges catch light where a trace has passed (the light leak, and the rim under the cursor). Blur only on floating layers (tab bar, sheets) and over photos.
4. **Width is motion.** Display type is Anybody with a width axis: it stretches wide at rest and squeezes narrow while it moves.
5. **Shadows are glow.** No grey drop shadows on dark; glow from a light source (`--glow`). Light theme keeps one soft lift on film.
6. **No pink, no decorative gradients.** The night is blue-black because a long exposure of the sky is blue-black. Gradients only model light (a tail cooling, a glow, a vignette).

## Tokens
Source: `packages/tokens/src/tokens.ts` → `pnpm --filter @ms/tokens build:css` → `tokens.css`. Never edit `tokens.css` or put raw colours in components. Liquid token **names are kept** (pages use them) and now resolve to Trace values; Trace adds its own names alongside. No token was renamed.

### Colour roles
| Role | Dark (night exposure) | Light (snow exposure) | Use |
| --- | --- | --- | --- |
| `--ground` = `--bg` | `#070C17` | `#EEF3F6` | Page ground |
| `--film` = `--bg-elev` = `--glass-fill` | `#0C1322` | `#FBFDFE` | Surfaces (cards, panels) |
| `--film-2` = `--lens-fill` | `#111A2C` | `#F2F6F8` | Raised film, active segments |
| `--edge` | `rgba(150,200,235,.12)` | `rgba(20,90,140,.13)` | 1px plate edge |
| `--ink` / `--ink-2` / `--ink-3` = `--label*` | `#EEF4F8` / `#A3B2C0` / `#73879B` | `#0B1A28` / `#47596A` / `#5A6C7F` | Text (all AA on ground and film) |
| `--rule` = `--sep` | 10% glacier | 11% ink | Hairlines |
| `--trace` | `#5CC8F5` glacier light | `#1490D6` | The light |
| `--trace-hot` | `#E6F8FF` | `#0A5E99` | The head of a trace, the light point of icons |
| `--trace-dim` | 24% | 24% | Dotted path ahead, unlit nodes |
| `--accent` | `#5CC8F5` (label `#04182A`, 9.4:1) | `#0C78BB` glacier ink (white label 4.8:1) | The light pill, selected chips |
| `--accent-ink` | `#5CC8F5` | `#0B6FAD` (4.8:1) | Accent text, links |
| `--lines` | 50% | 42% | Contour lines |

Recipes: `--glow` (pill glow), `--glow-soft`, `--glow-head`, `--leak` (light-leak gradient for plate edges), `--lift-shadow`, `--exposure` (page exposure gradient), `--night-ground` (night panel), `--grade-*` (photo grade per theme), `--trace-glow` (glow opacity). Rings: `--ring-1..3(-hi)` = glacier, ink, deep ice.

Night panel: `.lq-night` (or `Glass level="night"`) stays a night exposure in both themes and gets the dark roles (heroes, video, completion).

Graphics hooks: the theme blocks define the `--gfx-*` custom properties that `components/graphics` reads (figure ink and far-side opacity, bell, glass/surface, glacier, flame, enamel, glyph, arc track, heat, glow, night skies; dawn and dusk skies kept cool, no pink). Graphics adopt Trace with no code change.

### Type
| Family | Use |
| --- | --- |
| **Anybody** (`--font-display`), variable width 50–150 (`font-stretch`), weight 100–900 | Titles, section heads, card names, numerals |
| **Hanken Grotesk** (`--font` = `--font-text`), 400–700 | Body, instructions, tables, meta |

Scale (classes `lq-display`, `lq-t34` … `lq-t10`, CSS `--t-*`, Tailwind `text-34` …): display 52/50 w145 · 34/36 w135 · 28/31 w132 · 22/26 w130 · 20/24 w128 · 17/21 w125 (all Anybody 650–700) · 15/22 body · 13.5/19 meta · 12 · 11 · 10.5 (Hanken). `--t-*-stretch` holds each width; the `font` shorthand carries the nearest keyword.
Width presets `--w-squeeze 55 · narrow 60 · normal 100 · card 110 · headline 125 · title 135 · wide 145 · thin 150`.
Numerals: `.lq-thin-num` (Anybody 200, width 150: days, counts, time), `.lq-dnum` (Anybody 600, width 125: stats, tables). `.lq-num` = tabular figures in any face.
Fonts are self-hosted in `apps/web/public/fonts` and preloaded in `app/layout.tsx` (Anybody + Hanken 400/600).

### Radii, spacing, layout
Radii `--r-hero 30 · card 22 · panel 20 · inner 16 · thumb 14 · control 12 · sheet 32 · pill`. Spacing 4pt grid `--s-1..16`. Rail `--sidebar-w 256` (legacy 16rem), content `--content-max 1180`, tab bar 64 high, 22 inset.

### Motion
Curves: `--curve-expose` (ease-out cubic: the head leads), `--curve-out` (the exposure curve), `--curve-spring` (1.4 overshoot: presses, flare), `--curve-spring-soft`, `--curve-in-out`. Durations `--dur-expose 1400 · ticker 1100 · stretch 500 · orbit 1600 · streak 4500 (+1200 delay) · flare 1200 · press 450 (in 80) · rise 1000 (+80 stagger) · sheet 480 · toast 360`. `--press-scale .96`.

## The drawing rule (TraceLine)
A trace is light travelling along a path: a **white-hot head** with a halo; a **tail** of slices widening from 25% to 100% and cooling to `floor` (8%) opacity; a **glow** 3.2× the width, blurred; a **dotted path ahead** (`1 7`); **nodes** for steps, lit once the head passes. Geometry is computed on the server (`signature/geometry.ts`); the tail is one `<path>` shown through dash windows, so markup stays small.

## Primitives (`@/components/ui`) — API unchanged, props only added
| Primitive | Trace treatment |
| --- | --- |
| `Glass` | Matte film plate with a 1px edge; the edge catches glacier light under the cursor (desktop). New: `leak` (light-leak edge), `level="night"`. `thick` = floating film with light blur; `clear` = night-tinted over photos. |
| `Button` | `filled` = the **light pill**: glacier fill, glow, a streak of light passing every 4.5s, 96% press in 80ms with spring back. New variant `ghost` (= `glass`): edge outline on film. `white` over photos, `tint`, `fill`, `plain`. New prop `streak`. |
| `CompleteButton` | Check draws itself, then a flare line and ring of light. |
| `IconButton`, `Icon` | Round film control. Icons: 1.6 stroke, open shapes ending in a **light point** (`point` prop; off at xs). Active tabs also light the stroke (`--icon-lit`). New icons: `today` (swing arc), `programs` (pendulum). |
| `Chip` | Film with edge; `selected` = lit trace fill with glow; `dot` = a live light point. |
| `Segmented` | A light track; the lens is film outlined in glacier light with a glow; slides and stretches (`useLens`). |
| `Toggle` | Off: a dim knob. On: lit track, a short tail, and the knob as a white-hot head with a halo. Squashes while pressed. |
| `Rings` | **Trace arcs**: each ring exposes from the top with a head and cooling tail, dotted remainder, staggered. New prop `animate`. |
| `ProgressBar`, `StepSegments` | Straight trace (tapered tail, head, dotted ahead) that exposes on load; steps strung on one trace (lit, head, dotted). |
| `StatTile`, `Ticker` | Anybody numerals that **Stretch** while counting. `Ticker` gains `from`, `delay`, `duration`. |
| `Card`, `Poster`, `HeroPhoto` | Photos get the **exposure grade** (new `grade` prop: `night` default for Card/Poster, `auto` for HeroPhoto; `none` to keep as shot); film rim lights under the cursor; night footer. |
| `AmbientBackdrop` | A desaturated tonal field under the page wash. |
| `LargeTitle` | Anybody title at width 135; on-photo titles glow faintly. |
| `Sheet`, `Toast` | Film with a light-leak edge; the grabber is a short trace with a head. |
| `Skeleton`, `EmptyState`, `Avatar`, `WorkoutTable` | Light passes over unexposed plates; avatars are graded grey; load is drawn as a short intensity trace; table numbers in Anybody. |

## Signature components (`@/components/signature`)
| Component | Use | Rules |
| --- | --- | --- |
| `TraceLine` | Any path drawn as light (progress, heroes, overlays). `animate` = Expose (CSS tail reveal + SMIL head). | One focal trace per view. Animate only on first view; never loop. |
| `SwingRibbon` | The program as a ribbon of swings, one per day, deeper each phase; done lit, today the head, ahead dotted. `size` wide/compact/responsive, phase labels. | Program pages, Today, program cards. Phases from the program data. |
| `WeekTrace` | This week: each day drawn as its main movement. | Today, plan. `movementFor(name)` maps a day name to a shape. |
| `MovementTrace` | Glyphs: swing, press, halo, get-up, clean, squat, deadlift, rest wave. | Day lists, week strip, empty states. Never decorative confetti. |
| `StarTrails`, `SnowContours`, `LivingBackdrop` | Night sky / daylight contours, optional Mount Shasta, `live` light events (a meteor; a glint passing over snow). | Static SVG painted once, exposes on load; the live events are single composited elements. Off under reduced motion. The shell mounts `LivingBackdrop` behind every page. |
| `OrbitLoader` | Loading: a short trace circling (the halo move). | Any wait over ~300ms. |
| `Flare` | Completion starburst with a closing shutter ring. | Only at the end of a completion trace. Once. |
| `StretchNumber` | Numbers that count squeezed narrow and spring back wide (`thin` / `solid`). | Day numbers, counts, time. |
| `PhotoGrade` | CSS exposure grade (`night`, `day`, `warm`, `auto`, `none`) and an optional trace along the bell's real path (`trace={{ d, viewBox }}` in the photo's pixels). | Fire stays `warm`. Product shots and branded covers may use `none`. |
| `LightPill` | The primary pill as its own component (`Button` filled + `streak`). | One per screen. |
| `TraceRule`, `TraceDash` | A divider warming to a light point; the light dash for list items and active marks. | |

## Shell
`AppShell` keeps its structure and adds clean slots for the legacy L0 shell: `sidebarResume` (training resume card), `sidebarExtra` (Unlocked), `sidebarMore` (Tools, Coaching, Referrals), `announcement`, `statusBar`, `phoneHeader`, `tabBarMore` (a "More" trigger in the tab bar), `overlays` (More sheet, celebration), `backdrop` (`living` default). Desktop rail: wordmark (swing arc with a light point) → resume → nav (active item lit by a light dash that slides with the lens) → groups → member. Phone: film capsule tab bar; the active tab lights its icon and a light dash slides and stretches between tabs. Route progress is a trace across the top; page changes rise out of a soft blur.

## Motion
- **Expose** — progress draws along its path, head leading, tail cooling (1.4s ease-out cubic).
- **Stretch** — numbers squeeze to width 55–60 while counting, spring back to their width.
- **Orbit** — the loader circles (1.6s linear).
- **Streak** — a streak of light passes the light pill every 4.5s; presses scale to 96% in 80ms and spring back.
- **Flare** — a completed day ends in a starburst; the shutter closes on it (spring 1.4, 1.2s).
- Entrances: `data-rise` (+ `--i` index) rises blocks out of a 4px blur, staggered 80ms.
- `prefers-reduced-motion`: traces render drawn, numbers show their value, no streak, no sky events, no rise.

## Do / don't
- **Do** use one light pill per screen; everything else ghost, fill or plain.
- **Do** draw progress as a trace (arc, line, ribbon, steps). **Don't** use filled bars or solid pie rings.
- **Do** put heroes, video and completion on night panels. **Don't** put a night panel inside another.
- **Do** grade photography; keep fire warm. **Don't** tint photos blue in light theme (use `day` / `auto`).
- **Do** use Anybody for titles and numbers, Hanken for reading. **Don't** set paragraphs in Anybody or squeeze body text.
- **Don't** add pink, purple or decorative gradients; **don't** use grey drop shadows on dark; **don't** loop traces or stack more than one blurred layer over another.
- **Don't** animate a trace more than once per view or add motion that the member did not cause, beyond the streak and the sky's rare events.

## Accessibility
Text roles pass AA on ground and film in both themes; the light pill passes AA with its label. Focus: 2px `--focus` (glacier) outline, 3px offset. Targets 44px (`--target`). Every trace that carries meaning has a `label` (or the component's `aria-label`); decorative traces are `aria-hidden`. Reduced transparency swaps blurred layers for solid film.
