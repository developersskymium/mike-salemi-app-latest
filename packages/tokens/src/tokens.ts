/**
 * SUMMIT v4 design tokens — the single source of truth (approved Nov 20, refines Summit).
 *
 * Porcelain ground (#F6F7F9), white surfaces defined by a 1px ink hairline (8%), no shadow at rest;
 * one raised card per view carries a layered soft shadow. Cool ink neutrals. Glacier blue means
 * "do this" (primary actions); ember orange is progress, streaks and achievement; gold is for medals.
 * Instrument Sans for everything (tight tracking on big headlines, tabular numbers); Instrument
 * Serif italic only for Mike's notes and quotes. Photos run in full colour, never graded.
 *
 * Web reads these as CSS custom properties (tokens.css, generated from this file by
 * `pnpm --filter @ms/tokens build:css`). React Native reads the same constants.
 * Token NAMES from the Liquid, Trace and Summit systems are kept (pages use them) and now resolve
 * to v4 values; v4 adds `--sh-raised`, `--sh-hover`, `--font-serif`, `--text-4` alongside.
 */

/* ------------------------------------------------------------------ type */

export const font = {
  /** Everything: Instrument Sans (variable 400–700). `--ff-sans` is set by next/font with size-matched fallbacks. */
  stack: 'var(--ff-sans, "Instrument Sans"), "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Headlines and numbers: the same family at 600 with tight tracking. */
  display: 'var(--ff-sans, "Instrument Sans"), "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Mike's notes and quotes only: Instrument Serif, italic. */
  serif: 'var(--ff-serif, "Instrument Serif"), "Instrument Serif", Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  features: '"kern" 1',
  /** Self-hosted from @fontsource (latin), loaded and preloaded by next/font/local in app/layout. */
  files: {
    display: "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
    text: "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
    serif: "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
  },
  /** next/font preloads both files; nothing to add by hand. */
  preload: [] as string[],
} as const;

/** Width presets (font-stretch %). v4 never stretches type: every preset is normal width. */
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
 * Scale. Display steps are Instrument Sans 600 with tight tracking; text steps are Instrument Sans 420–600.
 * Keys are kept from the Liquid scale so `lq-t34`, `var(--t-17)` … keep working.
 * Summit names (`xxl` … `xs`) mirror the approved v4 sheet.
 */
export const type = {
  display: { family: "display", weight: 600, size: 48, line: 50, tracking: -0.04 },
  t34: { family: "display", weight: 600, size: 34, line: 37, tracking: -0.035 },
  t28: { family: "display", weight: 600, size: 28, line: 32, tracking: -0.03 },
  t22: { family: "display", weight: 600, size: 22, line: 27, tracking: -0.025 },
  t20: { family: "display", weight: 600, size: 20, line: 25, tracking: -0.02 },
  t17: { family: "display", weight: 600, size: 17, line: 22, tracking: -0.015 },
  t15: { family: "text", weight: 420, size: 15, line: 22, tracking: -0.003 },
  t13: { family: "text", weight: 500, size: 13.5, line: 19, tracking: 0 },
  t12: { family: "text", weight: 550, size: 12, line: 16, tracking: 0.003 },
  t11: { family: "text", weight: 600, size: 11, line: 14, tracking: 0.01 },
  t10: { family: "text", weight: 600, size: 10.5, line: 12, tracking: 0.02 },
} as const satisfies Record<string, TypeStep>;

/** The v4 display ramp (d-xxl … d-xs) and the text roles. */
export const summitType = {
  "d-xxl": { family: "display", weight: 600, size: 64, line: 62, tracking: -0.045 },
  "d-xl": { family: "display", weight: 600, size: 48, line: 50, tracking: -0.04 },
  "d-lg": { family: "display", weight: 600, size: 36, line: 39, tracking: -0.035 },
  "d-md": { family: "display", weight: 600, size: 26, line: 29, tracking: -0.025 },
  "d-sm": { family: "display", weight: 600, size: 20, line: 25, tracking: -0.02 },
  "d-xs": { family: "display", weight: 600, size: 16, line: 20, tracking: -0.012 },
  lede: { family: "text", weight: 420, size: 16.5, line: 26, tracking: -0.003 },
  body: { family: "text", weight: 420, size: 15, line: 22.5, tracking: -0.003 },
  small: { family: "text", weight: 450, size: 13, line: 18, tracking: 0 },
  eyebrow: { family: "text", weight: 600, size: 11, line: 14, tracking: 0.07 },
} as const satisfies Record<string, TypeStep>;

