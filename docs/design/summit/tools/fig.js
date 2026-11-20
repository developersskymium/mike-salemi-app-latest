// Render rig geometry as "Summit cut-paper" SVG figures.
const rig = require('./rig.json');
const ORDERS = { out:["far","torso","legN","bell","armN","hand"], over:["far","torso","legN","armN","bell","hand"], between:["far","torso","bell","armN","hand","legN"], behind:["far","bell","torso","legN","armN","hand"] };
function fig(move, t, opts = {}) {
  const m = rig.moves[move];
  const keys = Object.keys(m.frames);
  const key = keys.reduce((a, b) => Math.abs(+b - t) < Math.abs(+a - t) ? b : a);
  const g = m.frames[key];
  const [vx, vy, vs] = opts.view || m.view;
  const cls = opts.cls || '';
  const layer = {
    far: `<g class="f-far">${['thigh','shin','foot','upper','fore','hand'].map(k=>`<path d="${g.far[k]}"/>`).join('')}</g>`,
    torso: `<g class="f-ink">${[g.torso,g.neck,g.head].map(d=>`<path d="${d}"/>`).join('')}</g>`,
    legN: `<g class="f-ink">${[g.legN.thigh,g.legN.shin,g.legN.foot].map(d=>`<path d="${d}"/>`).join('')}</g>`,
    armN: `<g class="f-ink">${[g.armN.upper,g.armN.fore].map(d=>`<path d="${d}"/>`).join('')}</g>`,
    hand: `<g class="f-ink"><path d="${g.handN}"/></g>`,
    bell: g.bell ? `<g transform="${g.bell}" class="f-bell"><path d="${rig.BELL}" fill-rule="evenodd"/><path class="f-bell-hi" d="M-8.8 19.4A10.6 9.6 0 0 1-.8 12.8" fill="none"/></g>` : ''
  };
  const shadow = opts.noShadow ? '' : `<ellipse class="f-shadow" cx="${g.shadow.cx}" cy="${rig.GROUND+1}" rx="${g.shadow.rx}" ry="4.5"/>`;
  return `<svg class="fig ${cls}" viewBox="${vx} ${vy} ${vs} ${vs}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shadow}${ORDERS[g.order].map(l=>layer[l]).join('')}</svg>`;
}
module.exports = { fig, rig };
if (require.main === module) {
  const moves = Object.keys(rig.moves);
  let html = `<html><head><link rel="stylesheet" href="../fig.css"><style>body{margin:10px;font:11px sans-serif;background:#F4F1EB}.r{display:flex;gap:4px;align-items:center}.r svg{width:110px;height:110px;background:#fff}</style></head><body>`;
  for (const mv of moves) { html += `<div class="r"><b style="width:70px">${mv}</b>`; for (let i=0;i<12;i++) html += `<div>${fig(mv,i/12)}<br>${(i/12).toFixed(2)}</div>`; html += `</div>`; }
  require('fs').writeFileSync(__dirname + '/../_figs.html', html.replace('../fig.css','assets/fig.css'));
}
