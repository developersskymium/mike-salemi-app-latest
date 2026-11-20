/**
 * Liquid design tokens — the single source of truth.
 *
 * Web reads these as CSS custom properties (tokens.css, generated from this file by
 * `pnpm --filter @ms/tokens build:css`). React Native will read the same constants.
 * Every colour, radius, blur, shadow, font and motion value lives here so a design
 * change is a one-line edit followed by `build:css`.
 *
 * Direction: monochrome glass. Neutrals carry the UI, colour comes from Mike's
 * photography, and the accent marks only the single primary action and "now" states.
 */

/* ------------------------------------------------------------------ type */

export const font = {
  /**
   * Apple system font on Apple devices (Safari/WebKit), self-hosted Inter (optical sizes)
   * everywhere else. BlinkMacSystemFont is left out on purpose: Chrome treats it as
   * system-ui on every OS, which would give Segoe UI / Roboto instead of Inter.
   */
  stack: '-apple-system, "SF Pro Text", "SF Pro Display", "Inter Liquid", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  features: '"cv11", "ss01", "ss03"',
  file: "/fonts/inter-opsz.woff2",
} as const;

export type TypeStep = { weight: number; size: number; line: number; tracking: number };

/** iOS scale, Large Title → Caption. tracking is in em. */
export const type = {
  display: { weight: 700, size: 48, line: 52, tracking: -0.03 },
  t34: { weight: 700, size: 34, line: 41, tracking: -0.026 },
  t28: { weight: 700, size: 28, line: 34, tracking: -0.022 },
  t22: { weight: 650, size: 22, line: 28, tracking: -0.017 },
  t20: { weight: 650, size: 20, line: 22, tracking: -0.02 },
  t17: { weight: 590, size: 17, line: 22, tracking: -0.012 },
  t15: { weight: 450, size: 15, line: 20, tracking: -0.006 },
  t13: { weight: 500, size: 13, line: 18, tracking: 0 },
  t12: { weight: 600, size: 12, line: 14, tracking: 0 },
  t11: { weight: 600, size: 11, line: 13, tracking: 0.01 },
  t10: { weight: 600, size: 10, line: 12, tracking: 0.01 },
} as const satisfies Record<string, TypeStep>;

/* ---------------------------------------------------------------- layout */

/** Concentric radii: outer = inner + padding. */
export const radius = {
  screen: 55,
  sheet: 38,
  hero: 34,
  card: 30,
  panel: 24,
  inner: 20,
  thumb: 16,
  control: 12,
  pill: 999,
} as const;

/** 4pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const layout = {
  contentMax: 1080,
  sidebarWidth: 248,
  sidebarInset: 10,
  tabbarHeight: 64,
  tabbarInset: 16,
  tabbarBottom: 24,
  target: 44,
  desktopBreakpoint: 1024,
} as const;

export const z = {
  base: 0,
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

/** Theme-independent palette (photographs supply the rest). */
export const palette = {
  white: "#FFFFFF",
  black: "#000000",
  ink: "#0A0A0A",
} as const;

type ThemeTokens = Record<string, string>;

/**
 * Semantic colours and glass recipes per theme. Keys become CSS variables (`--key`).
 * Accent: Glacier blue (Ahmed, Nov 2026).
 */
