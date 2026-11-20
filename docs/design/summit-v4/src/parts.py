# Shared components for Summit v4 mockups
import re, os
HERE = os.path.dirname(__file__)

P = {
 'home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 'spark': '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
 'mtn': '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
 'lib': '<rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/>',
 'cal': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
 'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 'tool': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
 'chat': '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
 'gift': '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
 'moon': '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
 'search': '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
 'flame': '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
 'bell': '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
 'arrow': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
 'play': '<path d="M6 4.8a1.5 1.5 0 0 1 2.26-1.3l11.3 7.2a1.5 1.5 0 0 1 0 2.6l-11.3 7.2A1.5 1.5 0 0 1 6 19.2z" fill="currentColor" stroke="none"/>',
 'up': '<path d="m18 15-6-6-6 6"/>', 'down': '<path d="m6 9 6 6 6-6"/>',
 'left': '<path d="m15 18-6-6 6-6"/>', 'right': '<path d="m9 18 6-6-6-6"/>',
 'check': '<path d="M20 6 9 17l-5-5"/>',
 'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 'lock': '<rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'clip': '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
 'grid': '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
 'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 'timer': '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
 'print': '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
 'layers': '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
}
def ic(name, cls=''):
    return f'<svg class="i {cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{P[name]}</svg>'

KB = '<svg width="16" height="18" viewBox="-14 -4 28 36" aria-hidden="true"><path d="M-6.8 30.6A12.6 11.4 0 0 1-11.2 15.8C-12.4 10-12.2 3.4-10 1C-8.8-.6-7.6-1.6-5.6-1.8H5.6C7.6-1.6 8.8-.6 10 1C12.2 3.4 12.4 10 11.2 15.8A12.6 11.4 0 0 1 6.8 30.6ZM-8.4 12.5C-9 8-8.8 4.8-7.2 3.2C-6.2 2.2-5 1.6-3.8 1.6H3.8C5 1.6 6.2 2.2 7.2 3.2C8.8 4.8 9 8 8.4 12.5A12.6 11.4 0 0 0-8.4 12.5Z" fill="#fff" fill-rule="evenodd"/></svg>'

def doc(body, cls, title='Summit v4', extra_css=''):
    return f'''<!doctype html><html lang="en" class="{cls}"><head><meta charset="utf-8"><title>{title}</title>
<link rel="stylesheet" href="v4.css"><style>{extra_css}</style></head><body>{body}</body></html>'''

def ring(pct, size=56, sw=5, color='var(--ember)', track='var(--sunk)', label=None, fs=12):
    r = (size - sw) / 2; c = 2 * 3.14159 * r; d = c * pct / 100
    lab = label if label is not None else f'{pct}%'
    return f'<span class="ring" style="width:{size}px;height:{size}px"><svg width="{size}" height="{size}"><circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"/><circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-dasharray="{d:.1f} {c:.1f}"/></svg><span style="font-size:{fs}px">{lab}</span></span>'

# ---------------------------------------------------------------- sidebar
def sidebar(white=False, active='Home'):
    nav = [('home','Home',''),('spark','Programs',''),('mtn','Retreats','<span class="tagr">Apply</span>'),('lib','Library',''),('cal','Schedule',''),('user','Account','')]
    items = ''.join(f'<a class="{"on" if n==active else ""}">{ic(i)}{n}{x}</a>' for i,n,x in nav)
    acc = [('mike-standing.jpg','Kettlebell Lifestyle','Level I', active=='KBL'),('mastering-the-kettlebell.jpg','Mastering the Kettlebell','Self-guided',False),('mike-getup.jpg','Athleticism 4 Life','Self-guided',False),('working-in.jpg','Working-In with Paul Chek','Done',False)]
    acc_html = ''.join(f'<a class="{"on" if on else ""}"><span class="tb"><img src="media/{im}" alt=""></span><span class="nm">{t}</span>' + (f'<span class="meta" style="color:var(--ember-600)">{ic("check","xs")}</span>' if m=='Done' else '') + '</a>' for im,t,m,on in acc)
    return f'''<aside class="side {'white' if white else ''}">
  <div class="wm"><span class="mk">{KB}</span><span><b>Mike Salemi</b><small>Kettlebell · Movement</small></span></div>
  <a class="resume">
    <div class="row g10"><span class="th"><img src="media/mike-standing.jpg" alt="" style="object-position:62% 30%"></span>
      <div style="min-width:0"><div class="k">Up next · Day 24</div><div class="t">Recovery Day</div></div>
      <span class="go">{ic('play','xs')}</span></div>
    <div class="pr"><span>Level I</span><span class="bar"><i style="width:38%"></i></span><span style="color:var(--ink-2);font-weight:600">23/61</span></div>
  </a>
  <nav class="nav">{items}</nav>
  <div class="grp"><div class="gl">Your access</div><nav class="nav acc">{acc_html}</nav></div>
  <div class="grp"><div class="gl">Additional {ic('up','xs')}</div><nav class="nav">
    <a>{ic('tool')}Tools</a><a>{ic('chat')}Coaching</a><a>{ic('gift')}Referrals<span class="meta">Give 1 month</span></a></nav></div>
  <div class="member"><span class="avatar s">D</span><div><div class="nm">Daniel Reyes</div><div class="sb">Member since Sep 2026</div></div><span class="tg">{ic('moon','sm')}</span></div>
</aside>'''

