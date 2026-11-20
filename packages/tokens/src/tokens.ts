/**
 * SUMMIT design tokens — the single source of truth (approved Nov 20, replaces Trace).
 *
 * Daylight, photo-led training with Mike. Warm chalk ground, crisp white cards with real
 * (soft, short) shadows, warm ink neutrals. Glacier blue means "do this" (primary actions);
 * ember orange is progress, streaks and achievement; gold is for medals only. Archivo 800 for
 * headlines and numbers, Inter for everything you read. Photos run in full colour, never graded.
 * Glass only on small overlays (phone tab bar, video controls, photo badges).
 *
 * Web reads these as CSS custom properties (tokens.css, generated from this file by
 * `pnpm --filter @ms/tokens build:css`). React Native reads the same constants.
 * Token NAMES from the Liquid and Trace systems are kept (pages use them) and now resolve to
 * Summit values; Summit adds its own (`--surface`, `--text`, `--warm`, `--sh-2` …) alongside.
 */

/* ------------------------------------------------------------------ type */

export const font = {
  /** Text: Inter (variable 100–900). `--ff-inter` is set by next/font with metric-matched fallbacks. */
  stack: 'var(--ff-inter, "Inter"), "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Display: Archivo 800 at normal width (headlines, numbers). Never stretched. */
  display: 'var(--ff-archivo, "Archivo"), "Archivo", var(--ff-inter, "Inter"), system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  features: '"cv11", "ss01"',
  /** Self-hosted variable files (apps/web/src/app/fonts), loaded and preloaded by next/font/local. */
  files: {
    display: "archivo-var.woff2",
    text: "inter-var.woff2",
  },
  /** next/font preloads both files; nothing to add by hand. */
  preload: [] as string[],
} as const;

/** Width presets (font-stretch %). Summit never stretches type: every preset is normal width. */
export const width = {
  squeeze: 100,
  narrow: 100,
  normal: 100,
  card: 100,
  headline: 100,
  title: 100,
  wide: 100,
  thin: 100,
} as const;

export type TypeStep = {
  family: "display" | "text";
  weight: number;
  size: number;
  line: number;
  tracking: number;
  /** font-stretch % (display only; always 100 in Summit). */
  stretch?: number;
};

/**
 * Scale. Display steps are Archivo (800/750/700), text steps are Inter.
 * Keys are kept from the Liquid scale so `lq-t34`, `var(--t-17)` … keep working.
 * Summit names (`xxl` … `xs`) mirror the approved design sheet.
 */
export const type = {
  display: { family: "display", weight: 800, size: 48, line: 49, tracking: -0.03 },
  t34: { family: "display", weight: 800, size: 34, line: 36, tracking: -0.026 },
  t28: { family: "display", weight: 800, size: 28, line: 31, tracking: -0.024 },
  t22: { family: "display", weight: 750, size: 22, line: 26, tracking: -0.02 },
  t20: { family: "display", weight: 700, size: 20, line: 24, tracking: -0.015 },
  t17: { family: "display", weight: 700, size: 17, line: 21, tracking: -0.012 },
  t15: { family: "text", weight: 400, size: 15, line: 22, tracking: 0 },
  t13: { family: "text", weight: 500, size: 13.5, line: 19, tracking: 0 },
  t12: { family: "text", weight: 600, size: 12, line: 15, tracking: 0.005 },
  t11: { family: "text", weight: 600, size: 11, line: 13, tracking: 0.01 },
  t10: { family: "text", weight: 600, size: 10.5, line: 12, tracking: 0.01 },
} as const satisfies Record<string, TypeStep>;

