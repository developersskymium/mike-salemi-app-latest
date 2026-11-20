const { icon, scene, ring, doc, fig } = require('./lib');
const img = (f) => `assets/img/${f}`;

const steps = [
  ['Training Readiness Assessment', '4 min', 'done'], ['Morning Routine', '8 min', 'done'], ['Bodyweight Warm Up', '7 min', 'done'],
  ['Kettlebell Preparation', '6 min', 'done'], ['Workout III', '24 min', 'now'], ['Post Training Stretching', '10 min', 'locked'], ['Completion', '2 min', 'locked'],
];

const rows = [
  ['c1', 'Static Alternating Lunge with Counter Rotation (Crush Grip)', '10s', 'down', 'Light', 'l', '40s', '2', 'Moderate'],
  ['c1', 'Butterflies', '20s', 'up', 'Bodyweight', '', '40s', '2', 'Moderate'],
  ['sep', '30 sec rest before next superset'],
  ['c2', 'Half Kneeling Overhead Press', '10s', 'down', 'Light–Moderate', 'm', '40s (15s L / 15s R + 10s switch)', '2', 'Moderate'],
  ['c2', 'Glute Bridges', '20s', 'up', 'Bodyweight', '', '40s', '2', 'Moderate'],
  ['sep', '30 sec rest before next superset'],
  ['c3', 'Single Arm Bent Over Row (Unsupported)', '10s', 'down', 'Light', 'l', '40s (20s L / 20s R)', '2', 'Slow–Moderate'],
  ['c3', 'Side of Hip Raises', '20s', 'up', 'Bodyweight', '', '40s (15s L / 15s R + 10s switch)', '2', 'Moderate'],
];

function table() {
  return `<table class="wt"><thead><tr><th style="width:64px">Type</th><th>Exercise</th><th>Rest</th><th>Intensity</th><th>Reps</th><th>Sets</th><th>Tempo</th></tr></thead><tbody>
  ${rows.map(r => r[0] === 'sep' ? `<tr class="sep"><td colspan="7">${icon('timer', '')} ${r[1]}</td></tr>` :
    `<tr><td><img class="cb" src="assets/icons/${r[0]}.png" alt="${r[0].toUpperCase()}"></td><td class="ex">${r[1]}</td><td><span class="rest"><img src="assets/icons/rest-${r[3]}.png" alt="">${r[2]}</span></td><td><span class="int ${r[5]}">${r[4]}</span></td><td class="tnum">${r[6]}</td><td class="tnum" style="font-weight:700">${r[7]}</td><td>${r[8]}</td></tr>`).join('')}
  </tbody></table>`;
}

function seqList(compact = false) {
  return `<div class="seq">${steps.map(([t, d, s], i) => `<div class="s ${s}"><span class="n">${s === 'done' ? icon('check') : (s === 'locked' ? icon('lock-keyhole') : i + 1)}</span><div><b>${t}</b><span>${icon('clock')} ${d}${s === 'now' ? ' · in progress' : ''}</span></div>${s === 'done' ? `<span class="xs" style="color:var(--ok);font-weight:650">Done</span>` : s === 'now' ? `<span class="pulse-dot"></span>` : ''}</div>`).join('')}</div>`;
}

