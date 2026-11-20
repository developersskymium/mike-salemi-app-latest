// Usage: node verify-readiness.mjs <esbuild-module-path> <legacy-root> [v2-rows.json]
// Runs the legacy resolver for every readiness form x all 108 answer combinations and compares it with the
// v2 rules (form_questions weights + form_bands match / default-table fallback, as submit_readiness does).
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [esbuildPath, legacy, rowsPath = path.join(here, 'v2-readiness-rows.json')] = process.argv.slice(2);
const esbuild = createRequire(import.meta.url)(esbuildPath);
const tmp = mkdtempSync(path.join(tmpdir(), 'rdy-'));
const outfile = path.join(tmp, 'bundle.mjs');
await esbuild.build({ entryPoints: [path.join(here, 'verify-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile,
  alias: { '@': path.join(legacy, 'src') }, loader: { '.json': 'json' }, logLevel: 'error' });
const legacyCases = JSON.parse(execFileSync('node', [outfile], { maxBuffer: 1 << 28, cwd: tmp }).toString());
const v2 = JSON.parse(readFileSync(rowsPath, 'utf8'));
const forms = new Map(v2.forms.map((f) => [f.id, f]));
const qs = new Map(); for (const q of v2.questions) { if (!qs.has(q.f)) qs.set(q.f, []); qs.get(q.f).push(q); }
const bands = new Map(); for (const b of v2.bands) { if (!bands.has(b.f)) bands.set(b.f, []); bands.get(b.f).push(b); }
let mismatches = 0, perForm = {};
for (const c of legacyCases) {
  const f = forms.get(c.formId);
  const score = qs.get(c.formId).sort((a, b) => a.pos - b.pos).reduce((s, q) => s + q.opts.find((o) => o.value === c.answers[q.k]).weight, 0);
  let b = (bands.get(c.formId) || []).sort((x, y) => x.pos - y.pos).find((x) => score >= x.mn && score <= x.mx);
  if (!b) b = { name: 'Full Workout', band: 'green', out: 'workout', t: f.dt };
  const got = { score, name: b.name, band: b.band, outcome: b.out, table: b.t ?? null };
  const want = { score: c.score, name: c.name, band: c.band, outcome: c.outcome, table: c.table };
  perForm[c.formId] = perForm[c.formId] || { cases: 0, bad: 0 };
  perForm[c.formId].cases++;
  if (JSON.stringify(got) !== JSON.stringify(want)) { mismatches++; perForm[c.formId].bad++; if (mismatches <= 10) console.log('MISMATCH', c.formId, JSON.stringify(c.answers), 'v2', JSON.stringify(got), 'legacy', JSON.stringify(want)); }
}
console.log(JSON.stringify(perForm));
console.log(`forms=${Object.keys(perForm).length} cases=${legacyCases.length} mismatches=${mismatches}`);
process.exit(mismatches ? 1 : 0);
