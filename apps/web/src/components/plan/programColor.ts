/** One colour dot per program on the one schedule (spec 12 Plan #1). Tokens only. */
const COLORS: Record<string, string> = {
  "kettlebell-lifestyle": "var(--accent)",
  "mastering-the-kettlebell": "var(--warm)",
  "athleticism-4-life": "var(--ok)",
  "working-in": "var(--gold)",
};
const FALLBACK = ["var(--glacier-300, var(--accent))", "var(--ember-300, var(--warm))", "var(--ink-500, var(--text-3))"];

export function programColor(slug: string | null | undefined): string {
  if (!slug) return "var(--text-3)";
  if (COLORS[slug]) return COLORS[slug]!;
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length]!;
}
