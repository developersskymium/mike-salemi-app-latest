#!/usr/bin/env node
/**
 * Flash probe: proves that moving between lessons never shows Home (or a blank / reloaded page).
 *
 * For each scenario it opens a start page, clicks a link, and samples the page every animation
 * frame (≈16ms, plus screencast frames every ~40ms) until the destination has rendered. A frame
 * FAILS if it shows Home (the Today page or its "Loading Home" skeleton), the public landing page,
 * an empty <main>, the Home-shaped program/catalog skeleton on the way to a lesson, or if the document reloaded (a hard navigation instead of a client one).
 *
 *   cd apps/web && MOCK_DATA=1 pnpm dev --port 3101
 *   NODE_PATH=/path/to/node_modules node scripts/flash-probe.mjs [--base http://localhost:3101] [--frames out-dir]
 *
 * Needs puppeteer-core and Chrome (CHROME=/usr/bin/google-chrome by default). Exit code 1 on any bad frame.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const BASE = arg("--base", "http://localhost:3101");
const FRAMES = arg("--frames", null);
const WIDTH = Number(arg("--width", "1440"));
const ONLY = arg("--only", null); // comma-separated scenario names
const LATENCY = Number(arg("--latency", "0")); // ms added to every request after the click (production-like data latency)

/** start page → the link to click → the URL the click must land on (no detours). */
const SCENARIOS = [
  // MOCK_DATA fixtures hold KBL days 24 and 25 (Immersion "learn" and Self-Guided "guide" views).
  { name: "kbl-day-prev", start: "/programs/kettlebell-lifestyle/learn/l1-phase-2-d25", click: "a.kd-foot-prev", to: /\/learn\/l1-phase-2-d24$/ },
  { name: "kbl-day-next", start: "/programs/kettlebell-lifestyle/learn/l1-phase-2-d24", click: "a.kd-foot-next, a.kd-bar-next", to: /\/learn\/l1-phase-2-d25$/, optional: true },
  { name: "kbl-guide-next", start: "/programs/kettlebell-lifestyle/guide/l1-phase-2-d24", click: "a.kd-guide-day[data-next]", to: /\/guide\/l1-phase-2-d25$/ },
  { name: "kbl-board-day", start: "/programs/kettlebell-lifestyle?mode=self-guided", click: "main a[href*='/guide/l1-phase-2-d24'], main a[href*='session/open'][href*='l1-phase-2-d24']", to: /\/guide\/l1-phase-2-d24$/, optional: true },
  { name: "course-lesson-next", start: "/programs/what-your-kettlebell-swing-is-missing/course", click: "a[href*='/course/']", to: /\/course\/[^/]+$/ },
  { name: "mtk-lesson", start: "/mtk", click: "a[href*='/course/']", to: /\/course\/[^/?]+/ },
  { name: "home-continue", start: "/today", click: "main a[href*='/programs/'][href*='/learn/'], main a[href*='/programs/'][href*='/guide/'], main a[href*='/programs/'][href*='/course/']", to: /\/programs\/[^/]+\/(learn|guide|course)\// },
  { name: "catalog-program", start: "/programs", click: "main a[href^='/programs/']:not([href='/programs'])", to: /\/(programs|experiences\/programs)\/[^/]+/ },
  { name: "catalog-course", start: "/programs", click: "main a[href='/programs/what-your-kettlebell-swing-is-missing/course'], main a[href='/programs/kettlebell-roadmap/course']", to: /\/course$/, optional: true },
  { name: "catalog-retreat", start: "/programs", click: "main a[href^='/experiences/programs/']", to: /\/experiences\/programs\/[^/]+/, optional: true },
];

// Runs in the page on every frame: what is on screen right now?
const SAMPLER = () => {
  const w = window;
  w.__probe = w.__probe || [];
  w.__probeLoads = (Number(sessionStorage.getItem("__probeLoads") || 0) + 1);
  sessionStorage.setItem("__probeLoads", String(w.__probeLoads));
  const tick = () => {
    const main = document.querySelector("main") || document.body;
    w.__probe.push({
      t: Math.round(performance.now()),
      loads: w.__probeLoads,
      path: location.pathname,
      home: Boolean(document.querySelector('[aria-label="Loading Home"], [data-page="today"], .sh-hero, .td-page')),
      landing: Boolean(document.querySelector("[data-public-landing], .pl-hero")),
      // The program / catalog skeleton (a 520px hero block shaped like Home) shown on the way to a lesson.
      bigHero: Boolean(document.querySelector('.pv[aria-busy="true"], [aria-label="Loading programs"]')),
      empty: main ? main.textContent.trim().length === 0 && main.querySelectorAll("[aria-busy], img, video, iframe").length === 0 : true,
      busy: main ? Boolean(main.querySelector("[aria-busy='true']")) : false,
      h1: (document.querySelector("main h1")?.textContent || "").trim().slice(0, 60),
    });
    requestAnimationFrame(tick);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(tick));
  else requestAnimationFrame(tick);
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: WIDTH, height: 900 },
});
let failed = 0;
const report = [];
for (const s of SCENARIOS.filter((x) => !ONLY || ONLY.split(",").includes(x.name))) {
  try {
    await runScenario(s);
  } catch (e) {
    failed++;
    console.log(`ERROR ${s.name}: ${e.message}`);
  }
}
async function runScenario(s) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(SAMPLER);
  await page.goto(BASE + s.start, { waitUntil: "networkidle2", timeout: 90000 }).catch(() => null);
  const startPath = new URL(page.url()).pathname;
  const handle = await page.$(s.click);
  if (!handle) {
    const line = `${s.optional ? "SKIP" : "MISS"} ${s.name}: no link "${s.click}" on ${startPath}`;
    console.log(line);
    report.push(line);
    if (!s.optional) failed++;
    await page.close();
    return;
  }
  const href = await handle.evaluate((a) => a.getAttribute("href"));
  // Warm the destination once (dev compiles on first hit), then come back: we measure the real thing.
  await page.goto(new URL(href, BASE).toString(), { waitUntil: "networkidle2", timeout: 90000 }).catch(() => null);
  await page.goto(BASE + s.start, { waitUntil: "networkidle2", timeout: 90000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 600));
  if (!(await page.$(s.click))) {
    const line = `MISS ${s.name}: link "${s.click}" gone after hydration on ${startPath}`;
    console.log(line);
    report.push(line);
    if (!s.optional) failed++;
    await page.close();
    return;
  }
  await page.evaluate(() => { window.__probe = []; });

  const cdp = await page.createCDPSession();
  const shots = [];
  cdp.on("Page.screencastFrame", async (f) => {
    shots.push({ t: Date.now(), data: f.data });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => null);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 45, everyNthFrame: 2 });
  if (LATENCY) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: LATENCY, downloadThroughput: -1, uploadThroughput: -1 });
  const t0 = Date.now();
  // A real click where possible; a DOM click when the link sits under an overlay or off-screen.
  await page.$eval(s.click, (a) => a.scrollIntoView({ block: "center" }));
  await page.click(s.click).catch(() => page.$eval(s.click, (a) => a.click()));
  // Sample until the destination is on screen and settled (or 15s).
  let samples = [];
  while (Date.now() - t0 < 15000) {
    await new Promise((r) => setTimeout(r, 40));
    samples = await page.evaluate(() => window.__probe || []).catch(() => samples);
    const last = samples[samples.length - 1];
    if (last && s.to.test(last.path) && !last.busy && Date.now() - t0 > 800) break;
  }
  await new Promise((r) => setTimeout(r, 300));
  samples = await page.evaluate(() => window.__probe || []).catch(() => samples);
  await cdp.send("Page.stopScreencast").catch(() => null);

  const end = new URL(page.url()).pathname;
  // The old page may stay on screen until the new one is ready (that is the goal). A Home frame only
  // counts once the start page has been left: i.e. Home flashing in between, or Home as a detour.
  const leftAt = samples.findIndex((x) => x.path !== startPath || (startPath === "/today" && !x.home));
  const after = leftAt < 0 ? [] : samples.slice(leftAt);
  const toLesson = /\/(learn|guide|course|session)\//.test(href);
  const bad = after.filter((x) => x.home || x.landing || x.empty || (toLesson && x.bigHero));
  const reloads = new Set(samples.map((x) => x.loads)).size > 1 || (samples[0] && samples[0].loads > 1 && false);
  const detour = [...new Set(samples.map((x) => x.path))].filter((p) => p !== startPath && !s.to.test(p));
  const ok = bad.length === 0 && !reloads && detour.length === 0 && s.to.test(end);
  if (!ok) failed++;
  const line = `${ok ? "PASS" : "FAIL"} ${s.name}: ${startPath} → ${href} → ${end} · ${samples.length} frames · home=${after.filter((x) => x.home).length} landing=${after.filter((x) => x.landing).length} empty=${after.filter((x) => x.empty).length} heroSkeleton=${toLesson ? after.filter((x) => x.bigHero).length : 0} reload=${reloads} detours=${detour.join(",") || "none"} · screencast ${shots.length}`;
  console.log(line);
  report.push(line);
  if (FRAMES) {
    const dir = join(FRAMES, s.name);
    mkdirSync(dir, { recursive: true });
    shots.forEach((f, i) => writeFileSync(join(dir, `${String(i).padStart(3, "0")}-${f.t - t0}ms.jpg`), Buffer.from(f.data, "base64")));
    writeFileSync(join(dir, "samples.json"), JSON.stringify(samples, null, 1));
  }
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} scenario(s) failed` : "\nAll scenarios clean: no frame showed Home, the landing page, an empty page or a reload.");
process.exit(failed ? 1 : 0);
