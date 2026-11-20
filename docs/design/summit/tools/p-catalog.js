const { icon, sidebar, topbars, doc, ring } = require('./lib');
const img = (f) => `assets/img/${f}`;

function vcard(c) {
  const access = c.access === 'inc' ? `<span class="access inc">${icon('circle-check')} ${c.accessLabel || 'Included'}</span>`
    : c.access === 'own' ? `<span class="access own">${icon('circle-check')} Owned</span>`
    : `<span class="access lock">${icon('lock-keyhole')} ${c.accessLabel || 'Locked'}</span>`;
  const cta = c.access === 'lock' ? `<span class="btn ${c.rec ? 'btn-primary' : 'btn-secondary'} btn-sm">${c.cta || 'View program'}</span>` : `<span class="btn btn-soft btn-sm">${c.cta || 'Open'} ${icon('arrow-right')}</span>`;
  return `<article class="vcard ${c.rec ? 'rec' : ''}">
    <div class="photo zoom"><img src="${img(c.photo)}" alt="" style="object-position:${c.pos || '50% 35%'}">${c.badge ? `<span style="position:absolute;left:14px;top:14px;z-index:2" class="${c.badgeCls || 'tag'}">${c.badge}</span>` : ''}${c.progress != null ? `<div style="position:absolute;left:14px;right:14px;bottom:14px;z-index:2" class="row gap-10"><div class="bar onphoto thin" style="flex:1"><i style="width:${c.progress}%"></i></div><b class="xs" style="color:#fff">${c.progress}%</b></div>` : ''}${c.progress != null ? '<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(8,15,25,.6))"></div>' : ''}</div>
    <div class="body">
      <div class="inst"><img src="${img(c.instImg || 'mike-face.png')}" alt="">${c.inst || 'Mike Salemi'}</div>
      <h3>${c.name}</h3>
      <p class="sum">${c.sum}</p>
      ${c.offer ? `<div class="offerline">${icon('sparkles')} ${c.offer}</div>` : ''}
      <ul class="ticks sm" style="margin-top:12px">${c.hi.map(h => `<li>${icon('check')}<span>${h}</span></li>`).join('')}</ul>
      <div class="counts">${c.counts}</div>
      <div class="foot">${access}${c.price ? `<span class="row gap-10"><b style="font:800 17px/1 var(--display);letter-spacing:-.02em">${c.price}</b>${cta}</span>` : cta}</div>
    </div>
  </article>`;
}