function desktop() {
  const body = `<div class="dv">
  <header class="dv-top">
    <div class="row gap-12"><a class="btn btn-secondary btn-sm" href="program.html">${icon('x')} Exit</a><span class="small faint">Kettlebell Lifestyle</span></div>
    <div class="ctr"><div class="eyebrow accent">Level I · Phase 2 · Day 25</div><b>Workout III Day</b></div>
    <div class="row gap-16" style="justify-content:flex-end">
      <div class="dots">${steps.map(s => `<i class="${s[2] === 'done' ? 'done' : s[2] === 'now' ? 'now' : ''}"></i>`).join('')}</div>
      <span class="row gap-8 small" style="color:var(--text-2);font-weight:600">Autoplay <span class="toggle"></span></span>
      <span class="btn btn-soft btn-sm">${icon('clipboard-list')} Session plan</span>
      <span class="row gap-8"><b class="small tnum">4/7</b>${ring(57, 34, 4, '')}</span>
    </div>
  </header>
  <div class="dv-body">
    <main class="stage">
      <div class="video">
        <img src="${img('mike-coaching.jpg')}" alt="Mike coaching a kettlebell movement" style="object-position:50% 38%">
        <div class="tl"><span class="chip onphoto">${icon('dumbbell')} Workout III · 3 supersets</span><span class="chip onphoto">Bell: 12 kg · from your readiness check</span></div>
        <span class="play glass-dark"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span>
        <div class="ctl glass-dark">
          <span class="row gap-12">${icon('pause')}<span class="xs tnum" style="font-weight:650">8:12 / 24:00</span></span>
          <div class="scrub"><i></i></div>
          <span class="row gap-12">${icon('captions')}${icon('settings')}${icon('maximize')}</span>
        </div>
      </div>

      <div class="card stepmeta">
        <div>
          <div class="eyebrow warm">Step 5 of 7 · 24 min</div>
          <h1 class="d-lg mt-6">Workout III</h1>
          <div class="muted mt-6">Three supersets, 40 seconds on, two rounds each. Follow along with Mike, or use the table below at your own pace.</div>
        </div>
        <div class="row gap-8">
          <span class="icon-btn" title="Previous step">${icon('chevron-left')}</span>
          <span class="btn btn-primary btn-lg">${icon('check')} Mark complete</span>
          <span class="icon-btn" title="Next step">${icon('chevron-right')}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;margin-top:20px">
        <div class="card coachnote">
          <img src="${img('mike-face.png')}" alt="Mike">
          <div><div class="row gap-8"><b class="d-xs">Mike's notes</b><span class="chip sm">Day 25</span></div>
          <p style="margin:8px 0 0;color:var(--text-2);font-size:14.5px;line-height:1.6">Crush the handle on the lunge — the grip switches your core on. On the half-kneeling press, ribs down and squeeze the down-side glute before the bell moves. If the row pulls your shoulder forward, go lighter: posture first, load second.</p></div>
        </div>
        <div class="card" style="padding:18px 20px">
          <div class="eyebrow">Today's readiness</div>
          <div class="row gap-12 mt-12">${ring(82, 52, 5, '82')}<div><div class="d-xs">Sharp — full workout</div><div class="xs faint mt-4">Slept well · low stress · fully recovered</div></div></div>
          <div class="row gap-6 mt-12 wrap"><span class="chip sm ok">${icon('check')} Table 1 of 3</span><span class="chip sm">Bell: 12 kg</span></div>
        </div>
      </div>

      <section class="mt-24">
        <div class="row between"><div class="row gap-10"><h2 class="d-sm">In this lesson</h2><span class="chip sm">6 clips</span></div><span class="small faint">${icon('repeat')} Plays through automatically</span></div>
        <div class="clips mt-12">
          ${['Half-Kneeling-Overhead-Press', 'Glute-Bridges', 'Butterfly-Series', 'Hamstring-Stretch', 'Chest-Stretch', 'Bodyweight-Warm-Up'].map((c, i) => `<div class="clip ${i === 0 ? 'now' : ''}"><img src="${img('lib-' + c + '.png')}" alt=""></div>`).join('')}
        </div>
      </section>

      <section class="card mt-24" style="overflow:hidden">
        <div class="row between" style="padding:20px 22px 16px">
          <div><div class="eyebrow accent">Session plan</div><h2 class="d-sm mt-6">Today's workout table</h2></div>
          <div class="row gap-8"><span class="chip sm">${icon('layers')} 3 supersets</span><span class="chip sm">${icon('timer')} ~24 min</span><span class="btn btn-secondary btn-sm">${icon('printer')} Print</span></div>
        </div>
        ${table()}
        <div class="row gap-16" style="padding:14px 22px;font-size:12.5px;color:var(--text-3)"><span class="row gap-6"><img src="assets/icons/rest-down.png" style="width:14px"> Rest, then the next move</span><span class="row gap-6"><img src="assets/icons/rest-up.png" style="width:14px"> Rest, then repeat the superset</span><span class="ml-auto">Table chosen from your readiness score · <a class="link" style="font-size:12.5px">Retake</a></span></div>
      </section>
    </main>

    <aside class="dv-rail">
      <div class="eyebrow">Today's sequence</div>
      <div class="d-sm mt-6">4 of 7 steps done</div>
      <div class="xs faint mt-4">Complete each step to unlock the next.</div>
      <div class="bar thin mt-12"><i style="width:57%"></i></div>
      ${seqList()}
      <div class="sunk mt-16" style="padding:14px 16px">
        <div class="row between"><span class="xs faint">After today</span><span class="chip sm warm">${icon('flame')} 13-day streak</span></div>
        <div class="d-xs mt-8">Day 26 · Skill Development Day</div>
        <div class="xs faint mt-4">Unlocks when you finish today</div>
      </div>
      <div class="card flat mt-12" style="padding:14px 16px;display:grid;grid-template-columns:54px 1fr;gap:12px;align-items:center">
        <div class="photo" style="width:54px;height:54px;border-radius:12px"><img src="${img('mike-deadlift.jpg')}" alt="" style="object-position:50% 30%"></div>
        <div><div style="font:650 13px/1.3 var(--sans)">Struggling with the row?</div><div class="xs faint mt-4">Mike's 6-min fix in Mastering the Kettlebell</div><span class="link mt-4" style="font-size:12.5px">Watch preview ${icon('arrow-right')}</span></div>
      </div>
      <div class="row between mt-auto" style="padding-top:14px"><span class="link" style="color:var(--text-2)">${icon('arrow-left')} Day 24</span><span class="lockline">Day 26 ${icon('lock-keyhole')}</span></div>
    </aside>
  </div>
</div>`;
  return doc({ title: 'Day 25', body });
}