/** The Summit display ramp from the design sheet (d-xxl … d-xs) and the text roles. */
export const summitType = {
  "d-xxl": { family: "display", weight: 800, size: 64, line: 63, tracking: -0.035 },
  "d-xl": { family: "display", weight: 800, size: 48, line: 49, tracking: -0.03 },
  "d-lg": { family: "display", weight: 800, size: 36, line: 38, tracking: -0.026 },
  "d-md": { family: "display", weight: 750, size: 26, line: 29, tracking: -0.02 },
  "d-sm": { family: "display", weight: 700, size: 20, line: 24, tracking: -0.015 },
  "d-xs": { family: "display", weight: 700, size: 16, line: 20, tracking: -0.01 },
  lede: { family: "text", weight: 400, size: 16.5, line: 26, tracking: 0 },
  body: { family: "text", weight: 400, size: 15, line: 22.5, tracking: 0 },
  small: { family: "text", weight: 500, size: 13, line: 18, tracking: 0 },
  eyebrow: { family: "text", weight: 650, size: 11.5, line: 14, tracking: 0.09 },
} as const satisfies Record<string, TypeStep>;

/** Numerals are heroes: Archivo 800, tabular, tight. */
export const numerals = {
  /** Big numbers (days, counts, time). */
  thin: { weight: 800, stretch: 100, tracking: -0.03, line: 0.95 },
  /** Stats, table counts. */
  solid: { weight: 800, stretch: 100, tracking: -0.025, line: 1 },
} as const;

/* ---------------------------------------------------------------- layout */

/** Radii 8 · 12 · 16 · 20 · 26 · 32. Old role names map onto the scale. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  "2xl": 32,
  screen: 55,
  sheet: 28,
  hero: 28,
  card: 20,
  panel: 20,
  inner: 16,
  thumb: 12,
  control: 12,
  pill: 999,
} as const;

/** 4pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 11: 44, 12: 48, 14: 56, 16: 64, 18: 72 } as const;

export const layout = {
  contentMax: 1240,
  sidebarWidth: 264, // the original rail (legacy L0)
  sidebarInset: 0,
  topbarHeight: 60,
  announceHeight: 40,
  tabbarHeight: 68,
  tabbarInset: 12,
  tabbarBottom: 14,
  target: 44,
  desktopBreakpoint: 1024,
} as const;

export const z = {
  base: 0,
  backdrop: 0,
  content: 1,
  topbar: 20,
  sidebar: 30,
  edge: 40,
  navbar: 45,
  tabbar: 50,
  progress: 60,
  sheet: 70,
  toast: 80,
} as const;

/* ---------------------------------------------------------------- colour */

/** Theme-independent palette (the design sheet's swatches). */
export const palette = {
  /* Glacier — brand + action */
  "glacier-50": "#EEF6FD",
  "glacier-100": "#DAECFB",
  "glacier-200": "#B4D8F6",
  "glacier-300": "#7DBDEE",
  "glacier-400": "#3FA0E6",
  "glacier-500": "#1A85D6",
  "glacier-600": "#146CB4",
  "glacier-700": "#135690",
  "glacier-800": "#133F66",
  "glacier-900": "#0E2A45",
  /* Ember — energy, streaks, achievement */
  "ember-50": "#FFF3EC",
  "ember-100": "#FFE2D1",
  "ember-200": "#FFC3A1",
  "ember-300": "#FF9C66",
  "ember-400": "#FF7F3F",
  "ember-500": "#F2632A",
  "ember-600": "#D54E17",
  "ember-700": "#A93C12",
  /* Gold — medals only */
  gold: "#E8B43C",
  "gold-50": "#FFF7E3",
  /* Ink + chalk neutrals (warm, never grey mush) */
  "ink-900": "#0E1B2C",
  "ink-800": "#1B2A3D",
  "ink-700": "#2E3D51",
  "ink-600": "#4A5869",
  "ink-500": "#6C7787",
  "ink-400": "#98A0AB",
  "chalk-0": "#FFFFFF",
  "chalk-50": "#FBFAF7",
  "chalk-100": "#F5F2EC",
  "chalk-200": "#ECE7DE",
  "chalk-300": "#DFD8CC",
  /* Legacy palette names → Summit */
  glacier: "#3FA0E6",
  glacierHot: "#EEF6FD",
  glacierDeep: "#146CB4",
  glacierInk: "#135690",
  night: "#101215",
  nightFilm: "#181B20",
  snow: "#F5F2EC",
  snowFilm: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",
} as const;