def topbar(ann='', greet='Good evening, Daniel'):
    return f'''<div class="announce {ann}"><span class="nw">NEW</span><span>Men of Movement · <b>The Breakthrough</b> — applications open for May 13–16, 2027 on Mount Shasta</span><a>Apply {ic('arrow','xs')}</a></div>
<div class="status"><span class="avatar s">D</span><span class="gr">{greet}</span><span class="dt">· Friday, Nov 20</span>
  <div class="r"><div class="search">{ic('search','sm')}Search lessons and moves<kbd>⌘K</kbd></div>
  <span class="streak"><span class="fl">{ic('flame','xs')}</span>12 days</span>
  <span class="icon-btn">{ic('bell','sm')}</span></div></div>'''

def hero():
    steps = [('Morning Routine','8 min'),('Bodyweight Warm Up','7 min'),('Working In','10 min'),('Stretching','7 min'),('Completion','2 min')]
    return f'''<section class="hero"><img src="media/mike-standing.jpg" alt="Mike Salemi in the gym"><div class="scrim"></div>
  <div class="ct">
    <div class="row g8"><span class="pill onphoto"><span class="dot"></span>Continue training</span><span class="pill onphoto">Day 24 of 61</span></div>
    <h1 class="disp">Recovery Day</h1>
    <div class="meta">Kettlebell Lifestyle · Level I · Phase 2 &nbsp;·&nbsp; 5 steps · 34 min</div>
    <div class="segs"><i class="now"></i><i></i><i></i><i></i><i></i></div>
    <div class="labs">{''.join(f'<span><b>{a}</b>{b}</span>' for a,b in steps)}</div>
    <div class="acts"><a class="btn btn-primary btn-lg">{ic('play','sm')} Start Day 24</a><a class="btn btn-onphoto btn-lg">View the program</a></div>
  </div>
  <div class="note"><img src="media/mike-face.png" alt=""><div><p>“Low-intensity restoration: mobility, breathing and your personalised stretch plan.”</p><small>MIKE · NOTE FOR DAY 24</small></div></div>
</section>'''

def climb_svg(pid='a'):
    s = open(os.path.join(HERE, 'climb_svg.html')).read()
    s = s.replace('hcgc', pid+'cgc').replace('hcgk', pid+'cgk').replace('"hcg"', f'"{pid}cg"').replace('url(#hcg)', f'url(#{pid}cg)')
    labs = '<div class="cl-lab" style="left:9.60%;top:62.71%"><b>On Ramp</b><span>Days 1–7</span></div><div class="cl-lab" style="left:26.20%;top:82.20%"><b>Phase 1</b><span>Days 8–20</span></div><div class="cl-lab" style="left:40.2%;top:62.71%"><b>Phase 2</b><span>Days 21–40</span></div><div class="cl-lab next" style="left:61.20%;top:40.68%"><b>Phase 3</b><span>Days 41–61</span></div><div class="cl-lab" style="left:85.20%;top:11.02%"><b>Summit</b><span>Day 61</span></div><div class="cl-you" style="left:47.12%;top:49.83%"><span class="avatar s">D</span><em>You · Day 24</em></div>'
    return s + labs + '</div>'