/* ---------- Phone ---------- */
function status(dark = false) {
  return `<div class="ph-status" style="${dark ? 'color:#fff' : ''}"><span>9:41</span><span class="r">${icon('signal')}${icon('wifi')}${icon('battery-full')}</span></div>`;
}

function phoneDay() {
  const body = `<div class="phone" style="padding-bottom:120px">
  ${status(true)}
  <div class="video" style="border-radius:0 0 26px 26px;aspect-ratio:auto;height:300px">
    <img src="${img('mike-coaching.jpg')}" alt="" style="object-position:50% 35%">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,15,25,.6),rgba(8,15,25,0) 35%,rgba(8,15,25,0) 60%,rgba(8,15,25,.5));z-index:1"></div>
    <div style="position:absolute;top:50px;left:16px;right:16px;z-index:3" class="row between"><span class="icon-btn glass-dark" style="box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)">${icon('x')}</span><div style="text-align:center;color:#fff"><div class="eyebrow" style="color:rgba(255,255,255,.75);font-size:10px">Level I · Phase 2 · Day 25</div><div style="font:750 15px/1.2 var(--display);margin-top:3px">Workout III Day</div></div><span class="icon-btn glass-dark" style="box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)">${icon('clipboard-list')}</span></div>
    <span class="play glass-dark" style="width:68px;height:68px;transform:translate(-50%,-30%)"><svg viewBox="0 0 24 24" style="width:26px;height:26px"><path d="M7 4.5v15l13-7.5z"/></svg></span>
    <div class="ctl glass-dark" style="left:12px;right:12px;bottom:12px;padding:8px 12px;gap:10px"><span class="xs tnum" style="font-weight:650">8:12</span><div class="scrub"><i></i></div><span class="xs tnum" style="opacity:.7">24:00</span></div>
  </div>
  <div class="ph-pad" style="margin-top:16px">
    <div class="row gap-6">${steps.map(s => `<i style="flex:1;height:5px;border-radius:9px;background:${s[2] === 'done' ? 'var(--ok)' : s[2] === 'now' ? 'var(--warm)' : 'var(--line-strong)'}"></i>`).join('')}</div>
    <div class="row between mt-16"><div><div class="eyebrow warm">Step 5 of 7 · 24 min</div><h1 class="d-md mt-4" style="font-size:28px">Workout III</h1></div>${ring(57, 46, 5, '4/7')}</div>
    <p class="muted" style="margin:8px 0 0;font-size:14.5px">Three supersets, 40 seconds on, two rounds each. Follow Mike or use the table.</p>
    <div class="row gap-6 mt-12 wrap"><span class="chip sm ok">${icon('check')} Readiness: Sharp</span><span class="chip sm">Bell: 12 kg</span><span class="chip sm">3 supersets</span></div>

    <div class="card coachnote mt-16" style="grid-template-columns:40px 1fr;gap:12px;padding:16px">
      <img src="${img('mike-face.png')}" alt="" style="width:40px;height:40px">
      <div><b class="d-xs" style="font-size:14px">Mike's note</b><p style="margin:4px 0 0;color:var(--text-2);font-size:13.5px;line-height:1.55">Crush the handle on the lunge. On the press: ribs down, squeeze the down-side glute first.</p></div>
    </div>

    <div class="row between mt-24"><h2 class="d-sm">Today's workout</h2><span class="link" style="font-size:12.5px">Table view</span></div>
    ${[['c1', 'Superset 1', [rows[0], rows[1]]], ['c2', 'Superset 2', [rows[3], rows[4]]], ['c3', 'Superset 3', [rows[6], rows[7]]]].map(([c, t, rs], k) => `
    <div class="card mt-12" style="overflow:hidden">
      <div class="row gap-10" style="padding:12px 14px;background:var(--surface-2);border-bottom:1px solid var(--line)"><img src="assets/icons/${c}.png" style="width:28px;height:28px" alt=""><b style="font:700 14px/1 var(--display)">${t}</b><span class="xs faint ml-auto">2 sets · 30s rest after</span></div>
      ${rs.map((r, j) => `<div style="padding:12px 14px;${j ? 'border-top:1px solid var(--line)' : ''}"><div style="font:650 14px/1.3 var(--sans)">${r[1]}</div><div class="row gap-6 mt-8 wrap"><span class="chip sm">${r[6].split(' ')[0]} × ${r[7]}</span><span class="chip sm ${r[5] === 'l' ? 'accent' : r[5] === 'm' ? 'warm' : ''}">${r[4]}</span><span class="chip sm"><img src="assets/icons/rest-${r[3]}.png" style="width:12px" alt=""> ${r[2]} rest</span><span class="chip sm">${r[8]}</span></div></div>`).join('')}
    </div>`).join('')}

    <div class="row between mt-24"><h2 class="d-sm">Today's sequence</h2><span class="xs faint">4 of 7 done</span></div>
    <div class="card mt-12" style="padding:6px">${seqList()}</div>
  </div>
  <div class="thumbbar glass">
    <span class="btn btn-primary btn-lg btn-block">${icon('check')} Mark Workout III complete</span>
    <span class="icon-btn" style="width:52px;height:52px;box-shadow:inset 0 0 0 1.5px dashed var(--line-strong);border:1.5px dashed var(--line-strong);background:transparent">${icon('skip-forward')}</span>
  </div>
  <div class="homebar"></div>
</div>`;
  return doc({ title: 'Day 25 · phone', body, css: 'body{background:var(--bg)}' });
}