type ThemeTokens = Record<string, string>;

/** Elevation: three levels of soft, short, real shadow (never glow). */
const elevation = {
  light: {
    "sh-1": "0 1px 2px rgba(14,27,44,.05), 0 0 0 1px rgba(14,27,44,.04)",
    "sh-2": "0 1px 2px rgba(14,27,44,.04), 0 6px 20px -8px rgba(14,27,44,.14)",
    "sh-3": "0 2px 6px rgba(14,27,44,.05), 0 22px 44px -18px rgba(14,27,44,.28)",
    "sh-accent": "0 8px 20px -8px rgba(26,133,214,.55)",
    "sh-warm": "0 8px 20px -8px rgba(242,99,42,.55)",
  },
  dark: {
    "sh-1": "0 0 0 1px rgba(255,255,255,.05)",
    "sh-2": "0 1px 0 rgba(255,255,255,.04) inset, 0 0 0 1px rgba(255,255,255,.03), 0 10px 30px -12px rgba(0,0,0,.6)",
    "sh-3": "0 1px 0 rgba(255,255,255,.05) inset, 0 0 0 1px rgba(255,255,255,.04), 0 30px 60px -20px rgba(0,0,0,.75)",
    "sh-accent": "0 8px 22px -8px rgba(63,160,230,.55)",
    "sh-warm": "0 8px 22px -8px rgba(255,127,63,.5)",
  },
} as const;

/**
 * Semantic colours per theme. Keys become CSS variables (`--key`).
 * Summit roles first; then every Liquid/Trace name mapped onto them.
 */