def peaks():
    pk = [('mike-getup.jpg','50% 25%','<span class="pill light">'+ic('lock','xs')+' Included</span>','Level II · Intermediate','Unlocks when you reach the Day 61 summit.','Preview Level II'),
          ('mike-deadlift.jpg','50% 30%','<span class="pill light" style="color:var(--glacier-600)">Best next step</span>','Mastering the Kettlebell','12% through · technique for every Phase 2 lift','Continue'),
          ('breakthrough-venue.jpg','50% 50%','<span class="pill light">Applications open</span>','The Breakthrough retreat','Train with Mike in person · May 13–16, 2027','Apply')]
    out=''
    for im,pos,tag,t,s,cta in pk:
        out += f'<div class="pcard mini"><div class="ph" style="aspect-ratio:16/8"><img src="media/{im}" style="object-position:{pos}" alt="">{tag}</div><div class="tx" style="padding:12px 10px 8px"><div class="t" style="font-size:14px">{t}</div><div class="s">{s}</div><div class="link" style="margin-top:10px;font-size:12.5px">{cta} {ic("arrow","xs")}</div></div></div>'
    return out

def climb_card(pid='a'):
    return f'''<section class="card" style="padding:22px 24px 20px;overflow:hidden">
  <div class="ch"><span class="tick"></span><span class="lab">Your climb · Kettlebell Lifestyle Level I</span><span class="rule"></span></div>
  <div class="row between" style="margin-top:12px"><h2 class="h" style="font-size:26px;margin:0">You’re 38% of the way up.</h2>
    <div class="row g12"><div style="text-align:right"><div class="num" style="font-size:24px;line-height:1">23<span class="fainter" style="font-size:15px">/61</span></div><div class="xs faint" style="margin-top:3px">days complete</div></div>{ring(38,48,4)}</div></div>
  <div style="margin:4px -24px 0">{climb_svg(pid)}</div>
  <div class="tray"><div class="row between" style="align-items:flex-end"><div><div class="h" style="font-size:15px">Beyond the summit</div><div class="xs faint" style="margin-top:2px">Where members go after Level I — picked for your pace and goals.</div></div><span class="link">See your full path {ic('arrow','xs')}</span></div>
  <div class="g3c" style="margin-top:12px;gap:12px">{peaks()}</div></div>
</section>'''

def week_card():
    days = ''.join(f'<div class="d done"><i>{ic("check","xs")}</i>{d}</div>' for d in 'MTWT') + '<div class="d today"><i>20</i>F</div><div class="d"><i></i>S</div><div class="d"><i></i>S</div>'
    return f'''<section class="card" style="padding:22px 24px;display:flex;flex-direction:column">
  <div class="ch"><span class="tick ember"></span><span class="lab">This week</span><span class="rule"></span><span class="meta">Nov 16 – 22</span></div>
  <div class="row g12" style="margin-top:18px;align-items:flex-end"><span class="stat" style="font-size:64px">27</span><div style="padding-bottom:4px"><div class="h" style="font-size:16px">days</div><div class="xs faint">Your longest streak yet</div></div>
  <span style="margin-left:auto;width:40px;height:40px;border-radius:12px;background:var(--ember-50);color:var(--ember);display:grid;place-items:center">{ic('flame')}</span></div>
  <div class="week" style="margin-top:20px">{days}</div>
  <div class="well-or" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
    <div class="row g12" style="align-items:flex-start"><span style="width:34px;height:34px;border-radius:10px;background:#FFF7E3;display:grid;place-items:center;flex:none"><svg width="20" height="20" viewBox="0 0 32 32"><path d="M10 2h5l3 8h-5z" fill="#1A85D6"/><path d="M22 2h-5l-3 8h5z" fill="#F2632A"/><circle cx="16" cy="19" r="10" fill="#E8B43C"/><circle cx="16" cy="19" r="7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/></svg></span>
    <div><div style="font-weight:600;font-size:13.5px">3 days to your 30-day badge</div><div class="xs faint" style="margin-top:2px">Keep the streak going 3 more days to earn it.</div></div></div>
    <div class="row between xs faint" style="margin-top:12px"><span>Badge progress</span><b style="color:var(--ink);font-weight:650">27 / 30</b></div><div class="bar thin" style="margin-top:6px"><i style="width:90%"></i></div>
  </div>
  <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--line)">
    <div class="row between"><div class="row g8"><span class="lab">Planned this week</span></div><span class="xs faint"><b class="num" style="font-size:13px;color:var(--ink)">0</b>/4 sessions done</span></div>
    <div class="plan">
      <div class="pl now"><span class="dd">Fri</span><span class="tt">Day 24 · Recovery Day</span><span class="tg">Today</span></div>
      <div class="pl"><span class="dd">Sat</span><span class="tt">Day 25 · Workout III Day</span><span class="mm">26 min</span></div>
      <div class="pl"><span class="dd">Sun</span><span class="tt">Day 26 · Skill Development Day</span><span class="mm">{ic('lock','xs')}</span></div>
    </div>
    <a class="link" style="margin-top:12px">Open plan {ic('arrow','xs')}</a>
  </div>
</section>'''

