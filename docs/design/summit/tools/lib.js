const fs = require('fs');
const path = require('path');
const { fig, rig } = require('./fig');

const ICONS = path.join(__dirname, '../node_modules/lucide-static/icons');
const cache = {};
function icon(name, cls = '') {
  if (!cache[name]) {
    const raw = fs.readFileSync(path.join(ICONS, name + '.svg'), 'utf8');
    cache[name] = raw.replace(/<!--.*?-->/s, '').replace(/\s+/g, ' ').match(/<svg[^>]*>(.*)<\/svg>/)[1];
  }
  return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cache[name]}</svg>`;
}

const BELL = rig.BELL;
function bellMark(color = '#fff') {
  return `<svg viewBox="-14 -4 28 36" aria-hidden="true"><path d="${BELL}" fill="${color}" fill-rule="evenodd"/></svg>`;
}

function ring(pct, size = 54, stroke = 5, label = '', cls = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<span class="ring ${cls}" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="val" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}"/></svg><span>${label}</span></span>`;
}

/* Shasta: main cone with Shastina on the left shoulder. */
function shasta(x, base, w, h) {
  const p = (fx, fy) => `${(x + fx * w).toFixed(1)} ${(base - fy * h).toFixed(1)}`;
  return {
    body: `M${p(0,0)} C${p(.12,.12)} ${p(.2,.3)} ${p(.3,.5)} L${p(.36,.6)} C${p(.38,.66)} ${p(.42,.68)} ${p(.44,.64)} C${p(.5,.8)} ${p(.54,.96)} ${p(.58,1)} C${p(.62,.99)} ${p(.64,.95)} ${p(.67,.86)} C${p(.76,.6)} ${p(.88,.25)} ${p(1,0)} Z`,
    snow: `M${p(.5,.8)} C${p(.54,.96)} ${p(.56,1)} ${p(.58,1)} C${p(.62,.99)} ${p(.64,.95)} ${p(.67,.86)} L${p(.71,.75)} L${p(.68,.73)} L${p(.655,.78)} L${p(.63,.7)} L${p(.6,.76)} L${p(.575,.68)} L${p(.55,.75)} L${p(.525,.7)} Z`,
  };
}

let sceneN = 0;
/* A daylight cut-paper scene: sky, sun, Shasta, ridges, an athlete from the rig. */
function scene({ move = 'swing', t = 0, w = 320, h = 200, sun = [236, 70], figX = 120, figY = 40, figS = 150, mtn = true, extra = '', cls = '', ground = true, flip = false, noFig = false, pines = [[18, .9], [38, 1.2], [290, 1.1], [306, .8]], mtnX = -10 } = {}) {
  const id = 'sc' + (sceneN++);
  const s = shasta(mtnX, h * 0.78, w * 0.95, h * 0.62);
  const pine = (x, y, k) => `<path d="M${x} ${y - 26 * k} L${x + 9 * k} ${y - 8 * k} L${x + 5 * k} ${y - 8 * k} L${x + 11 * k} ${y} L${x - 11 * k} ${y} L${x - 5 * k} ${y - 8 * k} L${x - 9 * k} ${y - 8 * k} Z" class="ridge" opacity=".9"/>`;
  const f = noFig ? '' : fig(move, t);
  const figSvg = f.replace('<svg class="fig ', `<svg x="${figX}" y="${figY}" width="${figS}" height="${figS}" class="fig `);
  return `<svg class="scene ${cls}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky1"/><stop offset="1" class="sky2"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${id}s)"/>
  <circle class="sun2" cx="${sun[0]}" cy="${sun[1]}" r="40" opacity=".35"/><circle class="sun" cx="${sun[0]}" cy="${sun[1]}" r="26"/>
  ${mtn ? `<path class="mtn" d="${s.body}"/><path class="snow" d="${s.snow}"/>` : ''}
  <path class="mtn2" d="M0 ${h*0.74} C ${w*0.2} ${h*0.66}, ${w*0.4} ${h*0.76}, ${w*0.62} ${h*0.7} S ${w*0.9} ${h*0.66}, ${w} ${h*0.72} V ${h} H0Z" opacity=".9"/>
  ${ground ? `<path class="ground" d="M0 ${h*0.86} C ${w*0.25} ${h*0.8}, ${w*0.55} ${h*0.84}, ${w} ${h*0.8} V ${h} H0Z"/>` : ''}
  ${pines.map(([x, k]) => pine(x * w / 320, h * 0.84, k)).join('')}
  ${extra}
  ${figSvg}
</svg>`;
}