export const themes = {
  light: {
    /* Summit roles */
    surface: "#FFFFFF",
    "surface-2": "#FBFAF7",
    "surface-sunk": "#F1EDE6",
    "bg-deep": "#EFEAE1",
    line: "#E6E0D6",
    "line-strong": "#D6CEC1",
    text: "#0E1B2C",
    "text-2": "#4A5869",
    "text-3": "#6C7787",
    "accent-strong": "#146CB4",
    "accent-soft-2": "#DAECFB",
    warm: "#F2632A",
    "warm-strong": "#D54E17",
    "warm-soft": "#FFF3EC",
    "warm-ink": "#A93C12",
    ok: "#1F9D6A",
    "ok-soft": "#E5F5EE",
    "ok-ink": "#167A52",
    danger: "#C8352B",
    "danger-soft": "#FCEBE9",
    "gold-ink": "#7A5600",
    "hero-ink": "#0B1726",
    "panel-ink": "#0E1B2C",
    "glass-bar": "rgba(255,255,255,.74)",
    "glass-bar-edge": "inset 0 0 0 1px rgba(255,255,255,.6), 0 10px 30px -10px rgba(14,27,44,.25)",
    ...elevation.light,

    /* Trace roles → Summit */
    ground: "#F5F2EC",
    "ground-2": "#EFEAE1",
    film: "#FFFFFF",
    "film-2": "#FBFAF7",
    edge: "#E6E0D6",
    ink: "#0E1B2C",
    "ink-2": "#4A5869",
    "ink-3": "#6C7787",
    rule: "#E6E0D6",
    trace: "#1A85D6",
    "trace-hot": "#146CB4",
    "trace-dim": "#D6CEC1",
    "trace-glow": "0",
    lines: "#DFD8CC",
    leak: "linear-gradient(transparent, transparent)",
    glow: "0 8px 20px -8px rgba(26,133,214,.55)",
    "glow-soft": "0 6px 16px -8px rgba(26,133,214,.45)",
    "glow-head": "0 0 0 3px rgba(26,133,214,.15)",
    "lift-shadow": "0 1px 2px rgba(14,27,44,.04), 0 6px 20px -8px rgba(14,27,44,.14)",
    exposure: "#F5F2EC",

    /* Liquid names → Summit */
    bg: "#F5F2EC",
    "bg-elev": "#FFFFFF",
    label: "#0E1B2C",
    "label-2": "#4A5869",
    "label-3": "#6C7787",
    sep: "#E6E0D6",
    fill: "#F1EDE6",
    "fill-2": "#ECE7DE",
    track: "#ECE7DE",

    accent: "#1A85D6",
    "accent-hi": "#3FA0E6",
    "accent-deep": "#146CB4",
    "accent-ink": "#135690",
    "accent-soft": "#EEF6FD",
    "on-accent": "#FFFFFF",

    "ring-1": "#1A85D6",
    "ring-1-hi": "#146CB4",
    "ring-2": "#F2632A",
    "ring-2-hi": "#D54E17",
    "ring-3": "#1F9D6A",
    "ring-3-hi": "#167A52",

    /* surfaces (the Glass component): solid white cards; true glass only on bars/overlays */
    "glass-fill": "#FFFFFF",
    "glass-filter": "none",
    "glass-rim": "linear-gradient(transparent, transparent)",
    "glass-hl": "0 0 0 0 transparent",
    "glass-edge": "0 1px 2px rgba(14,27,44,.04), 0 6px 20px -8px rgba(14,27,44,.14)",
    "glass-thick": "rgba(255,255,255,.74)",
    "glass-thick-filter": "blur(22px) saturate(1.6)",
    "glass-solid": "#FFFFFF",
    "lens-fill": "#FFFFFF",
    "lens-edge": "0 1px 2px rgba(14,27,44,.04), 0 6px 20px -8px rgba(14,27,44,.14)",
    "float-shadow": "0 2px 6px rgba(14,27,44,.05), 0 22px 44px -18px rgba(14,27,44,.28)",
    specular: "transparent",
    sweep: "transparent",
    shimmer: "rgba(255,255,255,.65)",
    focus: "#1A85D6",

    wash: "linear-gradient(180deg, rgba(245,242,236,.55) 0%, rgba(245,242,236,.85) 45%, #F5F2EC 100%)",
    "ambient-filter": "blur(60px) saturate(1.1)",
    "edge-tint": "rgba(245,242,236,.92)",
    scrim: "rgba(14,27,44,.45)",

    /* photo grade: retired — photos run in full colour */
    "grade-base": "none",
    "grade-filter": "none",
    "grade-blend": "normal",
    "grade-bg": "#1A1D22",
    "grade-vignette": "linear-gradient(180deg, rgba(8,15,25,0) 45%, rgba(8,15,25,.7))",
    "living-stars": "none",
    "living-snow": "none",

    /* graphics hooks (components/graphics reads --gfx-*): the flat daytime illustration palette */
    "gfx-figure": "#0E1B2C",
    "gfx-figure-far-opacity": ".55",
    "gfx-figure-rim": "rgba(255,255,255,.9)",
    "gfx-specular": "#FFFFFF",
    "gfx-shade": "#0E1B2C",
    "gfx-bell": "#1A85D6",
    "gfx-bell-hi": "#7DBDEE",
    "gfx-bell-lo": "#135690",
    "gfx-glass": "#FFFFFF",
    "gfx-glass-edge": "#0E1B2C",
    "gfx-glass-opacity": ".8",
    "gfx-snow": "#FFFFFF",
    "gfx-terrain": "#2C4A6B",
    "gfx-glacier": "#9CC6EA",
    "gfx-glacier-hi": "#E3F0FB",
    "gfx-glacier-lo": "#6FA6D6",
    "gfx-glacier-deep": "#2C4A6B",
    "gfx-flame": "#F2632A",
    "gfx-flame-hi": "#FF9C66",
    "gfx-flame-lo": "#D54E17",
    "gfx-enamel": "#F2632A",
    "gfx-enamel-hi": "#FF9C66",
    "gfx-enamel-lo": "#A93C12",
    "gfx-glyph": "#0E1B2C",
    "gfx-glyph-accent": "#F2632A",
    "gfx-arc-track": "#ECE7DE",
    "gfx-glow": "rgba(242,99,42,.25)",
    "gfx-kettlebell": "#0E1B2C",
    "gfx-kettlebell-ink": "#FFFFFF",
    "gfx-heat-0": "#F1EDE6",
    "gfx-heat-1": "#FFE2D1",
    "gfx-heat-2": "#FFC3A1",
    "gfx-heat-3": "#FF7F3F",
    "gfx-heat-4": "#F2632A",
    "gfx-heat-ring": "#A93C12",
    "gfx-relief-shadow": "#0E1B2C",
    /* Summit scene palette (sun-up cut paper) */
    "fig-ink": "#0E1B2C",
    "fig-far": "#5F7590",
    "fig-bell": "#1A85D6",
    "fig-gap": "#FFFFFF",
    "fig-shadow": "rgba(14,27,44,.12)",
    "sc-sky1": "#E3F0FB",
    "sc-sky2": "#FBF3EA",
    "sc-sun": "#FF7F3F",
    "sc-sun2": "#FFB27F",
    "sc-mtn": "#9CC6EA",
    "sc-snow": "#FFFFFF",
    "sc-mtn2": "#6FA6D6",
    "sc-ridge": "#2C4A6B",
    "sc-ridge2": "#1D3550",
    "sc-ground": "#F3E5D3",
    "sc-tree": "#2C4A6B",
  },
  dark: {
    surface: "#181B20",
    "surface-2": "#1D2127",
    "surface-sunk": "#14171B",
    "bg-deep": "#0B0C0E",
    line: "#2A2F37",
    "line-strong": "#383E48",
    text: "#F5F2EC",
    "text-2": "#B3B9C2",
    "text-3": "#858D98",
    "accent-strong": "#62B4EE",
    "accent-soft-2": "rgba(63,160,230,.22)",
    warm: "#FF7F3F",
    "warm-strong": "#FF9C66",
    "warm-soft": "rgba(255,127,63,.13)",
    "warm-ink": "#FFB58C",
    ok: "#37C08A",
    "ok-soft": "rgba(55,192,138,.14)",
    "ok-ink": "#6FD9AC",
    danger: "#FF6B5E",
    "danger-soft": "rgba(255,107,94,.14)",
    "gold-ink": "#F5CF73",
    "hero-ink": "#0B1726",
    "panel-ink": "#22272F",
    "glass-bar": "rgba(30,34,40,.74)",
    "glass-bar-edge": "inset 0 0 0 1px rgba(255,255,255,.08), 0 10px 30px -10px rgba(0,0,0,.6)",
    ...elevation.dark,

    ground: "#101215",
    "ground-2": "#0B0C0E",
    film: "#181B20",
    "film-2": "#1D2127",
    edge: "#2A2F37",
    ink: "#F5F2EC",
    "ink-2": "#B3B9C2",
    "ink-3": "#858D98",
    rule: "#2A2F37",
    trace: "#3FA0E6",
    "trace-hot": "#8CCBF5",
    "trace-dim": "#383E48",
    "trace-glow": "0",
    lines: "#2A2F37",
    leak: "linear-gradient(transparent, transparent)",
    glow: "0 8px 22px -8px rgba(63,160,230,.55)",
    "glow-soft": "0 6px 16px -8px rgba(63,160,230,.45)",
    "glow-head": "0 0 0 3px rgba(63,160,230,.2)",
    "lift-shadow": "0 10px 30px -12px rgba(0,0,0,.6)",
    exposure: "#101215",

    bg: "#101215",
    "bg-elev": "#181B20",
    label: "#F5F2EC",
    "label-2": "#B3B9C2",
    "label-3": "#858D98",
    sep: "#2A2F37",
    fill: "#14171B",
    "fill-2": "#22272F",
    track: "#2A2F37",

    accent: "#3FA0E6",
    "accent-hi": "#62B4EE",
    "accent-deep": "#1A85D6",
    "accent-ink": "#8CCBF5",
    "accent-soft": "rgba(63,160,230,.13)",
    "on-accent": "#FFFFFF",

    "ring-1": "#3FA0E6",
    "ring-1-hi": "#8CCBF5",
    "ring-2": "#FF7F3F",
    "ring-2-hi": "#FFB58C",
    "ring-3": "#37C08A",
    "ring-3-hi": "#6FD9AC",

    "glass-fill": "#181B20",
    "glass-filter": "none",
    "glass-rim": "linear-gradient(transparent, transparent)",
    "glass-hl": "0 0 0 0 transparent",
    "glass-edge": "0 1px 0 rgba(255,255,255,.04) inset, 0 0 0 1px rgba(255,255,255,.03), 0 10px 30px -12px rgba(0,0,0,.6)",
    "glass-thick": "rgba(30,34,40,.74)",
    "glass-thick-filter": "blur(22px) saturate(1.4)",
    "glass-solid": "#181B20",
    "lens-fill": "#22272F",
    "lens-edge": "0 1px 0 rgba(255,255,255,.05) inset, 0 6px 16px -8px rgba(0,0,0,.6)",
    "float-shadow": "0 30px 60px -20px rgba(0,0,0,.75)",
    specular: "transparent",
    sweep: "transparent",
    shimmer: "rgba(255,255,255,.05)",
    focus: "#62B4EE",

    wash: "linear-gradient(180deg, rgba(16,18,21,.5) 0%, rgba(16,18,21,.85) 45%, #101215 100%)",
    "ambient-filter": "blur(60px) saturate(1.05) brightness(.7)",
    "edge-tint": "rgba(16,18,21,.9)",
    scrim: "rgba(0,0,0,.55)",

    "grade-base": "none",
    "grade-filter": "none",
    "grade-blend": "normal",
    "grade-bg": "#1A1D22",
    "grade-vignette": "linear-gradient(180deg, rgba(8,15,25,0) 40%, rgba(8,15,25,.75))",
    "living-stars": "none",
    "living-snow": "none",

    "gfx-figure": "#F1EEE8",
    "gfx-figure-far-opacity": ".5",
    "gfx-figure-far-opacity-dark": ".5",
    "gfx-figure-rim": "rgba(24,27,32,.9)",
    "gfx-figure-rim-dark": "rgba(24,27,32,.9)",
    "gfx-specular": "#FFFFFF",
    "gfx-shade": "#0B0C0E",
    "gfx-bell": "#3FA0E6",
    "gfx-bell-hi": "#8CCBF5",
    "gfx-bell-lo": "#1A85D6",
    "gfx-glass": "#181B20",
    "gfx-glass-edge": "#F1EEE8",
    "gfx-glass-edge-dark": "#F1EEE8",
    "gfx-glass-opacity": ".7",
    "gfx-glass-opacity-dark": ".7",
    "gfx-snow": "#E9F2FB",
    "gfx-terrain": "#3B5D80",
    "gfx-glacier": "#3B5D80",
    "gfx-glacier-hi": "#E9F2FB",
    "gfx-glacier-lo": "#2E4D6E",
    "gfx-glacier-deep": "#0F1A27",
    "gfx-flame": "#FF7F3F",
    "gfx-flame-hi": "#FFB58C",
    "gfx-flame-lo": "#D54E17",
    "gfx-enamel": "#FF7F3F",
    "gfx-enamel-hi": "#FFB58C",
    "gfx-enamel-lo": "#A93C12",
    "gfx-glyph": "#F5F2EC",
    "gfx-glyph-accent": "#FF7F3F",
    "gfx-arc-track": "#2A2F37",
    "gfx-glow": "rgba(255,127,63,.25)",
    "gfx-kettlebell": "#F5F2EC",
    "gfx-kettlebell-ink": "#101215",
    "gfx-heat-0": "#1D2127",
    "gfx-heat-1": "rgba(255,127,63,.25)",
    "gfx-heat-2": "rgba(255,127,63,.45)",
    "gfx-heat-3": "rgba(255,127,63,.75)",
    "gfx-heat-4": "#FF7F3F",
    "gfx-heat-ring": "#FFB58C",
    "gfx-relief-shadow": "#000000",
    "fig-ink": "#F1EEE8",
    "fig-far": "#8E9BAD",
    "fig-bell": "#3FA0E6",
    "fig-gap": "#181B20",
    "fig-shadow": "rgba(0,0,0,.35)",
    "sc-sky1": "#1C2A3B",
    "sc-sky2": "#2B2622",
    "sc-sun": "#FF8A4C",
    "sc-sun2": "#FFB27F",
    "sc-mtn": "#3B5D80",
    "sc-snow": "#E9F2FB",
    "sc-mtn2": "#2E4D6E",
    "sc-ridge": "#0F1A27",
    "sc-ridge2": "#0A121C",
    "sc-ground": "#2A2520",
    "sc-tree": "#0F1A27",
  },
} as const satisfies Record<"light" | "dark", ThemeTokens>;