export const themes = {
  light: {
    bg: "#F3F3F3",
    "bg-elev": "#FFFFFF",
    label: "#0A0A0A",
    "label-2": "#545454", // 7.4:1 on white
    "label-3": "#6B6B6B", // 5.3:1 on white
    sep: "rgba(0, 0, 0, .10)",
    fill: "rgba(118, 118, 118, .13)",
    "fill-2": "rgba(118, 118, 118, .22)",
    track: "rgba(10, 10, 10, .08)",

    accent: "#1A6FE0", // Glacier blue fill, white label 4.8:1
    "accent-hi": "#3B8BF5",
    "accent-deep": "#155FC4",
    "accent-ink": "#1667D9", // accent text on light, 5.3:1 on white
    "accent-soft": "rgba(26, 111, 224, .12)", // ice tint
    "on-accent": "#FFFFFF",

    /* rings: one hue family (glacier) + neutrals */
    "ring-1": "#1A6FE0",
    "ring-1-hi": "#5AADFF",
    "ring-2": "#2A2A2A",
    "ring-2-hi": "#7A7A7A",
    "ring-3": "#8CC4FF",
    "ring-3-hi": "#C9E3FF",

    /* glass — regular */
    "glass-fill": "linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,.44))",
    "glass-filter": "blur(32px) saturate(170%) brightness(1.04)",
    "glass-rim":
      "linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(255,255,255,.35) 28%, rgba(255,255,255,0) 52%, rgba(255,255,255,.25) 78%, rgba(255,255,255,.85) 100%)",
    "glass-hl": "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(255,255,255,.25)",
    "glass-edge": "0 0 0 .5px rgba(0,0,0,.06)",
    /* glass — thick (sheets, bars, tables) */
    "glass-thick": "linear-gradient(180deg, rgba(255,255,255,.82), rgba(250,250,250,.72))",
    "glass-thick-filter": "blur(40px) saturate(170%)",
    /* solid fallback for prefers-reduced-transparency */
    "glass-solid": "#FFFFFF",
    /* lens (active pill) */
    "lens-fill": "linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.72))",
    "lens-edge": "inset 0 0 0 .5px rgba(0,0,0,.06)",
    /* the one ambient shadow, floating layers only */
    "float-shadow": "0 6px 20px -10px rgba(0,0,0,.16)",
    /* micro-interaction light */
    specular: "rgba(255,255,255,.55)",
    sweep: "rgba(255,255,255,.55)",
    shimmer: "rgba(255,255,255,.6)",
    focus: "#0A0A0A",

    wash: "linear-gradient(180deg, rgba(243,243,243,.30) 0%, rgba(243,243,243,.62) 45%, rgba(243,243,243,.82) 100%)",
    "ambient-filter": "blur(70px) saturate(1.5) brightness(1.2)",
    "edge-tint": "rgba(245,245,245,.82)",
    scrim: "rgba(255,255,255,.5)",
  },
  dark: {
    bg: "#000000",
    "bg-elev": "#1C1C1C",
    label: "#FFFFFF",
    "label-2": "#B3B3B3", // 9.6:1 on black
    "label-3": "#8C8C8C",
    sep: "rgba(255, 255, 255, .12)",
    fill: "rgba(118, 118, 118, .26)",
    "fill-2": "rgba(118, 118, 118, .36)",
    track: "rgba(255, 255, 255, .12)",

    accent: "#1C70E4", // white label 4.7:1 (brighter blues fail AA with white)
    "accent-hi": "#3D9BFF",
    "accent-deep": "#1660C8",
    "accent-ink": "#5AADFF", // accent text on dark, 8.9:1
    "accent-soft": "rgba(61, 155, 255, .18)", // ice tint
    "on-accent": "#FFFFFF",

    "ring-1": "#3D9BFF",
    "ring-1-hi": "#8CC8FF",
    "ring-2": "#FFFFFF",
    "ring-2-hi": "#9A9A9A",
    "ring-3": "#7FB9F0",
    "ring-3-hi": "#C4E1FF",

    "glass-fill": "linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06))",
    "glass-filter": "blur(32px) saturate(160%) brightness(.82)",
    "glass-rim":
      "linear-gradient(160deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.14) 28%, rgba(255,255,255,0) 52%, rgba(255,255,255,.08) 78%, rgba(255,255,255,.35) 100%)",
    "glass-hl": "inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(255,255,255,.04)",
    "glass-edge": "0 0 0 .5px rgba(255,255,255,.06)",
    "glass-thick": "linear-gradient(180deg, rgba(44,44,44,.76), rgba(28,28,28,.72))",
    "glass-thick-filter": "blur(40px) saturate(170%)",
    "glass-solid": "#1C1C1C",
    "lens-fill": "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.10))",
    "lens-edge": "inset 0 0 0 .5px rgba(255,255,255,.14)",
    "float-shadow": "0 6px 20px -10px rgba(0,0,0,.6)",
    specular: "rgba(255,255,255,.16)",
    sweep: "rgba(255,255,255,.22)",
    shimmer: "rgba(255,255,255,.10)",
    focus: "#FFFFFF",

    wash: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 45%, rgba(0,0,0,.74) 100%)",
    "ambient-filter": "blur(70px) saturate(1.5) brightness(.85)",
    "edge-tint": "rgba(0,0,0,.62)",
    scrim: "rgba(0,0,0,.35)",
  },
} as const satisfies Record<"light" | "dark", ThemeTokens>;

