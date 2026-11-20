const { icon, climb, ring, sidebar, topbars, doc } = require('./lib');
const img = (f) => `assets/img/${f}`;

const KIND = {
  w: ['dumbbell', 'kind-w'], r: ['leaf', 'kind-r'], s: ['target', 'kind-s'],
};
const days = [
  [21, 'Workout I Day', 'w', 'done'], [22, 'Recovery Day', 'r', 'done'], [23, 'Workout II Day', 'w', 'done'],
  [24, 'Recovery Day', 'r', 'now'], [25, 'Workout III Day', 'w', 'next'], [26, 'Skill Development Day', 's', ''],
  [27, 'Recovery Day', 'r', ''], [28, 'Workout I Day', 'w', ''], [29, 'Recovery Day', 'r', ''],
  [30, 'Workout II Day', 'w', ''], [31, 'Recovery Day', 'r', ''],
];
const meta = { w: '7 steps · 45 min', r: '5 steps · 34 min', s: '5 steps · 30 min' };

function dayRow([n, t, k, st]) {
  const right = st === 'done' ? `<span class="xs faint">Completed · Nov ${n - 7}</span>`
    : st === 'now' ? `<a class="btn btn-warm btn-sm" href="day.html">${icon('play')} Resume</a>`
    : st === 'next' ? `<span class="chip sm accent">Up next · tomorrow</span>`
    : `<span class="lockline">${icon('lock-keyhole')}</span>`;
  const stIcon = st === 'done' ? icon('check') : st === 'now' ? icon('play') : (st === 'next' ? '' : '');
  return `<div class="dayrow ${st}">
    <span class="st">${stIcon}</span>
    <span class="dn">Day ${n}</span>
    <div><div class="tt">${t}${st === 'now' ? ' <span class="chip sm warm" style="margin-left:8px;vertical-align:2px">You\'re here</span>' : ''}</div>
      <div class="sub"><span class="kind ${KIND[k][1]}">${icon(KIND[k][0])}${k === 'w' ? 'Strength' : k === 'r' ? 'Recovery' : 'Skill'}</span><span>${meta[k]}</span>${st === 'now' ? '<span>· Step 1 of 5</span>' : ''}</div></div>
    ${right}
  </div>`;
}