/* The Climb: Level I as a route up Shasta's flank, phases as camps. */
function climb({ id = 'cl', done = 2, inPhase = 0.2, labels = true, H = 250 } = {}) {
  const W = 1000;
  const S = [800, 34];
  const pts = [[96, H - 30], [262, H - 62], [436, H - 108], [612, H - 160], S];
  const names = [['On Ramp', 'Days 1–7'], ['Phase 1', 'Days 8–20'], ['Phase 2', 'Days 21–40'], ['Phase 3', 'Days 41–61'], ['Summit', 'Day 61']];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const you = lerp(pts[done], pts[done + 1], inPhase);
  const L = (arr) => arr.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const outline = `M0 ${H - 18} C 40 ${H - 22}, 70 ${H - 26}, 96 ${H - 30} C 160 ${H - 40}, 210 ${H - 50}, 262 ${H - 62} C 330 ${H - 80}, 390 ${H - 92}, 436 ${H - 108} C 500 ${H - 128}, 560 ${H - 146}, 612 ${H - 160} C 650 ${H - 170}, 660 ${H - 186}, 676 ${H - 182} C 700 ${H - 176}, 740 ${H - 196}, 800 34 C 850 50, 900 ${H - 160}, 1000 ${H - 128}`;
  const gid = id + 'g';
  const pine = (x, y, s = 1) => `<path d="M${x} ${y - 26 * s} L${x + 9 * s} ${y - 8 * s} L${x + 5 * s} ${y - 8 * s} L${x + 11 * s} ${y} L${x - 11 * s} ${y} L${x - 5 * s} ${y - 8 * s} L${x - 9 * s} ${y - 8 * s} Z" fill="var(--sc-ridge)" opacity=".85"/>`;
  let camps = '';
  pts.forEach((p, i) => {
    const isDone = i <= done; const summit = i === pts.length - 1;
    if (summit) camps += `<g transform="translate(${p[0]} ${p[1]})"><path d="M0 0 V-26" stroke="var(--text)" stroke-width="2.4"/><path d="M0 -26 L20 -20 L0 -14Z" fill="var(--warm)"/><circle r="6.5" fill="var(--surface)" stroke="var(--text)" stroke-width="2.4"/></g>`;
    else camps += `<g transform="translate(${p[0]} ${p[1]})"><circle r="11" fill="${isDone ? 'var(--warm)' : 'var(--surface)'}" stroke="${isDone ? 'var(--surface)' : 'var(--line-strong)'}" stroke-width="3"/>${isDone ? '<path d="M-4.5 0.5 L-1.2 3.6 L4.8 -3.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : `<circle r="3" fill="var(--line-strong)"/>`}</g>`;
  });
  const lab = labels ? pts.map((p, i) => {
    const st = i < done + 1 ? 'done' : (i === done + 1 ? 'next' : '');
    const summit = i === pts.length - 1;
    const x = summit ? p[0] + 52 : p[0], y = summit ? p[1] - 8 : (i === 0 ? p[1] - 58 : p[1] + 20);
    return `<div class="cl-lab ${st}" style="left:${(x / W * 100).toFixed(2)}%;top:${(y / H * 100).toFixed(2)}%"><b>${names[i][0]}</b><span>${names[i][1]}</span></div>`;
  }).join('') : '';
  return `<div class="climb">
  <svg viewBox="0 0 ${W} ${H}" class="climb-svg" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-mtn)"/><stop offset="1" stop-color="var(--sc-sky1)"/></linearGradient>
    <linearGradient id="${gid}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-sky1)" stop-opacity="0"/><stop offset="1" stop-color="var(--sc-sky1)"/></linearGradient></defs>
    <circle cx="958" cy="62" r="40" fill="var(--sc-sun2)" opacity=".35"/><circle cx="958" cy="62" r="26" fill="var(--sc-sun)"/>
    <path d="M520 ${H} C 600 ${H - 70}, 660 ${H - 90}, 700 ${H - 96} C 760 ${H - 60}, 900 ${H - 40}, 1000 ${H - 52} V ${H} Z" fill="var(--sc-mtn2)" opacity=".35"/>
    <path d="${outline} V ${H} H 0 Z" fill="url(#${gid})"/>
    <clipPath id="${gid}c"><path d="${outline} V ${H} H 0 Z"/></clipPath>
    <path clip-path="url(#${gid}c)" d="M690 0 H 920 V 78 L 902 92 L 884 80 L 868 96 L 852 84 L 838 100 L 822 86 L 806 98 L 790 84 L 774 94 L 758 82 L 742 90 L 726 76 L 690 70 Z" fill="var(--sc-snow)"/>
    <path d="${outline}" fill="none" stroke="var(--sc-mtn2)" stroke-width="1.5" opacity=".7"/>
    <path d="M0 ${H} V ${H - 12} C 120 ${H - 22}, 240 ${H - 8}, 380 ${H - 16} S 700 ${H - 4}, 1000 ${H - 14} V ${H} Z" fill="var(--sc-ground)"/>
    ${pine(26, H - 12, 1.1)}${pine(48, H - 14, .8)}${pine(930, H - 14, 1)}${pine(956, H - 12, 1.3)}${pine(978, H - 13, .85)}
    <path d="${L([you, ...pts.slice(done + 1)])}" fill="none" stroke="var(--warm)" stroke-width="3" stroke-dasharray="0 9" stroke-linecap="round"/>
    <path d="${L([...pts.slice(0, done + 1), you])}" fill="none" stroke="var(--warm)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${camps}
  </svg>
  ${lab}
  <div class="cl-you" style="left:${(you[0] / W * 100).toFixed(2)}%;top:${(you[1] / H * 100).toFixed(2)}%"><span class="avatar sm">D</span><em>You · Day 24</em></div>
</div>`;
}