const groups = [
  { eyebrow: 'Technique & progressions', title: 'Kettlebell Mastery', note: 'Technique, progressions and the details that make every lift click.', items: [
    { photo: 'mike-squat.jpg', pos: '50% 40%', badge: 'Best next step for you', rec: true, name: 'Mastering the Kettlebell', sum: "Mike's complete technique library: every lift broken down, with fixes for the faults that hold people back.", offer: 'Matched to the Phase 2 lifts you start tomorrow', hi: ['400+ technique videos', 'Lifetime access, carries into Level II'], counts: '12 sections · 400+ lessons', access: 'lock', accessLabel: 'Not unlocked', price: '$297', cta: 'Unlock' },
    { photo: 'mike-deadlift.jpg', pos: '50% 30%', badge: 'Free', badgeCls: 'tag light', name: 'What Your Kettlebell Swing Is Missing', sum: 'Seven steps to the perfect swing set-up — the short course Mike sends every new swinger.', hi: ['7-step set-up checklist', 'Self-check video drills'], counts: '1 section · 7 lessons', access: 'inc', accessLabel: 'Free', cta: 'Join program' },
    { photo: 'mike-press.jpg', pos: '50% 22%', badge: 'Free', badgeCls: 'tag light', name: 'Free 6-Video Kettlebell Mini-Series', sum: 'Six instructional videos for every kettlebell enthusiast — swing, clean, press and more.', hi: ['Six coached demonstrations', 'Great refresher on rest days'], counts: '6 lessons', access: 'inc', accessLabel: 'Free', cta: 'Join program' },
  ] },
  { eyebrow: 'Strength & conditioning', title: 'Athletic Performance', note: 'Structured training blocks for strength, power and movement capacity.', items: [
    { photo: 'mike-getup.jpg', pos: '50% 28%', name: 'Athleticism 4 Life', inst: 'Mike Salemi · Suples approved', sum: 'A Suples Training Systems approved program: strength, power and agility you can keep for life.', hi: ['Weekly schedules, 4 sessions', 'Bulgarian bag and kettlebell'], counts: '12 weeks · 48 sessions', access: 'lock', cta: 'View program' },
    { photo: 'mike-goblet.jpg', pos: '50% 30%', name: 'FIRE — First In Wellness', sum: 'Training built for first responders: durable strength, conditioning and recovery between shifts.', hi: ['3–5 sessions a week', 'Shift-friendly recovery'], counts: '12 weeks', access: 'lock', cta: 'View program' },
    { photo: 'mike-coaching.jpg', pos: '50% 40%', name: '1:1 Coaching with Mike', sum: 'Your program, built around you — live sessions, form review and a plan that adapts every week.', offer: 'Members get a free 20-min intro call', hi: ['Weekly or fortnightly', 'Video form review'], counts: 'Live video sessions', access: 'lock', accessLabel: 'Book a call', price: 'From $180', cta: 'Book' },
  ] },
  { eyebrow: 'Recovery & inner work', title: 'Mind-Body, Longevity & Retreats', note: 'Inner work, recovery and in-person journeys with Mike.', items: [
    { photo: 'working-in.jpg', pos: '50% 50%', progress: 22, name: 'Working In', inst: 'Paul Chek & Mike Salemi', sum: 'Gentle, energising movement and breath that restores rather than drains — perfect on recovery days.', hi: ['Pairs with every Recovery Day', 'Standing and floor series'], counts: '9 lessons · 2 of 9 complete', access: 'own', cta: 'Continue' },
    { photo: 'tgk.jpg', pos: '50% 45%', name: 'The Grounded King', sum: 'Strength, presence and nervous-system work — an 8-week guided program for men.', hi: ['4 sessions a week', 'Breath, strength, stillness'], counts: '8 weeks · 32 sessions', access: 'lock', price: '$197', cta: 'Unlock' },
    { photo: 'summit-group.jpg', pos: '50% 45%', badge: 'Applications open', badgeCls: 'tag warm', name: 'Men of Movement Retreats', sum: 'Four days on Mount Shasta: ceremony, breathwork, movement and brotherhood. Capped at 20 men.', hi: ['The Breakthrough · May 13–16, 2027', 'The Primal Reset · Sep 2–5, 2027'], counts: 'In person · Mount Shasta, CA', access: 'lock', accessLabel: 'By application', cta: 'Apply' },
  ] },
];

