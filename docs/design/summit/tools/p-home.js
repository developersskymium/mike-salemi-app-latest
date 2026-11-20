const { icon, scene, climb, ring, sidebar, topbars, doc } = require('./lib');

const img = (f) => `assets/img/${f}`;

function progCard({ photo, pos = '50% 40%', tag = '', title, pct, upn, verb = 'Resume', sub = '', w = '' }) {
  return `<article class="pcard ${w}">
    <div class="photo zoom"><img src="${img(photo)}" alt="" style="object-position:${pos}">${tag}</div>
    <div class="body">
      <div class="t">${title}</div>
      ${pct != null ? `<div class="row gap-10 mt-6"><div class="bar thin" style="flex:1"><i style="width:${pct}%"></i></div><b class="xs tnum">${pct}%</b></div>` : ''}
      ${sub ? `<div class="small muted">${sub}</div>` : ''}
      ${upn ? `<div class="upn">Up next · <b>${upn}</b></div>` : ''}
      <div class="foot"><span class="link">${verb} ${icon('arrow-right')}</span></div>
    </div></article>`;
}

function joinCard({ photo, pos = '50% 40%', title, size, access, price, free }) {
  return `<article class="pcard sm">
    <div class="photo zoom"><img src="${img(photo)}" alt="" style="object-position:${pos}">${free ? '<span class="tag light">Free</span>' : ''}</div>
    <div class="body">
      <div class="t" style="font-size:15.5px">${title}</div>
      <div class="xs faint">${size} · ${access}</div>
      <div class="foot">${price === "view" ? `<span class="btn btn-secondary btn-sm">${icon("lock-keyhole")} View program</span>` : price ? `<span class="btn btn-secondary btn-sm">${icon("lock-keyhole")} Unlock · ${price}</span>` : `<span class="btn btn-soft btn-sm">${icon('plus')} Join program</span>`}</div>
    </div></article>`;
}

function hero(phone = false) {
  const steps = [['Morning Routine', '8 min', 'now'], ['Bodyweight Warm Up', '7 min', ''], ['Working In', '10 min', ''], ['Stretching', '7 min', ''], ['Completion', '2 min', '']];
  return `<section class="hero anim-rise">
    <div class="photo scrim-l"><img src="${img('mike-standing.jpg')}" alt="Mike Salemi in the gym with a kettlebell"></div>
        <div class="content">
      <div class="row gap-8"><span class="tag warm">Continue training</span><span class="chip onphoto sm">Day 24 of 61</span></div>
      <h1 class="d-xxl" style="margin-top:18px">Recovery Day</h1>
      <div class="meta">Kettlebell Lifestyle · Level I · Phase 2 &nbsp;·&nbsp; 5 steps · 34 min</div>
      <div class="stepline">
        <div class="segs">${steps.map(s => `<i class="${s[2]}"></i>`).join('')}</div>
        <div class="labs">${steps.map(s => `<span><b>${s[0]}</b>${s[1]}</span>`).join('')}</div>
      </div>
      <div class="row gap-10" style="margin-top:28px">
        <a class="btn btn-primary btn-lg" href="day.html">${icon('play')} Start Day 24</a>
        <a class="btn btn-onphoto btn-lg" href="program.html">View the program</a>
      </div>
      <div class="row gap-12" style="margin-top:26px;max-width:420px">
        <span class="xs" style="color:rgba(255,255,255,.75);white-space:nowrap">Level I</span>
        <div class="bar onphoto thin" style="flex:1"><i style="width:38%"></i></div>
        <span class="xs" style="color:#fff;font-weight:700;white-space:nowrap">23 / 61 days · 38%</span>
      </div>
    </div>
    <div class="quote glass-dark">
      <img src="${img('mike-face.png')}" alt="">
      <div><p>“Recovery is where yesterday's work turns into strength. Breathe slow, move easy — and show up.”</p><small>MIKE · NOTE FOR DAY 24</small></div>
    </div>
  </section>`;
}