/* Shell */
const NAV = [
  ['home', 'Home', 'house'], ['programs', 'Programs', 'sparkles'], ['retreats', 'Retreats', 'mountain'],
  ['library', 'Library', 'library-big'], ['schedule', 'Schedule', 'calendar-check-2'], ['account', 'Account', 'user'],
];
function sidebar(active) {
  return `<aside class="rail">
  <a class="wordmark" href="home.html"><span class="mark">${bellMark()}</span><span><b>MIKE SALEMI</b><small>Kettlebell · Movement</small></span></a>
  <a class="resume" href="program.html">
    <div class="photo scrim-soft"><img src="assets/img/working-in.jpg" alt="" style="object-position:50% 45%"></div>
    <div class="top"><span class="chip onphoto sm">Day 24 of 61</span></div>
    <div class="body row gap-12">
      <div style="min-width:0;flex:1">
        <div class="eyebrow" style="color:var(--g-300);font-size:10px">Up next · Level I</div>
        <div style="font:700 15px/1.2 var(--display);margin-top:5px">Recovery Day</div>
        <div style="font-size:11.5px;color:rgba(255,255,255,.62);margin-top:3px">Phase 2 · 5 steps · 34 min</div>
      </div>
      <span class="ring" style="width:46px;height:46px"><svg width="46" height="46"><circle cx="23" cy="23" r="19.5" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/><circle cx="23" cy="23" r="19.5" fill="none" stroke="#5DB4F0" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(122.5*0.38).toFixed(1)} 123"/></svg><span style="font-size:11.5px">38%</span></span>
    </div>
  </a>
  <nav class="nav" aria-label="Primary">
    ${NAV.map(([k, l, ic]) => `<a href="${k === 'programs' ? 'catalog' : k}.html" class="${k === active ? 'on' : ''}">${icon(ic)}${l}${k === 'retreats' ? '<span class="new">Apply</span>' : ''}</a>`).join('')}
  </nav>
  <div class="nav-group">
    <div class="eyebrow">Your access</div>
    <nav class="nav compact">
      <a href="program.html" class="${active === 'kbl' ? 'on' : ''}"><span class="ico"><img src="assets/img/mike-standing.jpg" alt=""></span><span><span class="t">Kettlebell Lifestyle</span><span class="s">Level I · Immersion</span></span></a>
      <a href="#"><span class="ico"><img src="assets/img/working-in.jpg" alt=""></span><span><span class="t">Working In</span><span class="s">Mind-body course</span></span></a>
    </nav>
  </div>
  <div class="nav-group">
    <div class="eyebrow">Additional ${icon('chevron-up')}</div>
    <nav class="nav">
      <a href="#">${icon('wrench')}Tools</a>
      <a href="#">${icon('message-circle')}Coaching</a>
      <a href="#">${icon('gift')}Referrals<span class="meta">Give 1 month</span></a>
    </nav>
  </div>
  <div class="usermenu">
    <span class="avatar">D</span>
    <div style="min-width:0;flex:1"><div style="font:650 13.5px/1.2 var(--sans)">Daniel Reyes</div><div class="xs faint">Member since Sep 2026</div></div>
    <button class="icon-btn" style="width:34px;height:34px" aria-label="Theme">${icon('moon')}</button>
  </div>
</aside>`;
}

function topbars() {
  return `<div class="announce"><span class="tag">New</span><span>Men of Movement · <b>The Breakthrough</b> — applications open for May 13–16, 2027 on Mount Shasta</span><a href="#">Apply ${icon('arrow-right')}</a></div>
  <div class="statusbar">
    <span class="avatar sm">D</span><span class="greet">Good morning, Daniel</span><span class="date">· Friday, Nov 20</span>
    <div class="right">
      <div class="search">${icon('search')}Search lessons and moves<kbd>⌘K</kbd></div>
      <span class="streakchip"><span class="fl">${icon('flame')}</span>12 days</span>
      <button class="icon-btn" aria-label="Notifications">${icon('bell')}</button>
    </div>
  </div>`;
}

function doc({ title, body, css = '', cls = '', phone = false }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Mike Salemi · Summit</title>
<link rel="stylesheet" href="assets/summit.css"><link rel="stylesheet" href="assets/pages.css">
<script>(function(){var q=new URLSearchParams(location.search);document.documentElement.dataset.theme=q.get('theme')||'light';if(q.get('still'))document.documentElement.classList.add('still');if(q.get('long'))document.documentElement.classList.add('long');})();</script>
${css ? `<style>${css}</style>` : ''}</head><body class="${cls}">${body}</body></html>`;
}

module.exports = { icon, fig, scene, climb, ring, sidebar, topbars, doc, bellMark, shasta };