def programs():
    pc = [('mike-standing.jpg','55% 30%','Immersion','Kettlebell Lifestyle · Level I',40,'Day 24 · Recovery Day','Resume'),
          ('mastering-the-kettlebell.jpg','50% 30%','Course','Mastering the Kettlebell',12,'Variations · Introduction','Resume'),
          ('mike-getup.jpg','50% 25%','Course','Athleticism 4 Life',1,'Getting Started · Philosophy','Resume'),
          ('working-in.jpg','50% 40%','Completed','Working-In with Paul Chek & Mike Salemi',100,'4 of 4 lessons','Review')]
    out=''
    for im,pos,tag,t,p,up,cta in pc:
        upl = f'<div class="up">Up next · <b>{up}</b></div>' if p<100 else f'<div class="up"><b>{up}</b> · completed</div>'
        out += f'''<article class="pcard"><div class="ph"><img src="media/{im}" style="object-position:{pos}" alt=""><span class="pill light">{tag}</span></div>
<div class="tx"><div class="t">{t}</div><div class="prog"><span class="bar thin"><i style="width:{p}%"></i></span><b>{p}%</b></div>{upl}<div class="ft"><span class="link">{cta} {ic('arrow','xs')}</span></div></div></article>'''
    return f'<section class="sec"><div class="sh"><div><h2 class="h">Your programs</h2><div class="sub">Pick up exactly where you left off.</div></div><span class="link">See all {ic("arrow","xs")}</span></div><div class="g4c">{out}</div></section>'

def upcoming():
    ev = [('Nov','21','Next in your plan','Single Arm Overhead Press','Tomorrow · Kettlebell Strength Foundations'),('May','13','Retreat · Applications open','The Breakthrough','May 13–16, 2027 · Mount Shasta, California'),(None,None,'Coaching','Book a session with Mike','Technique review, programming, accountability')]
    out=''
    for m,d,k,t,s in ev:
        dt = f'<span class="dt"><small>{m.upper()}</small><b>{d}</b></span>' if m else f'<span class="dt" style="color:var(--glacier)">{ic("users")}</span>'
        out += f'<div class="card ev">{dt}<div style="min-width:0"><div class="lab" style="font-size:9.5px;color:var(--ember-600)">{k}</div><div style="font-weight:600;font-size:14px;margin-top:3px">{t}</div><div class="xs faint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{s}</div></div></div>'
    return f'<section class="sec"><div class="sh"><div><h2 class="h">Upcoming activity</h2></div><span class="link">Open schedule {ic("arrow","xs")}</span></div><div class="g3c">{out}</div></section>'

def home_desktop(cls, white_side=False, ann=''):
    body = f'''<div class="app">{sidebar(white_side)}<div class="main">{topbar(ann)}<div class="page">
{hero()}
<div style="display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1fr);gap:16px;margin-top:16px">{climb_card()}{week_card()}</div>
{programs()}{upcoming()}
</div></div></div>'''
    return doc(body, cls)