function body() {
  return `<div class="app">${sidebar('programs')}<div class="main">${topbars()}<div class="page">
  <header style="display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:40px;align-items:end">
    <div>
      <div class="eyebrow accent">Beyond the program</div>
      <h1 class="d-xl mt-12">Choose your next program</h1>
      <p class="lede" style="margin:12px 0 0;max-width:560px">Every course, guided experience and deeper practice in one place. Start with what supports you now — anything you own opens straight into the experience.</p>
      <div class="search mt-24" style="width:100%;max-width:560px;height:50px;font-size:15px">${icon('search')}Search programs, skills or outcomes<kbd>⌘K</kbd></div>
      <div class="row gap-8 mt-12 wrap"><span class="chip ink">All programs</span><span class="chip">Included with your plan · 4</span><span class="chip">Free · 2</span><span class="chip">Courses</span><span class="chip">Retreats</span><span class="chip">Coaching</span></div>
    </div>
    <div class="card" style="padding:20px 22px">
      <div class="row between"><div class="eyebrow warm">Your path with Mike</div><span class="xs faint">1 of 4 complete</span></div>
      <div class="ladder mt-16" style="grid-template-columns:repeat(4,1fr)">
        ${[['Level I', '38%'], ['Level II', 'Day 61'], ['Mastery', 'MTK'], ['Retreat', 'Shasta']].map(([t, d], i) => `<div class="st ${i === 0 ? 'now' : ''}"><span class="dot">${i === 0 ? '<span class="pulse-dot" style="width:9px;height:9px;box-shadow:none"></span>' : `<b style="font:800 11px/1 var(--display);color:var(--text-3)">${i + 1}</b>`}</span><div style="font:700 13px/1.2 var(--display);margin-top:10px">${t}</div><div class="xs faint mt-4">${d}</div></div>`).join('')}
      </div>
      <hr class="hair mt-16">
      <div class="row gap-12 mt-16"><div class="photo" style="width:48px;height:48px;border-radius:12px;flex:none"><img src="${img('mike-standing.jpg')}" alt="" style="object-position:60% 25%"></div><div style="flex:1;min-width:0"><div style="font:650 13.5px/1.3 var(--sans)">Kettlebell Lifestyle · Level I</div><div class="row gap-8 mt-6"><div class="bar thin" style="flex:1"><i style="width:38%"></i></div><b class="xs">38%</b></div></div><a class="btn btn-primary btn-sm" href="day.html">Resume</a></div>
    </div>
  </header>

  <section class="section" style="margin-top:40px">
    <div class="eyebrow accent">Flagship program</div>
    <h2 class="d-md mt-6">Kettlebell Lifestyle</h2>
    <a class="chero mt-16" style="display:block;min-height:400px" href="program.html">
      <div class="photo scrim-l zoom"><img src="${img('mike-windmill.jpg')}" alt="" style="object-position:70% 40%"></div>
      <div class="content" style="max-width:600px;padding:40px 44px">
        <span class="tag light">Mike Salemi · Flagship</span>
        <h3 class="d-xl mt-16" style="color:#fff">Kettlebell Lifestyle</h3>
        <p style="color:rgba(255,255,255,.82);font-size:16px;line-height:1.55;margin:12px 0 0;max-width:470px">The complete kettlebell journey — follow it day by day, or train at your own pace across two levels.</p>
        <div class="row gap-8 mt-20 wrap">${['2 levels', '4 phases', '61 days per level', 'Immersion or Self-Guided'].map(s => `<span class="chip onphoto">${s}</span>`).join('')}</div>
        <div class="row gap-12 mt-24"><span class="btn btn-primary btn-lg">Enter program ${icon('arrow-right')}</span><span class="xs" style="color:rgba(255,255,255,.8)">You're on <b style="color:#fff">Day 24</b> · Level II included, unlocks at Day 61</span></div>
      </div>
      <div class="glass-dark" style="position:absolute;right:24px;bottom:24px;z-index:3;border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center">
        <span class="ring" style="width:50px;height:50px"><svg width="50" height="50"><circle cx="25" cy="25" r="21.5" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="5"/><circle cx="25" cy="25" r="21.5" fill="none" stroke="#5DB4F0" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(135 * .38).toFixed(1)} 136"/></svg><span style="font-size:12px">38%</span></span>
        <div><div style="font:700 14px/1.2 var(--display)">Level I · Phase 2</div><div class="xs" style="opacity:.7;margin-top:3px">23 of 61 days · 12-day streak</div></div>
      </div>
    </a>
  </section>

  ${groups.map(g => `<section class="section">
    <div class="vhead"><div><div class="eyebrow accent">${g.eyebrow}</div><h2 class="d-md mt-6">${g.title}</h2><div class="muted mt-6" style="font-size:14.5px">${g.note}</div></div><span class="small faint">${g.items.length} programs</span></div>
    <div class="grid-3">${g.items.map(vcard).join('')}</div>
  </section>`).join('')}

  <section class="section">
    <div class="card" style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:26px 30px;background:var(--ink-900);color:#fff;overflow:hidden;position:relative">
      <div style="position:relative;z-index:2"><div class="eyebrow" style="color:var(--g-300)">Not sure what's next?</div><div class="d-md mt-8" style="color:#fff">Tell Mike your goals — get a recommendation in 2 minutes.</div><div class="small mt-8" style="color:rgba(255,255,255,.7)">Answer six questions and we'll map the right program, level and pace for you.</div></div>
      <div class="row gap-10" style="position:relative;z-index:2"><span class="btn btn-light btn-lg">Find my program</span></div>
    </div>
    <p class="small faint mt-20" style="max-width:640px">Everything here lives inside your account. Open a program to read the full breakdown, and anything you already have access to opens straight into the experience.</p>
  </section>
  </div></div></div>`;
}

module.exports = { catalog: () => doc({ title: 'Programs', body: body() }) };
