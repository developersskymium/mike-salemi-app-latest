/**
 * TRACE design tokens — the single source of truth.
 *
 * Every rep leaves a mark. Training is drawn as glacier light with a hot head and a fading
 * tail. Dark is a night exposure under Mount Shasta (blue-black ground, matte film surfaces,
 * star trails); light is the same mountain in daylight (snow ground, glacier contour lines).
 * Light only comes from traces, the primary pill and real light in photographs. No pink, no
 * decorative gradients, shadows only as glow from a light source.
 *
 * Web reads these as CSS custom properties (tokens.css, generated from this file by
 * `pnpm --filter @ms/tokens build:css`). React Native reads the same constants.
 * Token NAMES from the Liquid system are kept (pages use them); Trace adds its own
 * (`--ground`, `--film`, `--trace`, `--glow`, `--font-display` …) alongside.
 */

/* ------------------------------------------------------------------ type */

export const font = {
  /** Text: Hanken Grotesk, a quiet warm grotesk for instructions, tables and notes. */
  stack: '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Display: Anybody, variable width 50–150 and weight 100–900. Width is motion. */
  display: '"Anybody", "Hanken Grotesk", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  features: '"tnum" 0',
  files: {
    display: "/fonts/anybody-var.woff2",
    text: {
      400: "/fonts/hanken-400.woff2",
      500: "/fonts/hanken-500.woff2",
      600: "/fonts/hanken-600.woff2",
      700: "/fonts/hanken-700.woff2",
    },
  },
  /** Files worth a <link rel="preload"> (first paint). */
  preload: ["/fonts/anybody-var.woff2", "/fonts/hanken-400.woff2", "/fonts/hanken-600.woff2"],
} as const;

/** Anybody width presets (font-stretch %). Type stretches while it moves and settles wide. */
export const width = {
  squeeze: 55, // a number mid-count
  narrow: 60,
  normal: 100,
  card: 110, // card names
  headline: 125, // section heads, numbers
  title: 135, // page titles
  wide: 145, // hero titles
  thin: 150, // thin wide numerals (days, counts, time)
} as const;

export type TypeStep = {
  family: "display" | "text";
  weight: number;
  size: number;
  line: number;
  tracking: number;
  /** font-stretch % (display only). */
  stretch?: number;
};

/**
 * Scale. Display steps are Anybody (stretched wide), text steps are Hanken.
 * Keys are kept from the Liquid scale so `lq-t34`, `var(--t-17)` … keep working.
 */
export const type = {
  display: { family: "display", weight: 700, size: 52, line: 50, tracking: -0.04, stretch: width.wide },
  t34: { family: "display", weight: 700, size: 34, line: 36, tracking: -0.025, stretch: width.title },
  t28: { family: "display", weight: 700, size: 28, line: 31, tracking: -0.025, stretch: 132 },
  t22: { family: "display", weight: 650, size: 22, line: 26, tracking: -0.02, stretch: 130 },
  t20: { family: "display", weight: 650, size: 20, line: 24, tracking: -0.018, stretch: 128 },
  t17: { family: "display", weight: 650, size: 17, line: 21, tracking: -0.012, stretch: width.headline },
  t15: { family: "text", weight: 400, size: 15, line: 22, tracking: 0 },
  t13: { family: "text", weight: 500, size: 13.5, line: 19, tracking: 0 },
  t12: { family: "text", weight: 600, size: 12, line: 15, tracking: 0.005 },
  t11: { family: "text", weight: 600, size: 11, line: 13, tracking: 0.01 },
  t10: { family: "text", weight: 600, size: 10.5, line: 12, tracking: 0.01 },
} as const satisfies Record<string, TypeStep>;

/** Numeral presets. */
export const numerals = {
  /** Thin wide numerals: day numbers, counts, time. */
  thin: { weight: 200, stretch: width.thin, tracking: -0.045, line: 0.8 },
  /** Solid display numerals: stats, table counts. */
  solid: { weight: 600, stretch: width.headline, tracking: -0.02, line: 1 },
} as const;

/* ---------------------------------------------------------------- layout */

/** Radii: rounded like a light trail's end. */
export const radius = {
  screen: 55,
  sheet: 32,
  hero: 30,
  card: 22,
  panel: 20,
  inner: 16,
  thumb: 14,
  control: 12,
  pill: 999,
} as const;

