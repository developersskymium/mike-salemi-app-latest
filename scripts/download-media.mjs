// Downloads every file in scripts/media-manifest.json into public/media so the
// app serves its own images and PDFs. Runs in GitHub Actions (see
// .github/workflows/download-media.yml). Existing files are skipped.
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

const { entries } = JSON.parse(await readFile("scripts/media-manifest.json", "utf8"));
const failed = [];
let downloaded = 0, skipped = 0;

async function exists(path) {
  try { return (await stat(path)).size > 0; } catch { return false; }
}

async function fetchWithRetry(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (i >= tries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

const queue = [...entries];
async function worker() {
  while (queue.length) {
    const entry = queue.shift();
    if (await exists(entry.path)) { skipped++; continue; }
    try {
      const body = await fetchWithRetry(entry.url);
      await mkdir(dirname(entry.path), { recursive: true });
      await writeFile(entry.path, body);
      downloaded++;
    } catch (error) {
      failed.push({ url: entry.url, error: String(error) });
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

await writeFile("scripts/media-download-report.json", JSON.stringify({ total: entries.length, downloaded, skipped, failed }, null, 1));
console.log(`total=${entries.length} downloaded=${downloaded} skipped=${skipped} failed=${failed.length}`);
for (const f of failed) console.log("FAILED", f.url, f.error);