function climbCard() {
  return `<section class="card card-pad" style="padding:24px 26px 22px">
    <div class="row between">
      <div><div class="eyebrow accent">Your climb · Kettlebell Lifestyle Level I</div><h2 class="d-md mt-6">You're 38% of the way up.</h2></div>
      <div class="row gap-16">
        <div style="text-align:right"><div class="num" style="font-size:26px">23<span class="faint" style="font-size:16px">/61</span></div><div class="xs faint">days complete</div></div>
        ${ring(38, 58, 6, '38%')}
      </div>
    </div>
    <div class="mt-12" style="margin:12px -26px 0;">${climb({ id: 'hc', H: 236 })}</div>
    <div class="row between mt-20" style="align-items:flex-end">
      <div><div class="d-xs">Beyond the summit</div><div class="xs faint mt-4">Where members go after Level I — picked for your pace and goals.</div></div>
      <span class="link">See your full path ${icon('arrow-right')}</span>
    </div>
    <div class="peaks mt-12">
      <div class="peak locked"><div class="th"><img src="${img('mike-getup.jpg')}" alt="" style="object-position:50% 25%"><span class="chip onphoto sm">${icon('lock-keyhole')} Included</span></div><div class="tx"><b>Level II · Intermediate</b><span class="s">Unlocks when you reach the Day 61 summit.</span><span class="cta">Preview Level II ${icon('arrow-right')}</span></div></div>
      <div class="peak"><div class="th"><img src="${img('mike-deadlift.jpg')}" alt="" style="object-position:50% 30%"><span class="tag">Best next step</span></div><div class="tx"><b>Mastering the Kettlebell</b><span class="s">Technique for every Phase 2 lift · $297</span><span class="cta">See what's inside ${icon('arrow-right')}</span></div></div>
      <div class="peak"><div class="th"><img src="${img('summit-group.jpg')}" alt="" style="object-position:50% 40%"><span class="chip onphoto sm">Applications open</span></div><div class="tx"><b>The Breakthrough retreat</b><span class="s">Train with Mike on Mount Shasta · May 13–16</span><span class="cta">Apply ${icon('arrow-right')}</span></div></div>
    </div>
  </section>`;
}

function weekCard() {
  const days = [['M', 'done'], ['T', 'done'], ['W', 'done'], ['T', 'done'], ['F', 'today'], ['S', ''], ['S', '']];
  return `<section class="card card-pad" style="display:flex;flex-direction:column;padding:24px">
    <div class="eyebrow warm">This week</div>
    <div class="streak-big mt-12">
      <span class="flame">${icon('flame')}</span>
      <div><div class="num" style="font-size:40px;line-height:.9">12 <span style="font-size:18px;letter-spacing:-.01em">days</span></div><div class="small muted mt-4">Your longest streak yet</div></div>
    </div>
    <div class="week mt-20">${days.map(([l, s]) => `<div class="d ${s}"><i>${s === 'done' ? icon('check') : (s === 'today' ? '24' : '')}</i>${l}</div>`).join('')}</div>
    <hr class="hair mt-20">
    <div class="mt-16 row gap-12" style="align-items:flex-start">
      <span style="width:40px;height:40px;border-radius:12px;background:var(--gold-50);display:grid;place-items:center;flex:none">${medal(26)}</span>
      <div><div style="font:650 14px/1.3 var(--sans)">2 days to your 14-day badge</div><div class="xs faint mt-4">Finish today and tomorrow to earn <b class="muted">Fortnight Strong</b>.</div></div>
    </div>
    <div class="mt-16"><div class="row between xs faint"><span>Badge progress</span><b class="muted">12 / 14</b></div><div class="bar warm thin mt-6"><i style="width:86%"></i></div></div>
    <hr class="hair mt-20">
    <div class="row between mt-16" style="align-items:flex-end">
      <div><div class="xs faint">Trained this week</div><div class="num mt-4" style="font-size:24px">2h 41m</div><div class="xs mt-4" style="color:var(--ok);font-weight:650">↑ 18% on last week</div></div>
      <div class="minibars">${[46, 34, 52, 29, 0, 0, 0].map((v, i) => `<i style="height:${Math.max(v, 4)}px" class="${i === 4 ? 'today' : ''} ${v ? '' : 'empty'}"></i>`).join('')}</div>
    </div>
  </section>`;
}

function medal(s = 28) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path d="M10 2h5l3 8h-5z" fill="var(--g-500)"/><path d="M22 2h-5l-3 8h5z" fill="var(--e-500)"/><circle cx="16" cy="19" r="10" fill="var(--gold)"/><circle cx="16" cy="19" r="7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/><path d="M16 14.6l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#fff"/></svg>`;
}