/** Numerals carry the card: Instrument Sans 600, tabular lining, tight. */
export const numerals = {
  /** Big numbers (days, counts, time). */
  thin: { weight: 600, stretch: 100, tracking: -0.035, line: 0.92 },
  /** Stats, table counts. */
  solid: { weight: 600, stretch: 100, tracking: -0.025, line: 1 },
} as const;

/* ---------------------------------------------------------------- layout */

/** Radii 8 · 12 · 14 · 20 · 24 (hero). Concentric: inner = outer − padding. Old role names map onto the scale. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 28,
  screen: 55,
  sheet: 28,
  hero: 24,
  card: 20,
  panel: 20,
  inner: 14,
  media: 14,
  thumb: 8,
  control: 12,
  pill: 999,
} as const;

/** 4pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 11: 44, 12: 48, 14: 56, 16: 64, 18: 72 } as const;

export const layout = {
  contentMax: 1240,
  sidebarWidth: 248, // the v4 rail (on the ground)
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
  "glacier-50": "#EEF5FC",
  "glacier-100": "#DCEBF8",
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
  "ember-100": "#FFE4D4",
  "ember-200": "#FFC3A1",
  "ember-300": "#FF9C66",
  "ember-400": "#FF7F3F",
  "ember-500": "#F2632A",
  "ember-600": "#D54E17",
  "ember-700": "#A93C12",
  /* Gold — medals only */
  gold: "#E8B43C",
  "gold-50": "#FFF7E3",
  /* Ink + porcelain neutrals (cool, crisp) */
  "ink-900": "#0E1B2C",
  "ink-800": "#1B2A3D",
  "ink-700": "#2E3D51",
  "ink-600": "#435063",
  "ink-500": "#717C8B",
  "ink-400": "#A1A9B4",
  "chalk-0": "#FFFFFF",
  "chalk-50": "#FBFCFD",
  "chalk-100": "#F6F7F9",
  "chalk-200": "#EEF0F3",
  "chalk-300": "#E3E7EC",
  /* Legacy palette names → Summit */
  glacier: "#3FA0E6",
  glacierHot: "#EEF5FC",
  glacierDeep: "#146CB4",
  glacierInk: "#135690",
  night: "#0B111A",
  nightFilm: "#121A25",
  snow: "#F6F7F9",
  snowFilm: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",
} as const;

type ThemeTokens = Record<string, string>;

/**
 * Elevation (v4): resting surfaces are a 1px ink hairline with NO shadow (sh-1, sh-2). Only the one
 * raised card per view, floating panels and hover get a layered soft shadow (sh-3 / sh-raised).
 */