export type ThemeName = keyof typeof themes;
export type ThemePreference = ThemeName | "system";

/**
 * The ink panel: stays dark in both themes (the resume card body, video, completion, photo heroes).
 * Applied with `.lq-night` (dark tokens plus these).
 */
export const night = {
  "night-ground": "#0E1B2C",
  "night-mountain": "#0B1726",
  "night-ridge": "rgba(255,255,255,.18)",
} as const;

/** Graphics hooks that do not change with the theme: kept for components/graphics (illustrator owns the art). */
export const gfxGlobal = {
  "gfx-night-sky": "#1C2A3B",
  "gfx-night-sky-low": "#2B2622",
  "gfx-night-ground": "#2A2520",
  "gfx-night-pines": "#0F1A27",
  "gfx-sky-night-top": "#101A26",
  "gfx-sky-night-mid": "#1C2A3B",
  "gfx-sky-night-low": "#2B2622",
  "gfx-sky-night-light": "#3FA0E6",
  "gfx-sky-night-glow": "#FF8A4C",
  "gfx-sky-night-moon": "#FFF3EC",
  "gfx-sky-night-mountain": "#3B5D80",
  "gfx-sky-night-mountain-low": "#2E4D6E",
  "gfx-sky-night-ridge": "#0F1A27",
  "gfx-sky-night-snow": "#E9F2FB",
  /* sun-up: warm first light over glacier blue */
  "gfx-sky-dawn-alpenglow": "#FFC3A1",
  "gfx-sky-dawn-glow": "#FFE2D1",
  "gfx-sky-dawn-low": "#FBF3EA",
  "gfx-sky-dusk-alpenglow": "#FF9C66",
  "gfx-sky-dusk-glow": "#FFB27F",
  "gfx-sky-dusk-low": "#F3E5D3",
  "gfx-sky-dusk-snow": "#FFFFFF",
  "gfx-sky-dusk-sun": "#FF7F3F",
} as const;