export type ThemeName = keyof typeof themes;
export type ThemePreference = ThemeName | "system";

/** Glass that always sits over photography: white content in both themes. */
export const clearGlass = {
  "clear-fill": "linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,.10))",
  "clear-filter": "blur(26px) saturate(160%) brightness(.92)",
  "clear-hl": "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(255,255,255,.08)",
  "clear-rim":
    "linear-gradient(160deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.25) 30%, rgba(255,255,255,0) 55%, rgba(255,255,255,.12) 80%, rgba(255,255,255,.7) 100%)",
  "clear-deep-fill": "linear-gradient(180deg, rgba(16,16,16,.32), rgba(16,16,16,.46))",
  "clear-deep-filter": "blur(30px) saturate(170%)",
  "lens-rim": "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.1) 50%, rgba(255,255,255,.5))",
  "photo-scrim": "linear-gradient(rgba(8,8,8,.42), transparent)",
} as const;

/* ---------------------------------------------------------------- motion */

/**
 * Motion. CSS gets the easing curves and durations; native gets spring physics.
 * Everything is switched off under prefers-reduced-motion.
 */
export const motion = {
  ease: {
    spring: "cubic-bezier(.34, 1.56, .64, 1)", // overshoot, presses and lenses
    springSoft: "cubic-bezier(.3, 1.3, .6, 1)", // rings, lighter overshoot
    out: "cubic-bezier(.22, .8, .2, 1)",
    inOut: "cubic-bezier(.65, 0, .35, 1)",
  },
  duration: {
    press: 350,
    sweep: 550,
    lens: 500,
    toggle: 420,
    ring: 1600,
    ringStagger: 120,
    ticker: 900,
    check: 420,
    pulse: 600,
    sheet: 480,
    toast: 360,
    shimmer: 1600,
    lift: 500,
    page: 260,
  },
  /** Physics springs (React Native Reanimated / Motion). */
  springs: {
    press: { stiffness: 520, damping: 30, mass: 1 },
    lens: { stiffness: 380, damping: 30, mass: 1 },
    sheet: { stiffness: 300, damping: 32, mass: 1 },
    ring: { stiffness: 120, damping: 14, mass: 1 },
  },
  pressScale: 0.97,
  liftY: -3,
  parallax: 0.25, // hero moves at 25% of scroll speed
  rubberBand: 0.55, // iOS rubber-band constant
  sheetDismiss: 0.25, // fraction of sheet height that dismisses
  stretch: 1.18, // toggle knob / lens squash-and-stretch
} as const;

/* ------------------------------------------------------------------ icon */

export const icon = {
  size: { xs: 13, sm: 17, md: 22, tab: 26, lg: 28 },
  stroke: { xs: 2.2, sm: 1.8, md: 1.6, tab: 1.6, lg: 1.5 },
} as const;

export const tokens = { font, type, radius, space, layout, z, palette, themes, clearGlass, motion, icon } as const;
export default tokens;
