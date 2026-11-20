const { icon, scene, climb, ring, doc, bellMark, fig } = require('./lib');
const img = (f) => `assets/img/${f}`;

const sw = (name, hex, cssVar, dark = false) => `<div class="sw"><i style="background:${cssVar || hex}"></i><b>${name}</b><span>${hex}</span></div>`;

function body() {
  const principles = [
    ['Mike leads', 'Full-colour, warm photography of Mike on every key surface. Never tinted, never desaturated.'],
    ['Daylight surfaces', 'Warm chalk ground, crisp white cards, three clear levels of depth, generous space.'],
    ['Bold, legible type', 'Archivo for confident headlines and numbers, Inter for everything you read.'],
    ['Glacier + Ember', 'Glacier blue means act. Ember means progress, streaks and achievement. Ink for text.'],
    ['The Climb', 'Progress is a route up Mount Shasta: phases are camps, levels are summits.'],
    ['One next step', 'Every screen has one obvious primary action — usually "start" or "resume".'],
    ['Offers as the next camp', 'Upgrades appear where they help your progress, with real value. Never as ads.'],
  ];
  const icons = ['house', 'sparkles', 'mountain', 'library-big', 'calendar-check-2', 'user', 'wrench', 'message-circle', 'gift', 'flame', 'play', 'check', 'lock-keyhole', 'clock', 'dumbbell', 'leaf', 'target', 'timer', 'trophy', 'bell', 'search', 'download', 'arrow-right', 'compass'];
  return `<div class="sys">
  <header class="sys-hero">
    <div>
      <div class="row gap-12"><span class="mark-lg">${bellMark()}</span><div><div class="eyebrow accent">Mike Salemi App · Direction 3</div><div class="d-xs mt-4">Design system</div></div></div>
      <h1 class="d-xxl mt-24" style="font-size:88px">Summit</h1>
      <p class="lede" style="max-width:520px;margin:16px 0 0;font-size:18px">A daylight, photo-led system for training with Mike. Strong type, real colour, and progress you can see — every member is on a climb.</p>
    </div>
    <div class="sys-photos">
      <div class="photo" style="grid-row:span 2"><img src="${img('mike-standing.jpg')}" alt="" style="object-position:62% 30%"></div>
      <div class="photo"><img src="${img('summit-group.jpg')}" alt=""></div>
      <div class="photo"><img src="${img('mike-coaching.jpg')}" alt="" style="object-position:50% 35%"></div>
    </div>
  </header>

  <section class="sys-sec">
    <h2 class="d-lg">Principles</h2>
    <div class="princ mt-20">${principles.map(([t, d], i) => `<div class="card flat" style="padding:18px 18px 20px"><div class="num" style="font-size:15px;color:var(--warm)">0${i + 1}</div><div class="d-xs mt-8">${t}</div><div class="small muted mt-6">${d}</div></div>`).join('')}</div>
  </section>

  <section class="sys-sec">
    <div class="sys-2">
      <div>
        <h2 class="d-lg">Colour</h2>
        <div class="eyebrow mt-20">Glacier — brand &amp; action</div>
        <div class="swrow mt-8">${[['50', '#EEF6FD'], ['100', '#DAECFB'], ['200', '#B4D8F6'], ['300', '#7DBDEE'], ['400', '#3FA0E6'], ['500', '#1A85D6'], ['600', '#146CB4'], ['700', '#135690'], ['900', '#0E2A45']].map(([n, h]) => sw(n, h)).join('')}</div>
        <div class="eyebrow mt-20">Ember — energy, streaks, achievement</div>
        <div class="swrow mt-8">${[['50', '#FFF3EC'], ['100', '#FFE2D1'], ['200', '#FFC3A1'], ['300', '#FF9C66'], ['400', '#FF7F3F'], ['500', '#F2632A'], ['600', '#D54E17'], ['700', '#A93C12'], ['Gold', '#E8B43C']].map(([n, h]) => sw(n, h)).join('')}</div>
        <div class="eyebrow mt-20">Ink &amp; chalk — warm neutrals</div>
        <div class="swrow mt-8">${[['Ink 900', '#0E1B2C'], ['Ink 700', '#2E3D51'], ['Ink 500', '#6C7787'], ['Ink 400', '#98A0AB'], ['Chalk 300', '#DFD8CC'], ['Chalk 200', '#ECE7DE'], ['Chalk 100', '#F5F2EC'], ['Chalk 50', '#FBFAF7'], ['White', '#FFFFFF']].map(([n, h]) => sw(n, h)).join('')}</div>
        <div class="row gap-12 mt-20">
          <div class="usage" style="flex:3;background:var(--g-500)">Act · 60%</div><div class="usage" style="flex:1.4;background:var(--e-500)">Progress · 25%</div><div class="usage" style="flex:.6;background:var(--gold);color:#3a2a00">Win</div><div class="usage" style="flex:.8;background:var(--ok)">Done</div>
        </div>
        <div class="xs faint mt-8">Share of accent use across a screen. Everything else is ink, chalk and photography.</div>
      </div>
      <div>
        <h2 class="d-lg">Type</h2>
        <div class="card flat mt-20" style="padding:24px">
          <div class="row between"><span class="eyebrow">Display · Archivo 800, normal width</span><span class="xs faint">−3% tracking</span></div>
          <div class="d-xxl mt-12">Recovery Day</div>
          <div class="d-lg mt-12">You're 38% of the way up.</div>
          <div class="d-md mt-10">Phase 2 · Adding Complexity</div>
          <div class="d-sm mt-10">Mastering the Kettlebell</div>
          <hr class="hair mt-20">
          <div class="row between mt-16"><span class="eyebrow">Text · Inter 400–700</span><span class="xs faint">15 / 1.5</span></div>
          <p class="lede" style="margin:10px 0 0">Recovery is where yesterday's work turns into strength. Breathe slow, move easy — and show up.</p>
          <p class="small muted" style="margin:8px 0 0">Captions, meta and labels sit at 12–13px in Ink 500. Eyebrows are 11.5px caps with wide tracking.</p>
          <hr class="hair mt-20">
          <div class="row mt-16" style="gap:28px;align-items:flex-end"><div><div class="num" style="font-size:56px;line-height:.9">23<span style="font-size:24px" class="faint">/61</span></div><div class="xs faint mt-6">Numerals are heroes</div></div><div><div class="num" style="font-size:56px;line-height:.9;color:var(--warm)">12</div><div class="xs faint mt-6">day streak</div></div><div><div class="num" style="font-size:56px;line-height:.9">2h 41m</div><div class="xs faint mt-6">this week</div></div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="sys-sec">
    <h2 class="d-lg">Surfaces &amp; depth</h2>
    <div class="sys-surf mt-20">
      <div class="surf-demo" style="background:var(--bg)"><div class="sunk" style="padding:18px;height:120px"><b class="d-xs">Sunk</b><div class="xs faint mt-4">Inputs, stat wells, tracks</div></div></div>
      <div class="surf-demo"><div class="card flat" style="padding:18px;height:120px"><b class="d-xs">Level 1 · Flat</b><div class="xs faint mt-4">Lists, tiles, activity</div></div></div>
      <div class="surf-demo"><div class="card" style="padding:18px;height:120px"><b class="d-xs">Level 2 · Card</b><div class="xs faint mt-4">Program cards, panels</div></div></div>
      <div class="surf-demo"><div class="card raised" style="padding:18px;height:120px"><b class="d-xs">Level 3 · Hero</b><div class="xs faint mt-4">Hero banners, players, sheets</div></div></div>
      <div class="surf-demo" style="padding:0"><div class="photo" style="height:156px;border-radius:20px"><img src="${img('mike-windmill.jpg')}" alt="" style="object-position:60% 40%"><div class="glass-dark" style="position:absolute;left:12px;right:12px;bottom:12px;border-radius:14px;padding:10px 12px;z-index:2"><b style="font:700 13px/1.2 var(--display)">Glass · overlays only</b><div class="xs" style="opacity:.75;margin-top:2px">Tab bar, player controls, photo badges</div></div></div></div>
    </div>
    <div class="row gap-16 mt-16 xs faint"><span>Radius 12 · 16 · 20 · 26 · 28</span><span>·</span><span>Shadows are soft and short; hairline borders do most of the work</span><span>·</span><span>Photos run full colour with a single ink scrim for legibility</span></div>
  </section>

  <section class="sys-sec">
    <div class="row between"><h2 class="d-lg">Illustration · Sun-up cut paper</h2><span class="small faint">Built on the app's movement rig: true limb lengths, planted feet, the bell as the only accent</span></div>
    <div class="ill mt-20">
      <div class="card" style="overflow:hidden">${scene({ move: 'swing', t: 0, w: 320, h: 220, sun: [262, 58], figX: 62, figY: 44, figS: 172, mtnX: -40 })}<div class="ill-cap"><b>Swing · Workout days</b><span>Day headers, empty programs</span></div></div>
      <div class="card" style="overflow:hidden">${scene({ move: 'getup', t: 0.33, w: 320, h: 220, sun: [70, 60], figX: 70, figY: 34, figS: 190, mtnX: 40, pines: [[30, 1], [282, 1.2], [300, .8]] })}<div class="ill-cap"><b>Get-up · Skill days</b><span>Skill development, technique</span></div></div>
      <div class="card" style="overflow:hidden">${scene({ move: 'breathing', t: 0.5, w: 320, h: 220, sun: [160, 96], figX: 92, figY: 66, figS: 150, mtnX: 30, pines: [[20, 1.2], [44, .9], [276, .9], [298, 1.3]] })}<div class="ill-cap"><b>Breathing · Recovery days</b><span>Working In, stretching, rest</span></div></div>
      <div class="card" style="overflow:hidden">${scene({ move: 'snatch', t: 0.08, w: 320, h: 220, sun: [236, 70], figX: 74, figY: 20, figS: 196 })}<div class="ill-cap"><b>Overhead · Celebration</b><span>Day complete, level summit</span></div></div>
    </div>
    <div class="sys-2 mt-20" style="grid-template-columns:1.6fr 1fr">
      <div class="card" style="padding:20px 0 12px;overflow:hidden"><div style="padding:0 22px" class="row between"><b class="d-xs">The Climb · signature progress map</b><span class="xs faint">Home · Program · Celebration</span></div><div style="margin-top:28px">${climb({ id: 'sy', H: 230 })}</div></div>
      <div class="card" style="padding:22px">
        <b class="d-xs">Milestones</b>
        <div class="medals mt-16">
          ${[['Fortnight Strong', '14-day streak', 'var(--gold)'], ['Basecamp', 'On Ramp done', 'var(--e-500)'], ['Foundation', 'Phase 1 done', 'var(--g-500)'], ['Summit', 'Level I done', 'var(--ink-900)']].map(([t, s, c]) => `<div class="medal"><svg viewBox="0 0 64 64" width="64" height="64"><path d="M20 4h10l6 16H26z" fill="var(--g-500)"/><path d="M44 4H34l-6 16h10z" fill="var(--e-500)"/><circle cx="32" cy="38" r="21" fill="${c}"/><circle cx="32" cy="38" r="15.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><path d="M21 45 L28 33 L32 38 L36 31 L43 45Z" fill="#fff"/></svg><b>${t}</b><span>${s}</span></div>`).join('')}
        </div>
        <hr class="hair mt-16">
        <div class="row gap-12 mt-16">${['c1', 'c2', 'c3', 's1', 's2'].map(c => `<img src="assets/icons/${c}.png" style="width:34px;height:34px" alt="">`).join('')}<span class="xs faint">Circuit badges kept from the original program</span></div>
      </div>
    </div>
  </section>

  <section class="sys-sec">
    <div class="sys-2" style="grid-template-columns:1fr 1fr">
      <div>
        <h2 class="d-lg">Iconography</h2>
        <div class="xs faint mt-6">Lucide, 1.85 stroke, rounded caps — the same set as the original app — plus the kettlebell mark.</div>
        <div class="icongrid mt-16">${icons.map(n => `<span title="${n}">${icon(n)}</span>`).join('')}<span style="background:var(--ink-900)">${bellMark()}</span></div>
      </div>
      <div>
        <h2 class="d-lg">Motion</h2>
        <div class="motion mt-16">
          ${[['Rise', '600 ms · ease-out (.2,.8,.2,1)', 'Content enters 10px up with a fade, staggered 40 ms.'], ['Fill', '700 ms · ease-out', 'Bars, rings and the climb route draw to their value on view.'], ['Celebrate', '1.2 s · spring (.34,1.56,.64,1)', 'Confetti, the athlete hits the overhead pose, the streak flame grows.'], ['Breathe', '4 s loop · ease-in-out', 'The "you are here" pulse and Recovery Day scenes breathe slowly.']].map(([t, m, d]) => `<div class="card flat" style="padding:16px 18px"><div class="row between"><b class="d-xs">${t}</b><span class="chip sm">${m}</span></div><div class="small muted mt-6">${d}</div></div>`).join('')}
        </div>
      </div>
    </div>
  </section>

  <section class="sys-sec">
    <h2 class="d-lg">Components</h2>
    <div class="comp mt-20">
      <div class="card" style="padding:22px">
        <div class="eyebrow">Buttons</div>
        <div class="row gap-10 mt-12 wrap"><span class="btn btn-primary btn-lg">${icon('play')} Start Day 24</span><span class="btn btn-warm">${icon('play')} Resume</span><span class="btn btn-secondary">Session plan</span><span class="btn btn-soft">${icon('plus')} Join program</span><span class="btn btn-ink">Apply</span><span class="btn btn-ghost">See all ${icon('arrow-right')}</span></div>
        <div class="eyebrow mt-20">Chips &amp; tags</div>
        <div class="row gap-8 mt-12 wrap"><span class="tag">Best next step</span><span class="tag warm">Continue</span><span class="tag gold">New badge</span><span class="chip accent">${icon('dumbbell')} Strength</span><span class="chip ok">${icon('check')} Done</span><span class="chip warm">${icon('flame')} 12 days</span><span class="chip">${icon('clock')} 34 min</span><span class="chip ink">All programs</span></div>
        <div class="eyebrow mt-20">Tabs</div>
        <div class="row gap-12 mt-12 wrap"><div class="seg"><span class="on">Level I · Beginner</span><span>${icon('lock-keyhole')} Level II</span></div><div class="pilltabs"><span class="pilltab done">${icon('check')} Phase 1 <span class="pc">100%</span></span><span class="pilltab on">Phase 2 <span class="pc">20%</span></span></div></div>
      </div>
      <div class="card" style="padding:22px">
        <div class="eyebrow">Progress</div>
        <div class="row gap-20 mt-16">${ring(38, 64, 6, '38%')}${ring(57, 64, 6, '4/7', 'warm')}<div style="flex:1"><div class="row between xs faint"><span>Level I</span><b class="muted">23 / 61</b></div><div class="bar mt-6"><i style="width:38%"></i></div><div class="row between xs faint mt-12"><span>Badge</span><b class="muted">12 / 14</b></div><div class="bar warm thin mt-6"><i style="width:86%"></i></div></div></div>
        <div class="dots mt-20">${['done', 'done', 'done', 'done', 'now', '', ''].map(s => `<i class="${s}"></i>`).join('')}<span class="xs faint" style="margin-left:10px">Step dots</span></div>
        <div class="week mt-20" style="max-width:320px">${[['M', 'done'], ['T', 'done'], ['W', 'done'], ['T', 'done'], ['F', 'today'], ['S', ''], ['S', '']].map(([l, s]) => `<div class="d ${s}"><i>${s === 'done' ? icon('check') : (s === 'today' ? '24' : '')}</i>${l}</div>`).join('')}</div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="eyebrow" style="padding:22px 22px 10px">Day rows</div>
        <div class="dayrow done"><span class="st">${icon('check')}</span><span class="dn">Day 23</span><div><div class="tt">Workout II Day</div><div class="sub"><span class="kind kind-w">${icon('dumbbell')}Strength</span><span>7 steps · 45 min</span></div></div><span class="xs faint">Completed</span></div>
        <div class="dayrow now"><span class="st">${icon('play')}</span><span class="dn">Day 24</span><div><div class="tt">Recovery Day</div><div class="sub"><span class="kind kind-r">${icon('leaf')}Recovery</span><span>5 steps · 34 min</span></div></div><span class="btn btn-warm btn-sm">Resume</span></div>
        <div class="dayrow"><span class="st"></span><span class="dn">Day 25</span><div><div class="tt">Workout III Day</div><div class="sub"><span class="kind kind-w">${icon('dumbbell')}Strength</span><span>7 steps · 45 min</span></div></div><span class="chip sm accent">Up next</span></div>
      </div>
      <div class="peak" style="background:var(--surface);box-shadow:var(--sh-2)"><div class="th" style="height:150px"><img src="${img('mike-deadlift.jpg')}" alt="" style="object-position:50% 30%"><span class="tag">Best next step</span></div><div class="tx" style="padding:16px 18px 18px"><b style="font-size:17px">Mastering the Kettlebell</b><span class="s">Smart offer card: tied to the member's progress, states the value, one clear action.</span><span class="cta">See what's inside · $297 ${icon('arrow-right')}</span></div></div>
    </div>
  </section>
  </div>`;
}

const css = `
.sys { max-width: 1360px; margin: 0 auto; padding: 56px 40px 80px; }
.sys-hero { display: grid; grid-template-columns: 1fr 560px; gap: 48px; align-items: center; }
.mark-lg { width: 48px; height: 48px; border-radius: 15px; background: var(--ink-900); display: grid; place-items: center; }
.mark-lg svg { width: 24px; height: 24px; }
.sys-photos { display: grid; grid-template-columns: 1.1fr 1fr; grid-template-rows: 170px 170px; gap: 12px; }
.sys-photos .photo { border-radius: 22px; }
.sys-sec { margin-top: 64px; }
.princ { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
.sys-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
.swrow { display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; }
.sw i { display: block; height: 54px; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(14,27,44,.08); }
.sw b { display: block; font: 650 11.5px/1 var(--sans); margin-top: 6px; }
.sw span { display: block; font: 500 10.5px/1 var(--sans); color: var(--text-3); margin-top: 3px; }
.usage { height: 40px; border-radius: 10px; color: #fff; font: 650 12px/40px var(--sans); padding: 0 12px; white-space: nowrap; overflow: hidden; }
.sys-surf { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
.surf-demo { padding: 18px; border-radius: 22px; background: var(--bg-deep); }
.ill { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.ill-cap { padding: 12px 16px 14px; }
.ill-cap b { display: block; font: 700 14px/1.2 var(--display); }
.ill-cap span { display: block; font-size: 12px; color: var(--text-3); margin-top: 3px; }
.medals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
.medal svg { margin: 0 auto; display: block; }
.medal b { display: block; font: 700 12px/1.2 var(--display); margin-top: 6px; }
.medal span { display: block; font-size: 11px; color: var(--text-3); margin-top: 2px; }
.icongrid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 8px; }
.icongrid span { height: 54px; border-radius: 14px; background: var(--surface); box-shadow: var(--sh-1); display: grid; place-items: center; color: var(--text); }
.icongrid span svg.i { width: 22px; height: 22px; }
.icongrid span > svg:not(.i) { width: 20px; height: 22px; }
.motion { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.comp { display: grid; grid-template-columns: 1.25fr 1fr; gap: 20px; }
`;

module.exports = { system: () => doc({ title: 'Design system', body: body(), css }) };
