import { clearGlass, font, layout, motion, radius, space, themes, type, z } from "./tokens";

const block = (selector: string, vars: Record<string, string | number>, extra = "") =>
  `${selector} {\n${extra}${Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n")}\n}\n`;

/** All theme-independent tokens as CSS variables. */
export function globalVars(): Record<string, string | number> {
  const v: Record<string, string | number> = { font: font.stack, "font-code": font.mono };
  for (const [k, t] of Object.entries(type)) {
    const n = k.replace(/^t/, "");
    v[`t-${n}`] = `${t.weight} ${t.size}px/${t.line}px var(--font)`;
    v[`t-${n}-track`] = `${t.tracking}em`;
    v[`t-${n}-size`] = `${t.size}px`;
    v[`t-${n}-line`] = `${t.line}px`;
    v[`t-${n}-weight`] = t.weight;
  }
  for (const [k, r] of Object.entries(radius)) v[`r-${k}`] = `${r}px`;
  for (const [k, s] of Object.entries(space)) v[`s-${k}`] = `${s}px`;
  for (const [k, e] of Object.entries(motion.ease)) v[`curve-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`] = e;
  for (const [k, d] of Object.entries(motion.duration)) v[`dur-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`] = `${d}ms`;
  v["press-scale"] = motion.pressScale;
  v["lift-y"] = `${motion.liftY}px`;
  v["parallax"] = motion.parallax;
  v["stretch"] = motion.stretch;
  for (const [k, n] of Object.entries(z)) v[`z-${k}`] = n;
  v["content-max"] = `${layout.contentMax}px`;
  v["sidebar-w"] = `${layout.sidebarWidth}px`;
  v["sidebar-inset"] = `${layout.sidebarInset}px`;
  v["tabbar-h"] = `${layout.tabbarHeight}px`;
  v["tabbar-inset"] = `${layout.tabbarInset}px`;
  v["tabbar-bottom"] = `${layout.tabbarBottom}px`;
  v["target"] = `${layout.target}px`;
  for (const [k, g] of Object.entries(clearGlass)) v[k] = g;
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
    "}\n"
  );
}