const elevation = {
  light: {
    "sh-1": "0 0 0 1px rgba(14,27,44,.08)",
    "sh-2": "0 0 0 1px rgba(14,27,44,.08)",
    "sh-3": "0 0 0 1px rgba(14,27,44,.06), 0 1px 2px rgba(14,27,44,.05), 0 8px 16px -6px rgba(14,27,44,.08), 0 28px 48px -20px rgba(14,27,44,.18)",
    "sh-raised": "0 0 0 1px rgba(14,27,44,.06), 0 1px 2px rgba(14,27,44,.05), 0 8px 16px -6px rgba(14,27,44,.08), 0 28px 48px -20px rgba(14,27,44,.18)",
    "sh-hover": "0 0 0 1px rgba(14,27,44,.14), 0 2px 4px rgba(14,27,44,.04), 0 12px 24px -12px rgba(14,27,44,.14)",
    "sh-accent": "inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 1px rgba(10,80,140,.25), 0 1px 2px rgba(10,60,110,.2), 0 6px 14px -6px rgba(26,133,214,.55)",
    "sh-warm": "inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 1px rgba(150,50,10,.22), 0 1px 2px rgba(120,40,10,.18), 0 6px 14px -6px rgba(242,99,42,.5)",
    "sh-control": "inset 0 0 0 1px rgba(14,27,44,.14), 0 1px 2px rgba(14,27,44,.03)",
    "sh-focus": "inset 0 0 0 1.5px #1A85D6, 0 0 0 4px rgba(26,133,214,.12)",
    "sh-error": "inset 0 0 0 1.5px #C8352B, 0 0 0 4px rgba(200,53,43,.08)",
  },
  dark: {
    "sh-1": "0 0 0 1px rgba(255,255,255,.07)",
    "sh-2": "0 0 0 1px rgba(255,255,255,.07)",
    "sh-3": "0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.04), 0 24px 48px -20px rgba(0,0,0,.7)",
    "sh-raised": "0 0 0 1px rgba(255,255,255,.09), inset 0 1px 0 rgba(255,255,255,.05), 0 24px 48px -20px rgba(0,0,0,.7)",
    "sh-hover": "0 0 0 1px rgba(255,255,255,.14), 0 12px 24px -12px rgba(0,0,0,.6)",
    "sh-accent": "inset 0 1px 0 rgba(255,255,255,.18), 0 0 0 1px rgba(63,160,230,.35), 0 6px 16px -6px rgba(26,133,214,.5)",
    "sh-warm": "inset 0 1px 0 rgba(255,255,255,.18), 0 6px 16px -6px rgba(255,127,63,.45)",
    "sh-control": "inset 0 0 0 1px rgba(255,255,255,.12)",
    "sh-focus": "inset 0 0 0 1.5px #62B4EE, 0 0 0 4px rgba(98,180,238,.18)",
    "sh-error": "inset 0 0 0 1.5px #FF6B5E, 0 0 0 4px rgba(255,107,94,.12)",
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
    "surface-2": "#FBFCFD",
    "surface-sunk": "#F0F2F5",
    "bg-deep": "#EBEEF2",
    /* Sidebar (desktop rail): its own light surface, set apart from the body by a hairline. */
    rail: "#FFFFFF",
    "rail-line": "rgba(14,27,44,.09)",
    "rail-hover": "#F3F5F8",
    "rail-active": "#EAF2FB",
    line: "rgba(14,27,44,.08)",
    "line-strong": "rgba(14,27,44,.14)",
    text: "#0E1B2C",
    "text-2": "#435063",
    "text-3": "#717C8B",
    "text-4": "#A1A9B4",
    "accent-strong": "#146CB4",
    "accent-soft-2": "#DCEBF8",
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
    "glass-bar": "rgba(255,255,255,.86)",
    "glass-bar-edge": "0 0 0 1px rgba(14,27,44,.08), 0 12px 30px -10px rgba(14,27,44,.22)",
    ...elevation.light,

    /* Trace roles → Summit */
    ground: "#F6F7F9",
    "ground-2": "#EEF0F3",
    film: "#FFFFFF",
    "film-2": "#FBFCFD",
    edge: "rgba(14,27,44,.08)",
    ink: "#0E1B2C",
    "ink-2": "#435063",
    "ink-3": "#717C8B",
    rule: "rgba(14,27,44,.08)",
    trace: "#1A85D6",
    "trace-hot": "#146CB4",
    "trace-dim": "rgba(14,27,44,.14)",
    "trace-glow": "0",
    lines: "#E3E7EC",
    leak: "linear-gradient(transparent, transparent)",
    glow: "0 6px 14px -6px rgba(26,133,214,.5)",
    "glow-soft": "0 4px 10px -6px rgba(26,133,214,.4)",
    "glow-head": "0 0 0 3px rgba(26,133,214,.15)",
    "lift-shadow": "0 0 0 1px rgba(14,27,44,.08)",
    exposure: "#F6F7F9",

    /* Liquid names → Summit */
    bg: "#F6F7F9",
    "bg-elev": "#FFFFFF",
    label: "#0E1B2C",
    "label-2": "#435063",
    "label-3": "#717C8B",
    sep: "rgba(14,27,44,.08)",
    fill: "#F0F2F5",
    "fill-2": "#E8EBEF",
    track: "#E8EBEF",

    accent: "#1A85D6",
    "accent-hi": "#3FA0E6",
    "accent-deep": "#146CB4",
    "accent-ink": "#135690",
    "accent-soft": "#EEF5FC",
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
    "glass-edge": "0 0 0 1px rgba(14,27,44,.08)",
    "glass-thick": "rgba(255,255,255,.86)",
    "glass-thick-filter": "blur(22px) saturate(1.6)",
    "glass-solid": "#FFFFFF",
    "lens-fill": "#FFFFFF",
    "lens-edge": "0 0 0 1px rgba(14,27,44,.08), 0 1px 3px rgba(14,27,44,.08)",
    "float-shadow": "0 0 0 1px rgba(14,27,44,.06), 0 1px 2px rgba(14,27,44,.05), 0 8px 16px -6px rgba(14,27,44,.08), 0 28px 48px -20px rgba(14,27,44,.18)",
    specular: "transparent",
    sweep: "transparent",
    shimmer: "rgba(255,255,255,.7)",
    focus: "#1A85D6",

    wash: "linear-gradient(180deg, rgba(246,247,249,.55) 0%, rgba(246,247,249,.85) 45%, #F6F7F9 100%)",
    "ambient-filter": "blur(60px) saturate(1.1)",
    "edge-tint": "rgba(246,247,249,.92)",
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
    "gfx-arc-track": "#E8EBEF",
    "gfx-glow": "rgba(242,99,42,.25)",
    "gfx-kettlebell": "#0E1B2C",
    "gfx-kettlebell-ink": "#FFFFFF",
    "gfx-heat-0": "#F0F2F5",
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
    "sc-sky1": "#FFFFFF",
    "sc-sky2": "#F1F6FB",
    "sc-sun": "#F2632A",
    "sc-sun2": "#FFC6A6",
    "sc-mtn": "#C9DFF3",
    "sc-snow": "#FFFFFF",
    "sc-mtn2": "#8DB6DD",
    "sc-ridge": "#30506F",
    "sc-ridge2": "#1D3550",
    "sc-ground": "#F4F7FA",
    "sc-tree": "#2C4A6B",
  },
  dark: {
    surface: "#121A25",
    "surface-2": "#16202C",
    "surface-sunk": "#0E151F",
    "bg-deep": "#070B11",
    rail: "#121A25",
    "rail-line": "rgba(255,255,255,.08)",
    "rail-hover": "rgba(255,255,255,.04)",
    "rail-active": "rgba(63,160,230,.14)",
    line: "rgba(255,255,255,.08)",
    "line-strong": "rgba(255,255,255,.14)",
    text: "#EEF2F6",
    "text-2": "#AAB4C1",
    "text-3": "#7E8999",
    "text-4": "#566273",
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
    "panel-ink": "#1A2431",
    "glass-bar": "rgba(18,26,37,.82)",
    "glass-bar-edge": "0 0 0 1px rgba(255,255,255,.08), 0 12px 30px -10px rgba(0,0,0,.6)",
    ...elevation.dark,

    ground: "#0B111A",
    "ground-2": "#070B11",
    film: "#121A25",
    "film-2": "#16202C",
    edge: "rgba(255,255,255,.08)",
    ink: "#EEF2F6",
    "ink-2": "#AAB4C1",
    "ink-3": "#7E8999",
    rule: "rgba(255,255,255,.08)",
    trace: "#3FA0E6",
    "trace-hot": "#8CCBF5",
    "trace-dim": "rgba(255,255,255,.14)",
    "trace-glow": "0",
    lines: "#223040",
    leak: "linear-gradient(transparent, transparent)",
    glow: "0 8px 22px -8px rgba(63,160,230,.55)",
    "glow-soft": "0 6px 16px -8px rgba(63,160,230,.45)",
    "glow-head": "0 0 0 3px rgba(63,160,230,.2)",
    "lift-shadow": "0 0 0 1px rgba(255,255,255,.07)",
    exposure: "#0B111A",

    bg: "#0B111A",
    "bg-elev": "#121A25",
    label: "#EEF2F6",
    "label-2": "#AAB4C1",
    "label-3": "#7E8999",
    sep: "rgba(255,255,255,.08)",
    fill: "#0E151F",
    "fill-2": "#1A2431",
    track: "#1E2936",

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

    "glass-fill": "#121A25",
    "glass-filter": "none",
    "glass-rim": "linear-gradient(transparent, transparent)",
    "glass-hl": "0 0 0 0 transparent",
    "glass-edge": "0 0 0 1px rgba(255,255,255,.07)",
    "glass-thick": "rgba(18,26,37,.82)",
    "glass-thick-filter": "blur(22px) saturate(1.4)",
    "glass-solid": "#121A25",
    "lens-fill": "#1E2936",
    "lens-edge": "0 0 0 1px rgba(255,255,255,.08), 0 1px 3px rgba(0,0,0,.4)",
    "float-shadow": "0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.04), 0 24px 48px -20px rgba(0,0,0,.7)",
    specular: "transparent",
    sweep: "transparent",
    shimmer: "rgba(255,255,255,.05)",
    focus: "#62B4EE",

    wash: "linear-gradient(180deg, rgba(11,17,26,.5) 0%, rgba(11,17,26,.85) 45%, #0B111A 100%)",
    "ambient-filter": "blur(60px) saturate(1.05) brightness(.7)",
    "edge-tint": "rgba(11,17,26,.9)",
    scrim: "rgba(0,0,0,.55)",

    "grade-base": "none",
    "grade-filter": "none",
    "grade-blend": "normal",
    "grade-bg": "#1A1D22",
    "grade-vignette": "linear-gradient(180deg, rgba(8,15,25,0) 40%, rgba(8,15,25,.75))",
    "living-stars": "none",
    "living-snow": "none",

    "gfx-figure": "#EEF2F6",
    "gfx-figure-far-opacity": ".5",
    "gfx-figure-far-opacity-dark": ".5",
    "gfx-figure-rim": "rgba(18,26,37,.9)",
    "gfx-figure-rim-dark": "rgba(18,26,37,.9)",
    "gfx-specular": "#FFFFFF",
    "gfx-shade": "#070B11",
    "gfx-bell": "#3FA0E6",
    "gfx-bell-hi": "#8CCBF5",
    "gfx-bell-lo": "#1A85D6",
    "gfx-glass": "#121A25",
    "gfx-glass-edge": "#EEF2F6",
    "gfx-glass-edge-dark": "#EEF2F6",
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
    "gfx-glyph": "#EEF2F6",
    "gfx-glyph-accent": "#FF7F3F",
    "gfx-arc-track": "#1E2936",
    "gfx-glow": "rgba(255,127,63,.25)",
    "gfx-kettlebell": "#EEF2F6",
    "gfx-kettlebell-ink": "#0B111A",
    "gfx-heat-0": "#16202C",
    "gfx-heat-1": "rgba(255,127,63,.25)",
    "gfx-heat-2": "rgba(255,127,63,.45)",
    "gfx-heat-3": "rgba(255,127,63,.75)",
    "gfx-heat-4": "#FF7F3F",
    "gfx-heat-ring": "#FFB58C",
    "gfx-relief-shadow": "#000000",
    "fig-ink": "#EEF2F6",
    "fig-far": "#8E9BAD",
    "fig-bell": "#3FA0E6",
    "fig-gap": "#121A25",
    "fig-shadow": "rgba(0,0,0,.35)",
    "sc-sky1": "#1C2A3B",
    "sc-sky2": "#16202C",
    "sc-sun": "#FF8A4C",
    "sc-sun2": "#FFB27F",
    "sc-mtn": "#3B5D80",
    "sc-snow": "#E9F2FB",
    "sc-mtn2": "#2E4D6E",
    "sc-ridge": "#0F1A27",
    "sc-ridge2": "#0A121C",
    "sc-ground": "#141E2A",
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
