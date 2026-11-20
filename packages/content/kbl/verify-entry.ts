// Bundled by verify-readiness.mjs: runs the legacy resolver for every form x all 108 answer combinations.
import source from "@/content/source-readiness.json";
import { resolveReadiness } from "@/content/readiness-table";
const keys = ["tired", "recovery", "gut", "stress", "motivation"];
const choices = [["no", "yes"], ["full", "moderate", "none"], ["no", "yes"], ["low", "moderate", "high"], ["high", "medium", "low"]];
const dayByForm: Record<string, string> = {};
for (const [day, f] of Object.entries(source.dayForms as Record<string, string>)) if (!dayByForm[f]) dayByForm[f] = day;
const out: any[] = [];
for (const [formId, day] of Object.entries(dayByForm)) {
  for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) for (let d = 0; d < 3; d++) for (let e = 0; e < 3; e++) {
    const idx = [a, b, c, d, e];
    const answers = Object.fromEntries(idx.map((i, q) => [keys[q], choices[q][i]]));
    const r = resolveReadiness(answers, day);
    out.push({ formId, answers, score: r.score, name: r.band.title, band: r.band.id, outcome: r.outcome, table: r.table?.sourceId ?? r.table?.id ?? null });
  }
}
process.stdout.write(JSON.stringify(out));
