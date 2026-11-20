// usage: node shoot.js file.html out.png width height [full]
const puppeteer = require('puppeteer-core');
const path = require('path');
(async () => {
  const jobs = [];
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 5) jobs.push(a.slice(i, i + 5));
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'] });
  for (const [file, out, w, h, full] of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });
    await page.goto('file://' + path.resolve(file), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: out, fullPage: full === 'full' });
    await page.close();
    console.log('shot', out);
  }
  await browser.close();
})();