/** 4pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64 } as const;

export const layout = {
  contentMax: 1180,
  sidebarWidth: 256, // legacy rail: 16rem
  sidebarInset: 0,
  tabbarHeight: 64,
  tabbarInset: 22,
  tabbarBottom: 22,
  target: 44,
  desktopBreakpoint: 1024,
} as const;

export const z = {
  base: 0,
  backdrop: 0,
  content: 1,
  sidebar: 30,
  edge: 40,
  navbar: 45,
  tabbar: 50,
  progress: 60,
  sheet: 70,
  toast: 80,
} as const;

/* ---------------------------------------------------------------- colour */

/** Theme-independent palette. Glacier is the light source; everything else is night or snow. */
export const palette = {
  glacier: "#5CC8F5", // glacier light
  glacierHot: "#E6F8FF", // the head of a trace
  glacierDeep: "#1478BC",
  glacierInk: "#0E7DC2", // glacier on snow
  night: "#070C17", // dark ground
  nightFilm: "#0C1322", // dark surfaces
  snow: "#EEF3F6", // light ground
  snowFilm: "#FBFDFE", // light surfaces
  white: "#FFFFFF",
  black: "#000000",
} as const;

type ThemeTokens = Record<string, string>;

/**
 * Semantic colours per theme. Keys become CSS variables (`--key`).
 * Liquid names (bg, label, glass-*) are kept and now resolve to Trace materials.
 */