def home_phone(cls, ann='light'):
    steps = ''.join('<i class="now"></i>' if k==0 else '<i></i>' for k in range(5))
    body = f'''<div class="phone">
<div class="ph-head"><span class="mk">{KB}</span><div style="flex:1;min-width:0"><div class="xs faint">Friday, Nov 20</div><div class="h" style="font-size:18px;margin-top:1px">Good evening, Daniel</div></div>
<span class="streak" style="height:36px;padding:0 11px 0 8px"><span class="fl">{ic('flame','xs')}</span>12</span><span class="avatar" style="width:36px;height:36px">D</span></div>
<div class="ph-ann {ann}"><span class="nw">NEW</span><div style="flex:1;min-width:0">Men of Movement · <b>The Breakthrough</b> — applications open for May 13–16, 2027 on Mount Shasta</div><a class="link" style="font-size:12.5px">Apply {ic('arrow','xs')}</a></div>
<section class="ph-hero"><img src="media/mike-standing.jpg" alt=""><div class="scrim"></div>
  <div class="ct">
    <div class="row g6"><span class="pill onphoto"><span class="dot"></span>Continue training</span><span class="pill onphoto">Day 24 of 61</span></div>
    <h1 class="disp">Recovery Day</h1>
    <div class="meta">Kettlebell Lifestyle · Level I · Phase 2 · 5 steps · 34 min</div>
    <div class="segs" style="margin-top:16px">{steps}</div>
    <div class="row between" style="margin-top:12px;font-size:13px;color:rgba(255,255,255,.7)"><span>Up next · <b style="color:#fff;font-weight:600">Morning Routine</b></span><span>8 min</span></div>
    <a class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-top:16px">{ic('play','sm')} Start Day 24</a>
  </div>
</section>
<section class="card" style="margin:14px 16px 0;padding:18px 18px 0;overflow:hidden">
  <div class="ch"><span class="tick"></span><span class="lab">Your climb · Level I</span><span class="rule"></span></div>
  <div class="row between" style="margin-top:10px"><h2 class="h" style="font-size:21px;margin:0">38% of the way up</h2>{ring(38,44,4)}</div>
  <div class="ph-climb" style="margin:2px -18px 0">{climb_svg('p')}</div>
  <div class="phases"><span class="ok">On Ramp {ic('check','xs')}</span><span class="ok">Phase 1 {ic('check','xs')}</span><span class="cur">Phase 2</span><span>Phase 3</span><span>Summit</span></div>
</section>
<nav class="tabbar"><a class="on">{ic('home')}Home</a><a>{ic('spark')}Programs</a><a>{ic('user')}Profile</a><a>{ic('grid')}More</a></nav>
</div>'''
    return doc(body, cls)

def day_desktop(cls):
    seq = [('done','Training Readiness Assessment','Score 25 · Chart 2 Modification',None),('done','Morning Routine','8 min · 1 clip',1),('done','Bodyweight Warm Up','10 min',1),('done','Kettlebell Preparation','6 min · 6 clips',1),
           ('now','Workout III','26 min · in progress',1),('lock','Post Training Stretching','9 min · 7 clips',1),('lock','Completion','1 min',1)]
    rows=''
    for k,(st,t,sub,clk) in enumerate(seq):
        b = ic('check','xs') if st=='done' else (str(k+1) if st=='now' else ic('lock','xs'))
        r = '<span class="r">Done</span>' if st=='done' else ('<span class="r" style="color:var(--glacier-600)">Now</span>' if st=='now' else '')
        rows += f'<div class="st {st}"><span class="b">{b}</span><div style="min-width:0"><div class="t">{t}</div><div class="s">{ic("clock","xs") if clk else ""}{sub}</div></div>{r}</div>'
    dash = '<i class="d"></i>'*4 + '<i class="n"></i>' + '<i></i>'*2
    body = f'''<div class="dtop">
  <div class="row g12"><a class="btn btn-ghost" style="height:36px;padding:0 14px 0 10px;font-size:13px">{ic('x','sm')} Exit</a><span class="sm faint">Kettlebell Lifestyle</span></div>
  <div class="ctr"><div class="lab">Level I · Phase 2 · Day 25</div><b>Workout III Day</b></div>
  <div class="row g16" style="justify-content:flex-end"><div class="dash">{dash}</div><span class="row g8 sm muted">Autoplay <span class="tgl"></span></span>
    <a class="btn btn-soft" style="height:36px;font-size:13px">{ic('clip','sm')} Session plan</a>
    <span class="row g8"><b class="num" style="font-size:14px">4/7</b>{ring(57,30,3,'var(--ember)','var(--sunk)','')}</span></div>
</div>
<div class="dgrid"><main class="dmain">
  <div class="video"><img src="media/mike-coaching.jpg" alt="Mike coaching a kettlebell press">
    <div class="top"><span class="pill onphoto">{ic('layers','xs')} Workout III · 3 blocks</span><span class="pill onphoto">Readiness 25 · Chart 2 Modification</span></div>
    <span class="play">{ic('play')}</span>
    <div class="cap"><b>Phase II, Workout III, Level I &amp; II</b><span style="opacity:.75">26:00</span></div></div>
  <section class="card raised stepcard">
    <div style="min-width:0"><div class="lab" style="color:var(--ember-600)">Step 5 of 7 · 26 min</div>
      <h1 class="disp" style="font-size:44px;margin:10px 0 0;line-height:1">Workout III</h1>
      <p class="muted" style="margin:10px 0 0;font-size:15px">Third session of the block — density and capacity focus.</p></div>
    <div class="row g10"><span class="icon-btn" style="width:44px;height:44px">{ic('left','sm')}</span><a class="btn btn-primary btn-lg">{ic('check','sm')} Mark complete</a><span class="icon-btn" style="width:44px;height:44px;opacity:.5">{ic('right','sm')}</span></div>
  </section>
  <section class="card" style="margin-top:16px;padding:20px 24px">
    <div class="ch"><span class="tick ember"></span><span class="lab">Today’s readiness</span><span class="rule"></span><span class="meta">Retake</span></div>
    <div class="row g16" style="margin-top:14px">{ring(25,52,4,'var(--ember)','var(--sunk)','25',15)}<div><div class="h" style="font-size:17px">Steady — modified table</div><div class="sm faint" style="margin-top:2px">A modified table keeps today productive without digging a hole.</div></div></div>
  </section>
</main>
<aside class="dside">
  <div class="ch"><span class="tick"></span><span class="lab">Today’s sequence</span><span class="rule"></span></div>
  <div class="h" style="font-size:22px;margin-top:12px">4 of 7 steps done</div>
  <div class="sm faint" style="margin-top:4px">Complete each step to unlock the next.</div>
  <div class="bar thin" style="margin-top:14px"><i style="width:57%"></i></div>
  <div class="seq">{rows}</div>
  <div class="after"><div class="row between"><span class="xs faint">After today</span>{ic('lock','xs')}</div><div style="font-weight:600;font-size:14px;margin-top:4px">Day 26 · Skill Development Day</div><div class="xs faint" style="margin-top:2px">Unlocks when you finish today</div></div>
  <div class="promo"><span class="pth"><img src="media/mastering-the-kettlebell.jpg" alt=""></span><div><div style="font-weight:600;font-size:13.5px;line-height:1.3">Struggling with the stance deadlift?</div><div class="xs faint" style="margin-top:4px">Mike breaks it down frame by frame in Mastering the Kettlebell.</div><span class="link" style="margin-top:8px;font-size:12.5px">Watch a preview {ic('arrow','xs')}</span></div></div>
</aside></div>'''
    return doc(body, cls)


