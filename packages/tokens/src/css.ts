import { clearGlass, font, gfxGlobal, layout, motion, night, numerals, radius, space, themes, trace, type, width, z } from "./tokens";

const block = (selector: string, vars: Record<string, string | number>, extra = "") =>
  `${selector} {\n${extra}${Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n")}\n}\n`;

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** The nearest CSS font-stretch keyword at or below a percentage (the `font` shorthand only takes keywords). */
function stretchKeyword(p: number) {
  if (p >= 150) return "extra-expanded";
  if (p >= 125) return "expanded";
  if (p >= 112.5) return "semi-expanded";
  return "";
}

/** All theme-independent tokens as CSS variables. */
export function globalVars(): Record<string, string | number> {
  const v: Record<string, string | number> = { font: font.stack, "font-text": font.stack, "font-display": font.display, "font-code": font.mono };
  for (const [k, t] of Object.entries(type)) {
    const n = k.replace(/^t/, "");
    const fam = t.family === "display" ? "var(--font-display)" : "var(--font)";
    const st = "stretch" in t && t.stretch ? stretchKeyword(t.stretch) : "";
    v[`t-${n}`] = `${t.weight}${st ? " " + st : ""} ${t.size}px/${t.line}px ${fam}`;
    v[`t-${n}-track`] = `${t.tracking}em`;
    v[`t-${n}-size`] = `${t.size}px`;
    v[`t-${n}-line`] = `${t.line}px`;
    v[`t-${n}-weight`] = t.weight;
    v[`t-${n}-stretch`] = `${"stretch" in t && t.stretch ? t.stretch : 100}%`;
  }
  for (const [k, w] of Object.entries(width)) v[`w-${k}`] = `${w}%`;
  for (const [k, n] of Object.entries(numerals)) {
    v[`num-${k}-weight`] = n.weight;
    v[`num-${k}-stretch`] = `${n.stretch}%`;
    v[`num-${k}-track`] = `${n.tracking}em`;
    v[`num-${k}-line`] = n.line;
  }
  for (const [k, r] of Object.entries(radius)) v[`r-${k}`] = `${r}px`;
  for (const [k, s] of Object.entries(space)) v[`s-${k}`] = `${s}px`;
  for (const [k, e] of Object.entries(motion.ease)) v[`curve-${kebab(k)}`] = e;
  for (const [k, d] of Object.entries(motion.duration)) v[`dur-${kebab(k)}`] = `${d}ms`;
  v["press-scale"] = motion.pressScale;
  v["lift-y"] = `${motion.liftY}px`;
  v["parallax"] = motion.parallax;
  v["stretch"] = motion.stretch;
  v["trace-floor"] = trace.floor;
  v["trace-ahead-dash"] = `"${trace.aheadDash}"`;
  for (const [k, n] of Object.entries(z)) v[`z-${k}`] = n;
  v["content-max"] = `${layout.contentMax}px`;
  v["sidebar-w"] = `${layout.sidebarWidth}px`;
  v["sidebar-inset"] = `${layout.sidebarInset}px`;
  v["tabbar-h"] = `${layout.tabbarHeight}px`;
  v["tabbar-inset"] = `${layout.tabbarInset}px`;
  v["tabbar-bottom"] = `${layout.tabbarBottom}px`;
  v["target"] = `${layout.target}px`;
  for (const [k, g] of Object.entries(clearGlass)) v[k] = g;
  for (const [k, g] of Object.entries(night)) v[k] = g;
  for (const [k, g] of Object.entries(gfxGlobal)) v[k] = g;
  return v;
}

export function toCss(): string {
  const head = `/* GENERATED from tokens.ts by \`pnpm --filter @ms/tokens build:css\`. Do not edit by hand. */\n\n`;
  const scheme = (s: string) => `  color-scheme: ${s};\n`;
  return (
    head +
    block(":root", { ...globalVars(), ...themes.light }, scheme("light")) +
    "\n" +
    block('[data-theme="light"]', themes.light, scheme("light")) +
    "\n" +
    block('[data-theme="dark"]', themes.dark, scheme("dark")) +
    "\n@media (prefers-color-scheme: dark) {\n" +
    block(':root:not([data-theme="light"]), [data-theme="system"]', themes.dark, scheme("dark"))
      .split("\n")
      .map((l) => (l ? "  " + l : l))
      .join("\n") +
    "}\n" +
    "\n/* Night panel: stays a night exposure in both themes (heroes, video, completion). */\n" +
    block(".lq-night", themes.dark, scheme("dark"))
  );
}