function complete() {
  const confetti = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 37) % 390, y = 60 + ((i * 53) % 260), r = (i * 47) % 180, c = ['var(--e-400)', 'var(--g-400)', 'var(--gold)', 'var(--e-200)', 'var(--g-200)'][i % 5];
    return `<i style="position:absolute;left:${x}px;top:${y}px;width:${i % 3 ? 7 : 10}px;height:${i % 3 ? 12 : 6}px;background:${c};border-radius:2px;transform:rotate(${r}deg);opacity:.9"></i>`;
  }).join('');
  const body = `<div class="phone" style="padding-bottom:120px">
  ${status()}
  <div style="position:relative;padding-top:46px">
    <div style="position:absolute;inset:0;pointer-events:none;z-index:3">${confetti}</div>
    <div style="margin:10px 16px 0;border-radius:28px;overflow:hidden;box-shadow:var(--sh-2);position:relative">
      ${scene({ move: 'swing', t: 0, w: 358, h: 210, sun: [292, 56], figX: 70, figY: 22, figS: 176, mtnX: -30 })}
      <span class="tag warm" style="position:absolute;left:14px;top:14px">Day complete</span>
    </div>
  </div>
  <div class="ph-pad" style="text-align:center;margin-top:18px">
    <div class="eyebrow accent">Level I · Phase 2</div>
    <h1 class="d-xl mt-6" style="font-size:40px">Day 25, done.</h1>
    <p class="muted" style="margin:8px auto 0;max-width:310px;font-size:14.5px">Workout III is in the bank — 25 days up the mountain and a new best streak.</p>
  </div>
  <div class="ph-pad mt-16">
    <div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);padding:14px 8px;text-align:center">
      <div><div class="num" style="font-size:24px">7/7</div><div class="xs faint mt-4">steps</div></div>
      <div style="border-left:1px solid var(--line);border-right:1px solid var(--line)"><div class="num" style="font-size:24px">58<span style="font-size:14px"> min</span></div><div class="xs faint mt-4">trained</div></div>
      <div><div class="num" style="font-size:24px;color:var(--warm)">13 ${icon('flame', '')}</div><div class="xs faint mt-4">day streak</div></div>
    </div>
    <div class="card mt-12" style="padding:16px">
      <div class="row between"><b class="d-xs">Phase 2 progress</b><span class="xs faint"><b class="muted">5</b> of 20 days</span></div>
      <div class="row gap-4 mt-12">${Array.from({ length: 20 }, (_, i) => `<i style="flex:1;height:8px;border-radius:3px;background:${i < 4 ? 'var(--warm)' : i === 4 ? 'var(--e-300)' : 'var(--surface-sunk)'};${i >= 5 ? 'box-shadow:inset 0 0 0 1px var(--line)' : ''}"></i>`).join('')}</div>
      <div class="row gap-10 mt-12" style="align-items:center"><span style="width:34px;height:34px;border-radius:10px;background:var(--gold-50);display:grid;place-items:center">${require('./p-home').medal(22)}</span><div class="xs" style="color:var(--text-2)"><b style="color:var(--text)">1 day to Fortnight Strong</b> — train tomorrow to earn the 14-day badge.</div></div>
    </div>

    <div class="eyebrow mt-24" style="padding-left:2px">What's next</div>
    <div class="card mt-8" style="overflow:hidden">
      <div style="display:grid;grid-template-columns:96px 1fr;gap:14px;padding:14px;align-items:center">
        <div class="photo" style="height:96px;border-radius:16px"><img src="${img('mike-getup.jpg')}" alt="" style="object-position:50% 25%"></div>
        <div><span class="chip sm accent">Tomorrow · Sat</span><div class="d-sm mt-8" style="font-size:16.5px">Day 26 · Skill Development</div><div class="xs faint mt-4">5 steps · 30 min · Turkish get-up focus</div></div>
      </div>
      
    </div>
    <div class="card flat mt-12" style="padding:14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;background:var(--accent-soft);box-shadow:none">
      <div><div class="xs" style="color:var(--accent-ink);font-weight:700;letter-spacing:.06em;text-transform:uppercase">Get ready for Day 26</div><div style="font:650 14px/1.35 var(--sans);margin-top:4px">Mike's get-up breakdown, step by step — from Mastering the Kettlebell.</div></div>
      <span class="btn btn-sm btn-light" style="box-shadow:var(--sh-1)">Preview</span>
    </div>
    <div style="text-align:center;margin-top:18px"><span class="link" style="color:var(--text-2)">Back to Home</span></div>
  </div>
  <div class="thumbbar glass" style="grid-template-columns:1fr 52px">
    <span class="btn btn-primary btn-lg btn-block">${icon('bell')} Plan Day 26 for 7:00 AM</span>
    <span class="icon-btn" style="width:52px;height:52px">${icon('share-2')}</span>
  </div>
  <div class="homebar"></div>
</div>`;
  return doc({ title: 'Day complete', body });
}

module.exports = { day: desktop, 'day-phone': phoneDay, 'complete-phone': complete };