export const themes = {
  light: {
    /* Trace roles — snow exposure */
    ground: "#EEF3F6",
    "ground-2": "#E3EAEF",
    film: "#FBFDFE",
    "film-2": "#F2F6F8",
    edge: "rgba(20, 90, 140, .13)",
    ink: "#0B1A28",
    "ink-2": "#47596A",
    "ink-3": "#5A6C7F", // 4.8:1 on snow
    rule: "rgba(20, 70, 110, .11)",
    trace: "#1490D6",
    "trace-hot": "#0A5E99",
    "trace-dim": "rgba(20, 110, 170, .24)",
    "trace-glow": ".22",
    lines: "rgba(20, 110, 170, .42)",
    leak: "linear-gradient(120deg, transparent 18%, rgba(20, 144, 214, .55) 48%, transparent 74%)",
    glow: "0 0 0 1px color-mix(in srgb, #0C78BB 70%, #fff), 0 10px 26px -10px rgba(12, 120, 187, .7)",
    "glow-soft": "0 0 18px -8px rgba(20, 144, 214, .8)",
    "glow-head": "0 0 8px 1px rgba(20, 144, 214, .55)",
    "lift-shadow": "0 1px 2px rgba(10, 60, 100, .05), 0 12px 28px -18px rgba(10, 60, 100, .28)",
    exposure: "linear-gradient(180deg, #DCE8F1 0%, #EEF3F6 70%)",

    /* Liquid names → Trace */
    bg: "#EEF3F6",
    "bg-elev": "#FBFDFE",
    label: "#0B1A28",
    "label-2": "#47596A", // 6.5:1 on snow
    "label-3": "#5A6C7F",
    sep: "rgba(20, 70, 110, .11)",
    fill: "rgba(20, 90, 140, .07)",
    "fill-2": "rgba(20, 90, 140, .13)",
    track: "rgba(20, 110, 170, .14)",

    accent: "#0C78BB", // glacier ink fill, white label 4.8:1
    "accent-hi": "#5CC8F5",
    "accent-deep": "#0A5E99",
    "accent-ink": "#0B6FAD", // accent text on snow 4.8:1
    "accent-soft": "rgba(20, 144, 214, .11)",
    "on-accent": "#FFFFFF",

    /* rings are trace arcs: glacier, ink, deep ice */
    "ring-1": "#1490D6",
    "ring-1-hi": "#0A5E99",
    "ring-2": "#47596A",
    "ring-2-hi": "#0B1A28",
    "ring-3": "#5CC8F5",
    "ring-3-hi": "#1478BC",

    /* film (formerly glass): matte, no blur. Floating layers keep a light blur. */
    "glass-fill": "#FBFDFE",
    "glass-filter": "none",
    "glass-rim": "linear-gradient(rgba(20, 90, 140, .14), rgba(20, 90, 140, .14))",
    "glass-hl": "inset 0 0 0 1px rgba(20, 90, 140, .0)",
    "glass-edge": "0 1px 2px rgba(10, 60, 100, .05), 0 12px 28px -18px rgba(10, 60, 100, .25)",
    "glass-thick": "rgba(251, 253, 254, .94)",
    "glass-thick-filter": "blur(20px) saturate(140%)",
    "glass-solid": "#FBFDFE",
    "lens-fill": "#F2F6F8",
    "lens-edge": "inset 0 0 0 1.5px rgba(20, 144, 214, .65), 0 0 18px -8px rgba(20, 144, 214, .9)",
    "float-shadow": "0 16px 36px -18px rgba(10, 60, 100, .35)",
    specular: "rgba(20, 144, 214, .07)",
    sweep: "rgba(255, 255, 255, .6)",
    shimmer: "rgba(20, 144, 214, .10)",
    focus: "#0C78BB",

    wash: "linear-gradient(180deg, rgba(238,243,246,.55) 0%, rgba(238,243,246,.82) 45%, #EEF3F6 100%)",
    "ambient-filter": "blur(60px) grayscale(.85) brightness(1.15)",
    "edge-tint": "rgba(238, 243, 246, .9)",
    scrim: "rgba(238, 243, 246, .6)",

    /* photo grade (daylight: high key, cool) */
    "grade-base": "linear-gradient(180deg, #CFE3F1, #EAF2F7)",
    "grade-filter": "grayscale(.85) contrast(1.05) brightness(1.08)",
    "grade-blend": "multiply",
    "grade-bg": "#DCE8F0",
    "grade-vignette": "linear-gradient(180deg, rgba(4, 8, 16, 0) 50%, rgba(4, 8, 16, .5))",
    /* which living backdrop shows */
    "living-stars": "none",
    "living-snow": "block",

    /* graphics hooks (components/graphics reads --gfx-*) */
    "gfx-figure": "#0B1A28",
    "gfx-figure-far-opacity": ".28",
    "gfx-figure-rim": "rgba(255, 255, 255, .4)",
    "gfx-specular": "#FFFFFF",
    "gfx-shade": "#04182A",
    "gfx-bell": "#0C78BB",
    "gfx-bell-hi": "#5CC8F5",
    "gfx-bell-lo": "#0A5E99",
    "gfx-glass": "#FBFDFE",
    "gfx-glass-edge": "#0B1A28",
    "gfx-glass-opacity": ".7",
    "gfx-snow": "#FFFFFF",
    "gfx-terrain": "#0B1A28",
    "gfx-glacier": "#5CC8F5",
    "gfx-glacier-hi": "#E6F8FF",
    "gfx-glacier-lo": "#1478BC",
    "gfx-glacier-deep": "#0A3F66",
    "gfx-flame": "#1490D6",
    "gfx-flame-hi": "#5CC8F5",
    "gfx-flame-lo": "#0A5E99",
    "gfx-enamel": "#0C78BB",
    "gfx-enamel-hi": "#5CC8F5",
    "gfx-enamel-lo": "#0A3F66",
    "gfx-glyph": "#0B1A28",
    "gfx-glyph-accent": "#1490D6",
    "gfx-arc-track": "rgba(20, 110, 170, .2)",
    "gfx-glow": "rgba(20, 144, 214, .45)",
    "gfx-kettlebell": "#0B1A28",
    "gfx-kettlebell-ink": "#EEF3F6",
    "gfx-heat-0": "rgba(20, 110, 170, .1)",
    "gfx-heat-1": "rgba(20, 144, 214, .28)",
    "gfx-heat-2": "rgba(20, 144, 214, .5)",
    "gfx-heat-3": "rgba(20, 144, 214, .76)",
    "gfx-heat-4": "#0C78BB",
    "gfx-heat-ring": "#0A5E99",
    "gfx-relief-shadow": "#04182A",
  },
  dark: {
    /* Trace roles — night exposure */
    ground: "#070C17",
    "ground-2": "#0A1120",
    film: "#0C1322",
    "film-2": "#111A2C",
    edge: "rgba(150, 200, 235, .12)",
    ink: "#EEF4F8",
    "ink-2": "#A3B2C0",
    "ink-3": "#73879B", // 5.5:1 on night
    rule: "rgba(160, 200, 230, .1)",
    trace: "#5CC8F5",
    "trace-hot": "#E6F8FF",
    "trace-dim": "rgba(120, 180, 220, .24)",
    "trace-glow": ".36",
    lines: "rgba(170, 210, 240, .5)",
    leak: "linear-gradient(120deg, transparent 18%, rgba(92, 200, 245, .7) 48%, transparent 74%)",
    glow: "0 0 0 1px color-mix(in srgb, #5CC8F5 60%, #fff), 0 10px 30px -10px rgba(92, 200, 245, .8)",
    "glow-soft": "0 0 22px -6px rgba(92, 200, 245, .9)",
    "glow-head": "0 0 10px 2px rgba(92, 200, 245, .6)",
    "lift-shadow": "0 18px 40px -24px rgba(0, 0, 0, .7)",
    exposure: "radial-gradient(120% 80% at 80% -10%, #102445 0%, #08101F 50%, #070C17 100%)",

    bg: "#070C17",
    "bg-elev": "#0C1322",
    label: "#EEF4F8",
    "label-2": "#A3B2C0", // 9:1 on night
    "label-3": "#73879B",
    sep: "rgba(160, 200, 230, .1)",
    fill: "rgba(150, 200, 235, .07)",
    "fill-2": "rgba(150, 200, 235, .13)",
    track: "rgba(120, 180, 220, .16)",

    accent: "#5CC8F5", // glacier light, night label 9.4:1
    "accent-hi": "#E6F8FF",
    "accent-deep": "#1478BC",
    "accent-ink": "#5CC8F5",
    "accent-soft": "rgba(92, 200, 245, .13)",
    "on-accent": "#04182A",

    "ring-1": "#5CC8F5",
    "ring-1-hi": "#E6F8FF",
    "ring-2": "#A3B2C0",
    "ring-2-hi": "#EEF4F8",
    "ring-3": "#2E8FD0",
    "ring-3-hi": "#9FD7F5",

    "glass-fill": "#0C1322",
    "glass-filter": "none",
    "glass-rim": "linear-gradient(rgba(150, 200, 235, .12), rgba(150, 200, 235, .12))",
    "glass-hl": "inset 0 0 0 1px rgba(150, 200, 235, .0)",
    "glass-edge": "0 0 0 0 transparent",
    "glass-thick": "rgba(12, 19, 34, .92)",
    "glass-thick-filter": "blur(20px) saturate(140%)",
    "glass-solid": "#0C1322",
    "lens-fill": "#111A2C",
    "lens-edge": "inset 0 0 0 1.5px rgba(92, 200, 245, .65), 0 0 18px -8px rgba(92, 200, 245, 1)",
    "float-shadow": "0 16px 40px -16px rgba(0, 0, 0, .55)",
    specular: "rgba(92, 200, 245, .07)",
    sweep: "rgba(255, 255, 255, .55)",
    shimmer: "rgba(92, 200, 245, .08)",
    focus: "#5CC8F5",

    wash: "linear-gradient(180deg, rgba(7,12,23,.5) 0%, rgba(7,12,23,.82) 45%, #070C17 100%)",
    "ambient-filter": "blur(60px) grayscale(.9) brightness(.7)",
    "edge-tint": "rgba(7, 12, 23, .88)",
    scrim: "rgba(4, 8, 16, .45)",

    /* photo grade (night: monochrome under night blue, highlights lifted) */
    "grade-base": "linear-gradient(180deg, #0B2340, #050B16)",
    "grade-filter": "grayscale(1) contrast(1.15) brightness(.95)",
    "grade-blend": "screen",
    "grade-bg": "#071022",
    "grade-vignette": "linear-gradient(180deg, rgba(4, 8, 16, 0) 40%, rgba(4, 8, 16, .78))",
    "living-stars": "block",
    "living-snow": "none",

    "gfx-figure": "#EEF4F8",
    "gfx-figure-far-opacity": ".34",
    "gfx-figure-far-opacity-dark": ".34",
    "gfx-figure-rim": "rgba(0, 0, 0, .12)",
    "gfx-figure-rim-dark": "rgba(0, 0, 0, .12)",
    "gfx-specular": "#E6F8FF",
    "gfx-shade": "#02050B",
    "gfx-bell": "#5CC8F5",
    "gfx-bell-hi": "#E6F8FF",
    "gfx-bell-lo": "#1478BC",
    "gfx-glass": "#0C1322",
    "gfx-glass-edge": "#9FD7F5",
    "gfx-glass-edge-dark": "#9FD7F5",
    "gfx-glass-opacity": ".6",
    "gfx-glass-opacity-dark": ".6",
    "gfx-snow": "#E6F8FF",
    "gfx-terrain": "#EEF4F8",
    "gfx-glacier": "#5CC8F5",
    "gfx-glacier-hi": "#E6F8FF",
    "gfx-glacier-lo": "#1478BC",
    "gfx-glacier-deep": "#0A3F66",
    "gfx-flame": "#5CC8F5",
    "gfx-flame-hi": "#E6F8FF",
    "gfx-flame-lo": "#1478BC",
    "gfx-enamel": "#5CC8F5",
    "gfx-enamel-hi": "#E6F8FF",
    "gfx-enamel-lo": "#0A3F66",
    "gfx-glyph": "#EEF4F8",
    "gfx-glyph-accent": "#5CC8F5",
    "gfx-arc-track": "rgba(120, 180, 220, .22)",
    "gfx-glow": "rgba(92, 200, 245, .55)",
    "gfx-kettlebell": "#EEF4F8",
    "gfx-kettlebell-ink": "#070C17",
    "gfx-heat-0": "rgba(120, 180, 220, .1)",
    "gfx-heat-1": "rgba(92, 200, 245, .26)",
    "gfx-heat-2": "rgba(92, 200, 245, .48)",
    "gfx-heat-3": "rgba(92, 200, 245, .74)",
    "gfx-heat-4": "#5CC8F5",
    "gfx-heat-ring": "#E6F8FF",
    "gfx-relief-shadow": "#02050B",
  },
} as const satisfies Record<"light" | "dark", ThemeTokens>;

