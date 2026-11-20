const fs = require('fs'); const path = require('path');
const out = (n, html) => fs.writeFileSync(path.join(__dirname, '..', n + '.html'), html);
const pages = { home: () => require('./p-home').home() };
for (const f of ['p-phone', 'p-program', 'p-day', 'p-catalog', 'p-system']) { try { Object.assign(pages, require('./' + f)); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } }
const only = process.argv.slice(2);
for (const [k, fn] of Object.entries(pages)) if (!only.length || only.includes(k)) { out(k, fn()); console.log('built', k); }