/** Glass over photography (photo badges, video controls): ink-tinted blur, white content in both themes. */
export const clearGlass = {
  "clear-fill": "rgba(10,18,30,.45)",
  "clear-filter": "blur(18px) saturate(1.4)",
  "clear-hl": "inset 0 0 0 1px rgba(255,255,255,.16)",
  "clear-rim": "linear-gradient(transparent, transparent)",
  "clear-deep-fill": "rgba(10,18,30,.62)",
  "clear-deep-filter": "blur(18px) saturate(1.4)",
  "lens-rim": "linear-gradient(transparent, transparent)",
  "photo-scrim": "linear-gradient(rgba(8,15,25,.55), transparent)",
  /* the three photo scrims (one ink scrim for legibility, never a tint) */
  "scrim-left": "linear-gradient(90deg, rgba(8,15,25,.92) 0%, rgba(8,15,25,.78) 30%, rgba(8,15,25,.25) 58%, rgba(8,15,25,0) 75%)",
  "scrim-bottom": "linear-gradient(180deg, rgba(8,15,25,0) 38%, rgba(8,15,25,.82) 100%)",
  "scrim-soft": "linear-gradient(180deg, rgba(8,15,25,0) 55%, rgba(8,15,25,.55) 100%)",
} as const;

/* ---------------------------------------------------------------- motion */

