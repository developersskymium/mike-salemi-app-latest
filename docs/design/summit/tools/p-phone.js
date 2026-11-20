const { icon, climb, ring, doc, bellMark } = require('./lib');
const img = (f) => `assets/img/${f}`;

function status(dark = false) {
  return `<div class="ph-status" style="${dark ? 'color:#fff' : ''}"><span>9:41</span><span class="r">${icon('signal')}${icon('wifi')}${icon('battery-full')}</span></div>`;
}

function homePhone() {
  const steps = ['Morning Routine', 'Warm Up', 'Working In', 'Stretching', 'Completion'];
  const body = `<div class="phone" style="padding-bottom:110px">
  ${status()}
  <header class="ph-head">
    <span class="wm">${bellMark()}</span>
    <div style="flex:1;min-width:0"><div class="xs faint" style="font-weight:600">Friday, Nov 20</div><div style="font:750 18px/1.15 var(--display);letter-spacing:-.015em">Good morning, Daniel</div></div>
    <span class="streakchip" style="height:32px">${'<span class="fl">' + icon('flame') + '</span>'}12</span>
    <span class="avatar" style="width:34px;height:34px">D</span>
  </header>
  <div class="ph-announce">${icon('mountain')}<span><b>The Breakthrough</b> · applications open for May 13–16 on Mount Shasta</span>${icon('chevron-right')}</div>

  <div class="ph-pad" style="margin-top:14px">
    <section class="hero" style="min-height:0;border-radius:26px">
      <div class="photo" style="position:relative;height:430px"><img src="${img('mike-standing.jpg')}" alt="Mike Salemi" style="object-position:66% 25%"><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,15,25,0) 25%,rgba(8,15,25,.55) 55%,rgba(8,15,25,.94) 100%)"></div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;padding:20px;z-index:2">
        <div class="row gap-6"><span class="tag warm">Continue</span><span class="chip onphoto sm">Day 24 of 61</span></div>
        <h1 class="d-xl mt-12" style="font-size:40px;color:#fff">Recovery Day</h1>
        <div style="color:rgba(255,255,255,.75);font-size:13.5px;margin-top:6px">Level I · Phase 2 · 5 steps · 34 min</div>
        <div class="stepline" style="margin-top:14px"><div class="segs">${steps.map((s, i) => `<i class="${i === 0 ? 'now' : ''}"></i>`).join('')}</div></div>
        <div class="row between xs" style="color:rgba(255,255,255,.75);margin-top:7px"><span>Up next · <b style="color:#fff">Morning Routine</b></span><span>8 min</span></div>
        <a class="btn btn-primary btn-lg btn-block" style="margin-top:16px" href="day-phone.html">${icon('play')} Start Day 24</a>
      </div>
    </section>

    <section class="card mt-12" style="padding:18px 0 14px;overflow:hidden">
      <div class="row between" style="padding:0 18px"><div><div class="eyebrow accent" style="font-size:10.5px">Your climb · Level I</div><div class="d-sm mt-4">38% of the way up</div></div>${ring(38, 48, 5, '38%')}</div>
      <div style="margin-top:34px">${climb({ id: "ph", H: 250, labels: false })}</div>
      <div class="row between" style="padding:6px 18px 0;font:600 11px/1.2 var(--sans);color:var(--text-3)"><span style="color:var(--text)">On Ramp ✓</span><span style="color:var(--text)">Phase 1 ✓</span><span style="color:var(--warm-ink)">Phase 2</span><span>Phase 3</span><span>Summit</span></div>
    </section>

    <section class="card mt-12" style="padding:16px 18px">
      <div class="row between"><div class="eyebrow warm" style="font-size:10.5px">This week</div><span class="xs faint">2h 41m trained</span></div>
      <div class="week mt-12">${[['M', 'done'], ['T', 'done'], ['W', 'done'], ['T', 'done'], ['F', 'today'], ['S', ''], ['S', '']].map(([l, s]) => `<div class="d ${s}"><i style="width:32px;height:32px">${s === 'done' ? icon('check') : (s === 'today' ? '24' : '')}</i>${l}</div>`).join('')}</div>
      <div class="sunk mt-12 row gap-10" style="padding:10px 12px"><span>${require('./p-home').medal(22)}</span><span class="xs" style="color:var(--text-2)"><b style="color:var(--text)">2 days</b> to your 14-day badge</span><div class="bar warm thin ml-auto" style="width:70px"><i style="width:86%"></i></div></div>
    </section>

    <div class="row between" style="margin-top:28px"><h2 class="d-sm">Beyond the summit</h2><span class="link" style="font-size:12.5px">Your path</span></div>
    <div class="row gap-12 mt-12" style="overflow:hidden;margin-right:-16px">
      ${[['mike-deadlift.jpg', 'Best next step', 'Mastering the Kettlebell', 'Technique for every Phase 2 lift', 'tag'], ['summit-group.jpg', 'May 13–16', 'The Breakthrough', 'With Mike on Mount Shasta', 'chip onphoto sm'], ['mike-getup.jpg', 'Day 61', 'Level II', 'Unlocks at the summit', 'chip onphoto sm']].map(([p, t, n, s, c]) => `<div class="peak" style="flex:none;width:228px;background:var(--surface);box-shadow:var(--sh-2)"><div class="th" style="height:120px"><img src="${img(p)}" alt="" style="object-position:50% 30%"><span class="${c}">${t}</span></div><div class="tx"><b>${n}</b><span class="s">${s}</span></div></div>`).join('')}
    </div>

    <div class="row between" style="margin-top:28px"><h2 class="d-sm">Your programs</h2><span class="link" style="font-size:12.5px">See all</span></div>
    <div class="row gap-12 mt-12" style="overflow:hidden;margin-right:-16px">
      ${[['mike-standing.jpg', 'Kettlebell Lifestyle · Level I', 38, 'Day 24 · Recovery Day'], ['working-in.jpg', 'Working In', 22, 'Lesson 3 · Cross Crawl']].map(([p, t, pc, u]) => `<article class="pcard" style="width:250px"><div class="photo" style="aspect-ratio:16/9"><img src="${img(p)}" alt="" style="object-position:55% 30%"></div><div class="body" style="padding:14px 16px 16px"><div class="t" style="font-size:15.5px">${t}</div><div class="row gap-10 mt-6"><div class="bar thin" style="flex:1"><i style="width:${pc}%"></i></div><b class="xs">${pc}%</b></div><div class="upn">Up next · <b>${u}</b></div></div></article>`).join('')}
    </div>

    <div class="row between" style="margin-top:28px"><h2 class="d-sm">Upcoming</h2><span class="link" style="font-size:12.5px">Schedule</span></div>
    <div class="card flat mt-12" style="overflow:hidden">
      ${[['DEC', '04', 'Live call', 'Monthly Q&amp;A with Mike', 'Thu · 6:00 PM PT'], ['DEC', '11', 'Invitation', 'Community workout drop', 'Fri · live or on demand'], ['MAY', '13', 'Retreat', 'The Breakthrough', 'May 13–16 · Mount Shasta']].map(([m, d, k, t, s], i) => `<div class="act" style="padding:12px 14px;grid-template-columns:52px 1fr auto;${i ? 'border-top:1px solid var(--line)' : ''}"><div class="date" style="width:52px;height:54px"><span>${m}</span><b style="font-size:19px">${d}</b></div><div><div class="eyebrow warm" style="font-size:10px">${k}</div><div style="font:700 14.5px/1.25 var(--display);margin-top:3px">${t}</div><div class="xs faint mt-4">${s}</div></div>${icon('chevron-right', 'faint')}</div>`).join('')}
    </div>
  </div>
  <nav class="tabbar glass">
    <a class="on">${icon('house')}Home</a><a>${icon('sparkles')}Programs</a><a>${icon('user')}Profile</a><a>${icon('layout-grid')}More</a>
  </nav>
  <div class="homebar"></div>
</div>`;
  return doc({ title: 'Home · phone', body });
}

module.exports = { 'home-phone': homePhone };