export type ThemeName = keyof typeof themes;
export type ThemePreference = ThemeName | "system";

/**
 * The night panel: an exposure that stays night in both themes (heroes, video, completion).
 * Applied with `.lq-night` (dark tokens plus these).
 */
export const night = {
  "night-ground": "radial-gradient(120% 90% at 70% 0%, #0E1A30 0%, #070C17 55%, #04070D 100%)",
  "night-mountain": "#03060B",
  "night-ridge": "rgba(160, 210, 240, .25)",
} as const;

/** Graphics hooks that do not change with the theme: Mount Shasta and its skies, kept cool. */
export const gfxGlobal = {
  "gfx-night-sky": "#070C17",
  "gfx-night-sky-low": "#102445",
  "gfx-night-ground": "#0C1322",
  "gfx-night-pines": "#03060B",
  "gfx-sky-night-top": "#04070D",
  "gfx-sky-night-mid": "#08101F",
  "gfx-sky-night-low": "#102445",
  "gfx-sky-night-light": "#1478BC",
  "gfx-sky-night-glow": "#5CC8F5",
  "gfx-sky-night-moon": "#E6F8FF",
  "gfx-sky-night-mountain": "#0C1322",
  "gfx-sky-night-mountain-low": "#111A2C",
  "gfx-sky-night-ridge": "#03060B",
  "gfx-sky-night-snow": "#9FD7F5",
  /* dawn and dusk without pink: cool first light */
  "gfx-sky-dawn-alpenglow": "#CFE7F6",
  "gfx-sky-dawn-glow": "#E6F8FF",
  "gfx-sky-dawn-low": "#E3EEF5",
  "gfx-sky-dusk-alpenglow": "#9FC3DD",
  "gfx-sky-dusk-glow": "#BFDDF0",
  "gfx-sky-dusk-low": "#A9C4D9",
  "gfx-sky-dusk-snow": "#DDEBF5",
  "gfx-sky-dusk-sun": "#E6F8FF",
} as const;