/**
 * Motion: Rise (content enters 10px up with a fade, staggered 40ms), Fill (bars, rings and the
 * climb route draw on view), Celebrate (spring pop, confetti), Breathe (the "you are here" pulse).
 * Presses answer instantly (80ms squeeze, spring back). Off under prefers-reduced-motion.
 */
export const motion = {
  ease: {
    spring: "cubic-bezier(.34, 1.56, .64, 1)",
    springSoft: "cubic-bezier(.3, 1.25, .6, 1)",
    out: "cubic-bezier(.2, .8, .2, 1)",
    inOut: "cubic-bezier(.65, 0, .35, 1)",
    expose: "cubic-bezier(.2, .8, .2, 1)",
  },
  duration: {
    press: 320,
    pressIn: 80,
    sweep: 650,
    lens: 420,
    toggle: 320,
    ring: 700,
    ringStagger: 90,
    expose: 700,
    fill: 700,
    ticker: 900,
    stretch: 300,
    orbit: 900,
    streak: 4500,
    streakDelay: 1200,
    flare: 1200,
    celebrate: 1200,
    breathe: 4000,
    check: 360,
    pulse: 700,
    sheet: 380,
    toast: 320,
    shimmer: 1500,
    lift: 280,
    rise: 600,
    riseStagger: 40,
    page: 220,
    fast: 140,
  },
  /** Physics springs (React Native Reanimated / Motion). */
  springs: {
    press: { stiffness: 520, damping: 30, mass: 1 },
    lens: { stiffness: 420, damping: 34, mass: 1 },
    sheet: { stiffness: 320, damping: 34, mass: 1 },
    ring: { stiffness: 140, damping: 20, mass: 1 },
    flare: { stiffness: 260, damping: 14, mass: 1 },
  },
  pressScale: 0.97,
  liftY: -2,
  parallax: 0,
  rubberBand: 0.55,
  sheetDismiss: 0.25,
  stretch: 1.12,
  stretchNumber: { from: 100, mid: 100 },
} as const;

/* ---------------------------------------------------------------- trace (retired) */

/** Kept for API compatibility with Trace drawings; Summit lines are solid with a dotted path ahead. */
export const trace = {
  segments: 1,
  floor: 1,
  glowWidth: 0,
  glowOpacity: { light: 0, dark: 0, night: 0 },
  headRadius: 0,
  haloRadius: 0,
  aheadDash: "0 7",
} as const;

/* ------------------------------------------------------------------ icon */

/** Lucide geometry, 1.85 stroke, round caps. */
export const icon = {
  size: { xs: 14, sm: 17, md: 20, tab: 22, lg: 28 },
  stroke: { xs: 2.2, sm: 2, md: 1.85, tab: 1.85, lg: 1.7 },
  point: 0,
} as const;

export const tokens = { font, width, type, summitType, numerals, radius, space, layout, z, palette, themes, night, gfxGlobal, clearGlass, motion, trace, icon } as const;
export default tokens;