WT = [('s','S1','Staggered Stance Deadlift','30s','','Moderate','40s (20sL/20sR)','3','Mod-Fast'),
      None,
      ('c','C2','Alternating Halo - Squat','20s','down','Moderate','30s','2','Moderate'),
      ('c','C2','Offset Push Ups','20s','down','Bodyweight','30s (15sL/15sR)','2','Moderate'),
      ('c','C2','Static Alt. Side Lunge with Counter Rot.','20s','down','Moderate','30s','2','Mod-Fast'),
      ('c','C2','Lunge Stance Row (supported)','20s','up','Moderate','30s (15sL/15sR)','2','Moderate'),
      'fin',
      ('s','S3','Modified Butterflies','30s','','Bodyweight','60s','1','Moderate')]
def workout_table(n=None, cols=7):
    rows=''
    for r in (WT if n is None else WT[:n]):
        if r is None: rows+=f'<tr class="rest"><td colspan="{cols}">1 min rest before next circuit</td></tr>'; continue
        if r=='fin': rows+=f'<tr class="rest"><td colspan="{cols}">1 min rest before finisher</td></tr>'; continue
        k,b,ex,rest,arr,inten,reps,sets,tempo = r
        a = '' if not arr else f'<span style="color:{"var(--ink-3)" if arr=="down" else "var(--glacier)"};margin-right:4px">{"↓" if arr=="down" else "↺"}</span>'
        tail = f'<td class="n">{sets}</td><td class="muted">{tempo}</td>' if cols==7 else ''
        rows+=f'<tr><td><span class="blk {k}">{b}</span></td><td style="font-weight:550">{ex}</td><td class="n">{a}{rest}</td><td class="muted">{inten}</td><td class="n" style="font-weight:500">{reps}</td>{tail}</tr>'
    head = '<th>Type</th><th>Exercise</th><th>Rest</th><th>Intensity</th><th>Reps</th>' + ('<th>Sets</th><th>Tempo</th>' if cols==7 else '')
    return f'<table class="dt"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>'
