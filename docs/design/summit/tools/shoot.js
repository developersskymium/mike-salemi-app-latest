// node tools/shoot.js page theme w h full out
const puppeteer = require('puppeteer-core');
(async () => {
  const jobs = JSON.parse(process.argv[2]);
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--allow-file-access-from-files','--font-render-hinting=none'] });
  for (const j of jobs) {
    const p = await browser.newPage();
    await p.setViewport({ width: j.w, height: j.h, deviceScaleFactor: 2 });
    p.on('pageerror', e => console.error('PAGEERR', j.page, e.message));
    p.on('console', m => { if (m.type()==='error') console.error('CONSOLE', j.page, m.text()); });
    p.on('requestfailed', r => console.error('REQFAIL', j.page, r.url()));
    await p.goto(`file:///home/claude/design/v3/${j.page}.html?theme=${j.theme||'light'}&still=1${j.long?'&long=1':''}`, { waitUntil: 'networkidle0' });
    await p.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));
    const file = `/home/claude/design/v3/shots/${j.out}.png`;
    await p.screenshot({ path: file, fullPage: !!j.full });
    console.log(file);
    await p.close();
  }
  await browser.close();
})();