function body() {
  return `<div class="app">${sidebar('kbl')}<div class="main">${topbars()}<div class="page">
  <section class="chero">
    <div class="photo scrim-l"><img src="${img('mike-windmill.jpg')}" alt="Mike Salemi in a kettlebell windmill"></div>
    <div class="content">
      <div class="row between" style="max-width:none">
        <span class="tag light">Mike Salemi · Flagship program</span>
      </div>
      <h1 class="d-xxl" style="margin-top:20px;font-size:68px">Kettlebell<br>Lifestyle</h1>
      <p style="font-size:17px;line-height:1.5;color:rgba(255,255,255,.82);margin:14px 0 0;max-width:470px">Sixty-one days that rebuild how you move, train and recover — one guided day at a time.</p>
      <div class="metacaps"><span><b>4</b> phases</span><span><b>61</b> days</span><span><b>Level I</b></span><span style="color:var(--e-300)">${icon('flame')} <b style="color:var(--e-300)">12 day streak</b></span></div>
      <div class="row gap-10" style="margin-top:26px">
        <a class="btn btn-primary btn-lg" href="day.html">${icon('play')} Resume Day 24</a>
        <span class="btn btn-onphoto btn-lg">${icon('circle-play')} Watch intro · 3 min</span>
      </div>
      <div class="row gap-12" style="margin-top:26px;max-width:440px">
        <div class="bar onphoto thin" style="flex:1"><i style="width:38%"></i></div>
        <span class="xs" style="color:#fff;font-weight:700">23 / 61 days · 38%</span>
      </div>
    </div>
    <div style="position:absolute;right:24px;top:24px;z-index:3" class="seg onphoto"><span class="on">${icon('compass')} Immersion</span><span>${icon('sliders-horizontal')} Self-Guided</span></div>
  </section>

  <div class="stickybar">
    <div class="seg"><span class="on">Level I · Beginner</span><span>${icon('lock-keyhole')} Level II · Intermediate</span></div>
    <span class="small faint">Level II unlocks when you reach the Day 61 summit — it's included in your plan.</span>
  </div>

  <section class="card mt-20" style="padding:28px 0 16px;overflow:hidden">
    <div style="padding:0 30px;position:relative;z-index:2;max-width:560px">
      <div class="eyebrow accent">Your route · Level I</div><h2 class="d-lg mt-6">Phase 2 is where it clicks.</h2><div class="muted mt-8">You've cleared the On Ramp and Phase 1. Sixteen days of Phase 2 left, then the push to the Day 61 summit.</div>
      <div class="row mt-20" style="gap:30px">
        ${[['Days done', '23'], ['Workouts', '9'], ['Time trained', '14h 20m'], ['Best streak', '12']].map(([l, v]) => `<div><div class="num" style="font-size:28px">${v}</div><div class="xs faint mt-4">${l}</div></div>`).join('')}
      </div>
    </div>
    <div class="climb-over">${climb({ id: 'pc', H: 250 })}</div>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:36px;align-items:start">
    <section>
      <div class="row between"><h2 class="d-md">Curriculum</h2><span class="small faint">One phase at a time · tap a day to open it</span></div>
      <div class="pilltabs mt-16">
        <span class="pilltab done">${icon('check')} On Ramp <span class="pc">100%</span></span>
        <span class="pilltab done">${icon('check')} Phase 1 <span class="pc">100%</span></span>
        <span class="pilltab on">Phase 2 <span class="pc">20%</span></span>
        <span class="pilltab">Phase 3 <span class="pc">0%</span></span>
      </div>
      <div class="card mt-16" style="overflow:hidden">
        <div style="display:grid;grid-template-columns:1fr 200px;gap:20px;padding:24px 24px 22px;border-bottom:1px solid var(--line)">
          <div>
            <div class="eyebrow warm">Days 21–40 · Weeks 4–6</div>
            <h3 class="d-md mt-8">Phase 2 · Adding Complexity</h3>
            <p class="muted" style="margin:8px 0 0;font-size:14.5px;max-width:520px">Your foundation is set. Phase 2 adds a third workout, combination lifts and skill days — more complexity, more strength, same daily rhythm.</p>
            <div class="row gap-8 mt-12 wrap"><span class="chip sm">${icon('dumbbell')} 10 workout days</span><span class="chip sm">${icon('leaf')} 7 recovery days</span><span class="chip sm">${icon('target')} 3 skill days</span></div>
          </div>
          <div class="sunk" style="padding:16px;display:grid;place-items:center;text-align:center;gap:6px">
            ${ring(20, 76, 7, '4/20', 'warm')}
            <div class="xs faint">days in Phase 2</div>
          </div>
        </div>
        <div class="daylist">${days.map(dayRow).join('')}</div>
        <div style="padding:14px;border-top:1px solid var(--line);text-align:center"><span class="link">Show days 32–40 ${icon('chevron-down')}</span></div>
      </div>

      <div class="card mt-20" style="display:grid;grid-template-columns:150px 1fr auto;gap:22px;align-items:center;padding:18px 22px 18px 18px">
        <div class="photo" style="height:104px;border-radius:14px"><img src="${img('mike-deadlift.jpg')}" alt="" style="object-position:50% 30%"></div>
        <div>
          <div class="row gap-8"><span class="tag">Pairs with Day 25</span></div>
          <div class="d-sm mt-8">Your Workout III lifts, frame by frame</div>
          <div class="small muted mt-4">Tomorrow adds the half-kneeling press and single-arm row. Mastering the Kettlebell has Mike's full breakdown of both.</div>
        </div>
        <div style="text-align:right"><a class="btn btn-secondary btn-sm">Preview a lesson</a><div class="xs faint mt-8">$297 · lifetime</div></div>
      </div>
    </section>

    <aside style="display:grid;gap:16px;position:sticky;top:84px">
      <div class="card" style="overflow:hidden;color:#fff;background:var(--ink-900)">
        <div class="photo scrim-b" style="height:150px"><img src="${img('working-in.jpg')}" alt="" style="object-position:50% 45%"></div>
        <div style="padding:16px 18px 18px;margin-top:-56px;position:relative;z-index:2">
          <div class="eyebrow" style="color:var(--e-300)">On the plan today · Friday</div>
          <div class="d-sm mt-6" style="color:#fff">Day 24 · Recovery Day</div>
          <div class="xs mt-4" style="color:rgba(255,255,255,.65)">Level I · Phase 2 · 34 min</div>
          <a class="btn btn-warm btn-block mt-16" href="day.html">${icon('play')} Start today's session</a>
        </div>
      </div>
      <div class="card side-card">
        <div class="row between"><div class="d-xs">Your pace</div><div class="seg" style="padding:3px"><span class="on" style="height:28px;font-size:12px;padding:0 10px">Free</span><span style="height:28px;font-size:12px;padding:0 10px">Scheduled</span></div></div>
        <div class="row between mt-16">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<span class="daypill ${[0, 1, 2, 3, 4].includes(i) ? 'on' : ''}">${d}</span>`).join('')}</div>
        <div class="small muted mt-12">5 days a week · finish Level I on <b style="color:var(--text)">Jan 4</b></div>
        <div class="row gap-8 mt-16"><span class="btn btn-secondary btn-sm" style="flex:1">${icon('calendar-plus')} Sync calendar</span><span class="btn btn-ghost btn-sm">View schedule</span></div>
      </div>
      <div class="card side-card">
        <div class="d-xs">Phase guides</div>
        <div class="mt-12">
          ${[['On Ramp plan', '2 pages'], ['Phase I plan', '6 pages'], ['Phase II plan', '7 pages'], ['Phase III plan', '7 pages']].map(([t, d]) => `<div class="pdf"><span class="ic">PDF</span><div><b style="font:650 13.5px/1.2 var(--sans)">${t}</b><div class="xs faint">${d}</div></div>${icon('download', 'faint')}</div>`).join('')}
        </div>
      </div>
      <div class="card side-card">
        ${[['sliders-horizontal', 'Self-Guided mode', 'Train any day, in any order'], ['layout-grid', 'Program hub', 'Phases, notes and FAQs'], ['library-big', 'Video library', '180+ moves with Mike'], ['wrench', 'Tools', 'Kettlebell selector & more']].map(([ic, t, s]) => `<div class="qlink"><span class="ic">${icon(ic)}</span><div><b>${t}</b><span>${s}</span></div>${icon('chevron-right', 'faint')}</div>`).join('')}
      </div>
    </aside>
  </div>

  <section class="section">
    <div class="sec-head"><div><div class="eyebrow accent">When you're ready for more</div><h2 class="d-lg mt-6">The path Mike built after Level I</h2></div><a class="link" href="catalog.html">All programs ${icon('arrow-right')}</a></div>
    <div class="card" style="padding:26px">
      <div class="ladder">
        ${[['done', 'Level I', 'You are here · 38%'], ['', 'Level II', 'Intermediate · included'], ['', 'Mastering the Kettlebell', 'Technique, 400+ videos'], ['', 'Men of Movement', 'In person, Mount Shasta']].map(([s, t, d], i) => `<div class="st ${i === 0 ? 'now' : ''}"><span class="dot">${i === 0 ? '<span class="pulse-dot" style="width:10px;height:10px;box-shadow:none"></span>' : `<b style="font:800 12px/1 var(--display);color:var(--text-3)">${i + 1}</b>`}</span><div class="d-xs mt-12">${t}</div><div class="xs faint mt-4">${d}</div></div>`).join('')}
      </div>
      <div class="grid-3 mt-24">
        <div class="peak"><div class="th" style="height:150px"><img src="${img('mike-getup.jpg')}" alt="" style="object-position:50% 25%"><span class="chip onphoto sm">${icon('lock-keyhole')} Unlocks at Day 61</span></div><div class="tx"><b>Level II · Intermediate</b><span class="s">Four new phases: heavier bells, complexes and flows. Included in your plan.</span><span class="cta">Preview Level II ${icon('arrow-right')}</span></div></div>
        <div class="peak"><div class="th" style="height:150px"><img src="${img('mike-squat.jpg')}" alt="" style="object-position:50% 35%"><span class="tag">Best next step</span></div><div class="tx"><b>Mastering the Kettlebell</b><span class="s">Mike's complete technique library — mapped to every lift in Levels I and II.</span><span class="cta">See what's inside · $297 ${icon('arrow-right')}</span></div></div>
        <div class="peak"><div class="th" style="height:150px"><img src="${img('fire.jpg')}" alt="" style="object-position:50% 50%"><span class="chip onphoto sm">May 13–16, 2027</span></div><div class="tx"><b>The Breakthrough retreat</b><span class="s">Four days with Mike on Mount Shasta. Twenty men, by application.</span><span class="cta">Apply ${icon('arrow-right')}</span></div></div>
      </div>
    </div>
  </section>
  </div></div></div>`;
}

module.exports = { program: () => doc({ title: 'Kettlebell Lifestyle', body: body() }) };