/** Over photography: night-tinted, lightly blurred, white content in both themes. */
export const clearGlass = {
  "clear-fill": "rgba(7, 12, 23, .38)",
  "clear-filter": "blur(16px) saturate(120%)",
  "clear-hl": "inset 0 0 0 1px rgba(170, 210, 240, .18)",
  "clear-rim": "linear-gradient(120deg, rgba(170,210,240,.2) 0%, rgba(170,210,240,.2) 30%, rgba(92,200,245,.6) 50%, rgba(170,210,240,.2) 72%)",
  "clear-deep-fill": "rgba(7, 12, 23, .62)",
  "clear-deep-filter": "blur(18px) saturate(120%)",
  "lens-rim": "linear-gradient(rgba(92,200,245,.0), rgba(92,200,245,.0))",
  "photo-scrim": "linear-gradient(rgba(4, 8, 16, .5), transparent)",
} as const;

/* ---------------------------------------------------------------- motion */

/**
 * Motion: light is exposed, never faded. Every animation is a path being drawn (Expose),
 * type stretching with speed (Stretch), a halo circling (Orbit), a streak passing a
 * primary pill (Streak) or a starburst as the shutter closes (Flare).
 * Everything is switched off under prefers-reduced-motion.
 */
export const motion = {
  ease: {
    spring: "cubic-bezier(.34, 1.4, .64, 1)", // presses spring back, flare pops
    springSoft: "cubic-bezier(.3, 1.2, .6, 1)",
    out: "cubic-bezier(.16, 1, .3, 1)", // the exposure curve
    inOut: "cubic-bezier(.65, 0, .35, 1)",
    expose: "cubic-bezier(.33, 1, .68, 1)", // ease-out cubic: the head leads, the tail cools
  },
  duration: {
    press: 450, // spring back
    pressIn: 80, // squeeze to 96%
    sweep: 650,
    lens: 520,
    toggle: 420,
    ring: 1400, // = expose
    ringStagger: 140,
    expose: 1400,
    ticker: 1100, // = stretch count
    stretch: 500, // width settles back
    orbit: 1600,
    streak: 4500,
    streakDelay: 1200,
    flare: 1200,
    check: 420,
    pulse: 700,
    sheet: 480,
    toast: 360,
    shimmer: 1800,
    lift: 500,
    rise: 1000,
    riseStagger: 80,
    page: 300,
    fast: 160,
  },
  /** Physics springs (React Native Reanimated / Motion). */
  springs: {
    press: { stiffness: 520, damping: 28, mass: 1 },
    lens: { stiffness: 380, damping: 30, mass: 1 },
    sheet: { stiffness: 300, damping: 32, mass: 1 },
    ring: { stiffness: 120, damping: 16, mass: 1 },
    flare: { stiffness: 260, damping: 14, mass: 1 },
  },
  pressScale: 0.96,
  liftY: -2,
  parallax: 0.2,
  rubberBand: 0.55,
  sheetDismiss: 0.25,
  stretch: 1.22, // toggle head squash-and-stretch
  /** font-stretch path of a counting number: 150 → 55 → 150. */
  stretchNumber: { from: width.thin, mid: width.squeeze },
} as const;

/* ---------------------------------------------------------------- trace */

/** The drawing rule for every trace (progress, loaders, dividers, heroes, icons). */
export const trace = {
  segments: 30, // tail slices
  floor: 0.08, // tail cools to 8% opacity
  glowWidth: 3.2, // glow = 3.2× stroke, blurred
  glowOpacity: { light: 0.22, dark: 0.35, night: 0.4 },
  headRadius: 0.95, // × stroke
  haloRadius: 3.2, // × stroke
  aheadDash: "1 7", // the dotted path ahead
} as const;

/* ------------------------------------------------------------------ icon */

/** 1.6 stroke, open shapes ending in a light point. The point is the only coloured part. */
export const icon = {
  size: { xs: 13, sm: 17, md: 22, tab: 24, lg: 28 },
  stroke: { xs: 2.1, sm: 1.8, md: 1.6, tab: 1.6, lg: 1.5 },
  point: 1.7,
} as const;

export const tokens = { font, width, type, numerals, radius, space, layout, z, palette, themes, night, gfxGlobal, clearGlass, motion, trace, icon } as const;
export default tokens;