function body() {
  return `<div class="app">${sidebar('home')}<div class="main">${topbars()}<div class="page">
  ${hero()}

  <div style="display:grid;grid-template-columns:minmax(0,2.15fr) minmax(0,1fr);gap:20px;margin-top:20px">
    ${climbCard()}
    ${weekCard()}
  </div>

  <section class="section">
    <div class="sec-head"><div><h2 class="d-md">Your programs</h2><div class="sub">Pick up exactly where you left off.</div></div><div class="row gap-12"><a class="link" href="catalog.html">See all ${icon('arrow-right')}</a><div class="rail-nav"><span>${icon('chevron-left')}</span><span>${icon('chevron-right')}</span></div></div></div>
    <div class="grid-4">
      ${progCard({ photo: 'mike-standing.jpg', pos: '60% 30%', tag: '<span class="tag">Immersion</span>', title: 'Kettlebell Lifestyle · Level I', pct: 38, upn: 'Day 24 · Recovery Day', verb: 'Resume' })}
      ${progCard({ photo: 'working-in.jpg', pos: '50% 50%', tag: '<span class="tag light">Course</span>', title: 'Working In', pct: 22, upn: 'Lesson 3 · Standing Cross Crawl', verb: 'Continue' })}
      ${progCard({ photo: 'mike-goblet.jpg', pos: '50% 30%', tag: '<span class="tag light">Self-Guided</span>', title: 'Kettlebell Lifestyle · Self-Guided', sub: 'Included with your membership', upn: 'Build your own week', verb: 'Open' })}
      <article class="pcard add"><span class="icon-btn" style="width:52px;height:52px;background:var(--accent-soft);box-shadow:none;color:var(--accent-ink)">${icon('plus')}</span><div class="d-xs">Start something new</div><div class="small muted" style="max-width:200px">3 programs are included with your membership.</div><span class="link">Browse ${icon('arrow-right')}</span></article>
    </div>
  </section>

  <section class="section">
    <div class="sec-head"><div><h2 class="d-md">Upcoming activity</h2></div><a class="link" href="#">Open schedule ${icon('arrow-right')}</a></div>
    <div class="grid-3">
      <div class="card flat act"><div class="date"><span>DEC</span><b>04</b></div><div><div class="eyebrow warm">Live call</div><div class="d-xs mt-4">Monthly Q&amp;A with Mike</div><div class="xs faint mt-4">Thu · 6:00 PM PT · 60 min</div></div></div>
      <div class="card flat act"><div class="date"><span>DEC</span><b>11</b></div><div><div class="eyebrow warm">Invitation</div><div class="d-xs mt-4">Community workout drop</div><div class="xs faint mt-4">Fri · Train it live or on demand</div></div></div>
      <div class="card flat act retreat"><div class="date"><span>MAY</span><b>13</b></div><div><div class="eyebrow warm">Retreat</div><div class="d-xs mt-4">The Breakthrough</div><div class="xs faint mt-4">May 13–16, 2027 · Mount Shasta</div></div></div>
    </div>
  </section>

  <section class="section">
    <div class="sec-head"><div><h2 class="d-md">Programs you can join</h2><div class="sub">Included with your membership — one tap and you're in.</div></div><div class="row gap-12"><a class="link" href="catalog.html">See all ${icon('arrow-right')}</a><div class="rail-nav"><span>${icon('chevron-left')}</span><span>${icon('chevron-right')}</span></div></div></div>
    <div class="grid-4">
      ${joinCard({ photo: 'mike-deadlift.jpg', pos: '50% 35%', title: 'What Your Kettlebell Swing Is Missing', size: '7 lessons', access: 'Free', free: true })}
      ${joinCard({ photo: 'mike-press.jpg', pos: '50% 25%', title: 'Free 6-Video Kettlebell Mini-Series', size: '6 videos', access: 'Free', free: true })}
      ${joinCard({ photo: 'mike-coaching.jpg', pos: '50% 40%', title: 'Kettlebell Roadmap', size: '4 lifts', access: 'Free tool', free: true })}
      ${joinCard({ photo: 'mike-windmill.jpg', pos: '60% 40%', title: 'Average Day Builder', size: 'Planner', access: 'Included' })}
    </div>
  </section>

  <section class="section">
    <div class="offer">
      <div class="photo"><img src="${img('mike-windmill.jpg')}" alt="Mike in a kettlebell windmill" style="object-position:62% 50%"></div>
      <div class="body">
        <div class="row gap-8"><span class="tag">Matched to Phase 2</span><span class="chip sm">${icon('sparkles')} Picked for you</span></div>
        <h2 class="d-lg mt-16">Every lift you're learning now — broken down frame by frame.</h2>
        <p class="lede" style="margin:12px 0 0">Phase 2 adds the clean, press and squat. <b style="color:var(--text)">Mastering the Kettlebell</b> is Mike's 400+ video technique library, mapped to the days you're training.</p>
        <ul class="ticks">
          <li>${icon('check')}<span>Technique breakdown for each Phase 2 lift, linked from your day</span></li>
          <li>${icon('check')}<span>Fix-it drills for the 12 most common swing and clean faults</span></li>
          <li>${icon('check')}<span>Yours for life — carries you through Level II</span></li>
        </ul>
        <div class="row gap-16" style="margin-top:auto;padding-top:24px">
          <div><div class="price">$297</div><div class="xs faint mt-4">One-time · lifetime access</div></div>
          <a class="btn btn-primary btn-lg ml-auto" href="catalog.html">See what's inside</a>
          <a class="btn btn-ghost" href="#">Watch a free lesson</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="sec-head"><div><h2 class="d-md">Retreats &amp; gatherings</h2><div class="sub">Train with Mike in person, on Mount Shasta.</div></div><a class="link" href="#">See all ${icon('arrow-right')}</a></div>
    <div class="grid-2">
      <a class="rcard"><div class="photo scrim-b zoom"><img src="${img('summit-group.jpg')}" alt="Men of Movement group on Mount Shasta"></div><div class="body"><div class="row gap-8"><span class="tag warm">Applications open</span><span class="chip onphoto sm">Capped at 20 men</span></div><h3 class="d-lg mt-12">The Breakthrough</h3><div class="row between mt-8"><span style="color:rgba(255,255,255,.82);font-size:14px">May 13–16, 2027 · Private sanctuary, Mount Shasta</span><span class="btn btn-light btn-sm">Apply ${icon('arrow-right')}</span></div></div></a>
      <a class="rcard"><div class="photo scrim-b zoom"><img src="${img('tims-land.jpg')}" alt="Men walking on Tim's land"></div><div class="body"><div class="row gap-8"><span class="chip onphoto sm">Fall retreat</span><span class="chip onphoto sm">3 nights · 4 days</span></div><h3 class="d-lg mt-12">The Primal Reset</h3><div class="row between mt-8"><span style="color:rgba(255,255,255,.82);font-size:14px">Sep 2–5, 2027 · Tim Corcoran's land, Mt. Shasta</span><span class="btn btn-onphoto btn-sm">Join waitlist</span></div></div></a>
    </div>
  </section>

  <section class="section">
    <div class="sec-head"><div><h2 class="d-md">Explore next</h2><div class="sub">Go deeper when you're ready.</div></div><div class="row gap-12"><a class="link" href="catalog.html">See all ${icon('arrow-right')}</a><div class="rail-nav"><span>${icon('chevron-left')}</span><span>${icon('chevron-right')}</span></div></div></div>
    <div class="grid-4">
      ${joinCard({ photo: 'mike-squat.jpg', title: 'Mastering the Kettlebell', size: '400+ videos', access: 'Technique course', price: '$297' })}
      ${joinCard({ photo: 'tgk.jpg', title: 'The Grounded King', size: '8 weeks', access: '4 sessions a week', price: '$197' })}
      ${joinCard({ photo: 'mike-getup.jpg', pos: '50% 30%', title: 'Athleticism 4 Life', size: '12 weeks', access: 'Strength & conditioning', price: 'view' })}
      ${joinCard({ photo: 'mike-coaching.jpg', title: '1:1 Coaching with Mike', size: 'Live video', access: 'Your program, built around you', price: '$180' })}
    </div>
  </section>
  </div></div></div>`;
}

module.exports = { home: () => doc({ title: 'Home', body: body() }), hero, climbCard, weekCard, progCard, joinCard, medal };
