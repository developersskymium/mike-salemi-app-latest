// Usage: node bundle-run.mjs <esbuild-module-path> <legacy-root> <entry-ts-or-code-file> <out-json>
// Bundles legacy TypeScript (alias @ -> <legacy-root>/src) and runs it, writing stdout to out-json.
import { createRequire } from 'node:module';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [esbuildPath, legacy, entry, out] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const esbuild = require(esbuildPath);
const tmp = mkdtempSync(path.join(tmpdir(), 'kbl-'));
const outfile = path.join(tmp, 'bundle.mjs');
await esbuild.build({
  entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile,
  alias: { '@': path.join(legacy, 'src') },
  loader: { '.json': 'json' }, logLevel: 'error',
  plugins: [{ name: 'asset-json', setup(b) {
    b.onLoad({ filter: /\.asset\.json$/ }, async (a) => {
      const fs = await import('node:fs');
      return { contents: fs.readFileSync(a.path, 'utf8'), loader: 'json' };
    });
  } }],
});
const res = execFileSync('node', [outfile], { maxBuffer: 1 << 28, cwd: tmp });
writeFileSync(out, res);
