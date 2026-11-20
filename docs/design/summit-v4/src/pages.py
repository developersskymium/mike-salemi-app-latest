from parts import *

def doc_head(title, intro, num):
    return f'<div class="row g12" style="margin-bottom:6px"><span class="lab" style="color:var(--glacier-600)">Summit v4 · {num}</span></div><h1 class="ttl disp">{title}</h1><p class="intro">{intro}</p>'

def mini_hero(note_serif=False):
    return f'''<div class="hero" style="height:330px;border-radius:20px"><img src="media/mike-standing.jpg" alt="" style="object-position:72% 28%"><div class="scrim"></div>
  <div class="ct" style="left:30px;top:28px;bottom:26px;width:420px">
    <div class="row g8"><span class="pill onphoto"><span class="dot"></span>Continue training</span><span class="pill onphoto">Day 24 of 61</span></div>
    <h1 class="disp" style="font-size:60px;margin-top:14px">Recovery Day</h1>
    <div class="meta" style="font-size:13.5px;margin-top:10px">Kettlebell Lifestyle · Level I · Phase 2 · 5 steps · 34 min</div>
    <div class="acts"><a class="btn btn-primary">{ic('play','xs')} Start Day 24</a></div>
  </div>
  <div class="note" style="width:236px;right:14px;bottom:14px;padding:12px 14px"><img src="media/mike-face.png" alt="" style="width:28px;height:28px"><div><p style="font-size:12.5px">“Low-intensity restoration: mobility, breathing and your personalised stretch plan.”</p><small>MIKE · NOTE FOR DAY 24</small></div></div>
</div>'''

PAIRS = [
 ('t-mona','Mona Sans', 'Mona Sans (one superfamily)', 'Display: wdth 88 · wght 700 · −3% tracking. Text: wdth 100 · wght 420/600.', 'GitHub · SIL OFL 1.1 · npm @fontsource-variable/mona-sans', 'Athletic and engineered — the semi-condensed cut reads like a coach’s whiteboard, not an app template. One file covers display, UI and tabular data.', 'Recommended · A'),
 ('t-inst','Instrument Sans + Instrument Serif', 'Instrument Sans · Instrument Serif italic (Mike’s voice only)', 'Display: wght 600 · −4% tracking. Text: 420/600. Serif italic for coach notes & quotes.', 'Instrument · SIL OFL 1.1 · npm @fontsource-variable/instrument-sans, @fontsource/instrument-serif', 'Editorial and calm — fits retreats and Working In. The serif is rationed to Mike’s words so it stays signature, not a trend.', 'Alternative · B'),
 ('t-fam','Familjen Grotesk + Hanken Grotesk', 'Familjen Grotesk display · Hanken Grotesk text', 'Display: wght 620 · −3.5% tracking. Text: Hanken 420/620.', 'Familjen Grotesk & Hanken Grotesk · SIL OFL 1.1 · npm @fontsource-variable/*', 'Crafted ink-trap details give warmth and character; slightly less sporty and the pairing needs two files.', 'Option 3'),
]

def type_options():
    rows = ''
    for cls, name, roles, spec, lic, why, badge in PAIRS:
        rows += f'''<section class="{cls}" style="display:grid;grid-template-columns:250px 470px 290px minmax(0,1fr);gap:22px;padding:28px 0;border-top:1px solid var(--line)">
  <div><span class="pill {'glacier' if 'A' in badge else 'line'}" style="margin-bottom:14px">{badge}</span>
    <div class="disp" style="font-size:40px;line-height:1">{name.split(' + ')[0]}</div>
    <div class="disp" style="font-size:96px;line-height:.9;margin-top:10px;color:var(--ink)">Aa<span class="serif" style="font-style:italic;font-size:96px;letter-spacing:-.02em;display:{'inline' if cls=='t-inst' else 'none'}">a</span></div>
    <div class="sm" style="margin-top:12px;font-weight:600">{roles}</div>
    <div class="anno" style="margin-top:6px">{spec}</div>
    <div class="anno" style="margin-top:6px"><b>Licence</b> · {lic}</div>
    <div class="sm muted" style="margin-top:10px;line-height:1.5">{why}</div></div>
  <div>{mini_hero()}</div>
  <div class="col g12">
    <div class="card" style="padding:18px 20px"><div class="ch"><span class="tick"></span><span class="lab">Your climb · Level I</span><span class="rule"></span></div>
      <div class="row between" style="margin-top:10px"><div class="h" style="font-size:22px">You’re 38% of the way up.</div></div>
      <div class="row g16" style="margin-top:14px;align-items:flex-end"><span class="stat" style="font-size:48px">23<span class="fainter" style="font-size:22px;letter-spacing:-.01em">/61</span></span><span class="xs faint" style="padding-bottom:6px">days complete · 2h 41m this week</span></div>
      <div class="bar thin" style="margin-top:14px"><i style="width:38%"></i></div></div>
    <article class="pcard"><div class="ph" style="aspect-ratio:16/8"><img src="media/mastering-the-kettlebell.jpg" style="object-position:50% 30%" alt=""><span class="pill light">Course</span></div><div class="tx"><div class="t">Mastering the Kettlebell</div><div class="s">400+ videos · Technique course · 12% through</div></div></article>
  </div>
  <div class="card" style="padding:18px 8px 6px"><div class="ch" style="padding:0 12px 12px"><span class="tick"></span><span class="lab">Session plan</span><span class="rule"></span><span class="meta">Workout III · 3 blocks</span></div>{workout_table(6, 5)}</div>
</section>'''
    body = f'<div class="doc" style="max-width:none;padding:48px 48px 56px">{doc_head("Typography — three premium pairings", "All three are SIL Open Font License 1.1: free for commercial use, self-hosting and bundling in the iOS/Android apps. Each is shown on the same hero, card and table. Fontshare (Satoshi, General Sans, Switzer, Cabinet Grotesk) could not be downloaded here (blocked) and its ITF licence forbids redistributing the files, so it is left out. Geist was tested and dropped: it is the v0/Vercel default and reads as \"AI-built\".", "01")}{rows}</div>'
    return doc(body, 't-mona g-porcelain c-line')

def ground_panel(gcls, name, hexes, verdict, badge):
    return f'''<div class="{gcls}" style="background:var(--ground);border-radius:24px;padding:28px;box-shadow:inset 0 0 0 1px rgba(16,32,56,.07)">
  <div class="row between"><div><div class="lab">{badge}</div><div class="h" style="font-size:24px;margin-top:6px">{name}</div></div></div>
  <div class="row g8" style="margin-top:16px">{''.join(f'<div style="flex:1"><div class="sw" style="height:52px;background:{h}"></div><div class="spec" style="margin-top:6px">{l}<br>{h}</div></div>' for l,h in hexes)}</div>
  <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-top:22px">
    <div class="card" style="padding:18px 20px"><div class="ch"><span class="tick ember"></span><span class="lab">This week</span><span class="rule"></span></div>
      <div class="row g12" style="margin-top:14px;align-items:flex-end"><span class="stat" style="font-size:52px">27</span><div style="padding-bottom:3px"><div class="h" style="font-size:15px">days</div><div class="xs faint">Your longest streak yet</div></div></div>
      <div class="week" style="margin-top:16px">{''.join(f'<div class="d done"><i>{ic("check","xs")}</i>{d}</div>' for d in 'MTWT')}<div class="d today"><i>20</i>F</div><div class="d"><i></i>S</div><div class="d"><i></i>S</div></div>
      <div class="kv" style="margin-top:16px"><span>Badge progress</span><b>27 / 30</b></div></div>
    <article class="pcard"><div class="ph"><img src="media/mike-standing.jpg" style="object-position:55% 30%" alt=""><span class="pill light">Immersion</span></div><div class="tx"><div class="t">Kettlebell Lifestyle · Level I</div><div class="prog"><span class="bar thin"><i style="width:40%"></i></span><b>40%</b></div><div class="up" style="margin-bottom:4px">Up next · <b>Day 24 · Recovery Day</b></div></div></article>
  </div>
  <div class="row g10" style="margin-top:16px"><a class="btn btn-primary">{ic('play','xs')} Start Day 24</a><a class="btn btn-ghost">View the program</a><span class="pill ember" style="margin-left:auto"><span class="dot"></span>12 days</span></div>
  <p class="sm muted" style="margin:18px 0 0;line-height:1.5">{verdict}</p>
</div>'''

def ground_options():
    cream = ground_panel('g-cream','Current · Chalk cream',[('ground','#F5F2EC'),('sunk','#EFEAE1'),('line','#E6E0D6'),('surface','#FFFFFF')],'Before. Yellow-red cast (R>G>B) makes white cards look grey-green and pulls the whole UI warm and heavy next to orange.','Reference')
    a = ground_panel('g-porcelain','Porcelain',[('ground','#F6F7F9'),('sunk','#F0F2F5'),('line','rgba(16,32,56,.08)'),('surface','#FFFFFF')],'Crisp near-white with a whisper of cool grey (B is +3 over R). Cards separate by hairline rather than tone, so the page reads light and airy; photos and ember pop without competing.','Option 1 · used in A')
    b = ground_panel('g-frost','Frost',[('ground','#EEF1F4'),('sunk','#E9EDF1'),('line','rgba(16,32,56,.075)'),('surface','#FFFFFF')],'One step deeper and slightly bluer, a quiet echo of glacier. White cards lift by tone alone, which suits the softer borderless card set in B. Still neutral, never cream.','Option 2 · used in B')
    body = f'<div class="doc" style="max-width:none">{doc_head("Ground — cooler, lighter, neutral", "The cream ground is replaced by a near-white with a faint cool cast. Same cards, photo and controls on each so only the ground changes.", "02")}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:28px">{cream}{a}{b}</div></div>'
    return doc(body, 't-mona g-porcelain c-line')

def card_col(title, rule, sample, states, specs):
    return f'''<div class="col g12"><div><div class="h" style="font-size:18px">{title}</div><div class="sm faint" style="margin-top:3px">{rule}</div></div>
<div style="height:350px;display:flex;flex-direction:column;justify-content:flex-start">{sample}</div>
<div class="row g8">{states}</div><div class="spec" style="line-height:1.6">{specs}</div></div>'''

def state_chip(label, cls=''):
    return f'<div class="card {cls}" style="flex:1;height:56px;border-radius:14px;display:grid;place-items:center;font-size:11px;color:var(--ink-3)">{label}</div>'

def card_set(variant):
    soft = variant == 'B'
    resting = f'''<div class="card" style="padding:20px 22px"><div class="ch"><span class="tick"></span><span class="lab">Your climb · Level I</span><span class="rule"></span><span class="meta">23/61</span></div>
<div class="h" style="font-size:21px;margin-top:12px">You’re 38% of the way up.</div><div class="sm faint" style="margin-top:4px">Phase 2 of 4 · Phase 3 starts on Day 41.</div>
<div class="bar thin" style="margin-top:16px"><i style="width:38%"></i></div>
<div class="tray" style="margin:18px -22px -20px;padding:12px 22px"><span class="link">See your full path {ic('arrow','xs')}</span></div></div>'''
    raised = f'''<div class="card raised" style="padding:22px"><div class="lab" style="color:var(--ember-600)">Step 5 of 7 · 26 min</div>
<div class="disp" style="font-size:38px;margin-top:10px;line-height:1">Workout III</div><div class="sm muted" style="margin-top:8px">Third session of the block — density and capacity focus.</div>
<div class="row g8" style="margin-top:18px"><span class="icon-btn">{ic('left','sm')}</span><a class="btn btn-primary">{ic('check','xs')} Mark complete</a></div></div>'''
    photo = f'''<article class="pcard" style="max-width:300px"><div class="ph"><img src="media/mike-deadlift.jpg" style="object-position:50% 30%" alt=""><span class="pill light">Course</span></div><div class="tx"><div class="t">Mastering the Kettlebell</div><div class="prog"><span class="bar thin"><i style="width:12%"></i></span><b>12%</b></div><div class="up">Up next · <b>Variations · Introduction</b></div><div class="ft"><span class="link">Resume {ic('arrow','xs')}</span></div></div></article>'''
    data = f'''<div class="card" style="padding:20px 22px"><div class="ch"><span class="tick ember"></span><span class="lab">This week</span><span class="rule"></span><span class="meta">Nov 16 – 22</span></div>
<div class="row g12" style="margin-top:14px;align-items:flex-end"><span class="stat" style="font-size:56px">27</span><div style="padding-bottom:4px"><div class="h" style="font-size:15px">days</div><div class="xs faint">Longest streak yet</div></div></div>
<div class="plan" style="margin-top:14px"><div class="pl now"><span class="dd">Fri</span><span class="tt">Day 24 · Recovery Day</span><span class="tg">Today</span></div><div class="pl"><span class="dd">Sat</span><span class="tt">Day 25 · Workout III</span><span class="mm">26 min</span></div><div class="pl"><span class="dd">Sun</span><span class="tt">Day 26 · Skill Dev.</span><span class="mm">{ic('lock','xs')}</span></div></div></div>'''
    st = state_chip('Rest') + state_chip('Hover','is-hover') + state_chip('Press','is-press')
    if not soft:
        sp = dict(r='radius 20 · padding 24/22 · ring 1px ink 8% · no shadow<br>head: 6px tick + 10.5px label (+7% tracking) + hairline rule + meta<br>footer tray: #F7F9FB→#FBFCFD, hairline top',
                  ra='radius 20 · ring 6% + 4 stacked shadows (1/8/28px)<br>only for things that float or are the one primary action on screen',
                  p='mounted: 6px passe-partout, image radius 14 (20−6)<br>inner image ring 8% · tag = white pill, no colour<br>progress 3px ember · footer hairline + glacier action',
                  d='display numerals (tabular, −3.5%), hairline rows,<br>no fills; ember = achieved, glacier pill = do this')
    else:
        sp = dict(r='radius 24 · no ring · shadow 1px/4px 12px at 4–6%<br>separation by tone on Frost ground · head: dot + label, no rule<br>wells: sunk #E9EDF1, radius 16',
                  ra='radius 24 · ring 6% + 4 stacked shadows<br>same raised recipe as A (one elevation level only)',
                  p='full-bleed photo, caption plate: white 94% + 18px blur,<br>radius 16, 8px inset · photo scrim 35% at foot',
                  d='same numerals; list sits in a sunk well instead of rules<br>softer achievement: ember-50 fill + ember check')
    cols = card_col('Resting','Default for every module. Border-defined, flat.', resting, st, sp['r']) + \
           card_col('Raised','Floats above the page. One per view.', raised, state_chip('Rest','raised') + state_chip('Hover','is-hover') + state_chip('Press','is-press'), sp['ra']) + \
           card_col('Photo','Mike is the hero of every card.', photo, st, sp['p']) + \
           card_col('Data','Numbers carry the card, not boxes.', data, st, sp['d'])
    label = 'A · Hairline &amp; mounted (recommended)' if not soft else 'B · Soft tonal &amp; caption plate'
    gcls = 'g-porcelain c-line' if not soft else 'g-frost c-soft'
    return f'<section class="{gcls}" style="background:var(--ground);border-radius:28px;padding:30px 32px 32px;margin-top:24px;box-shadow:inset 0 0 0 1px rgba(16,32,56,.06)"><div class="row between" style="margin-bottom:20px"><div class="h" style="font-size:22px">{label}</div><span class="spec">spacing rhythm 4 · 8 · 12 · 16 · 24 · 40 · radii 20/14/12/8 (B: 24/18/16/8)</span></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;align-items:start">{cols}</div></section>'

def cards_page():
    body = f'<div class="doc" style="max-width:none">{doc_head("Cards — one system, four roles", "Shadows only where something floats. Everything else is defined by a precise 1px hairline, concentric radii and a consistent head (eyebrow · rule · meta). Photos are mounted, not slapped edge-to-edge with a coloured badge.", "03")}{card_set("A")}{card_set("B")}</div>'
    return doc(body, 't-mona g-porcelain c-line')

def sidebar_page():
    def frame(inner, cls, label, notes):
        return f'<div class="col g12"><div class="lab">{label}</div><div class="{cls}" style="width:244px;height:900px;background:var(--ground);border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(16,32,56,.08)">{inner}</div><div class="sm muted" style="line-height:1.55;max-width:260px">{notes}</div></div>'
    before = '<div class="col g12"><div class="lab">Before</div><div style="width:264px;height:900px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(16,32,56,.08)"><img src="media/before-sidebar.png" style="width:264px;height:900px"></div><div class="sm muted" style="line-height:1.55;max-width:260px">Dark photo resume card dominates, 15px bold nav, thumbnails with two-line labels, heavy uppercase section labels.</div></div>'
    a = frame(sidebar(False).replace('class="side ','class="side sb-fixed '), 't-mona g-porcelain c-line', 'A · on ground (recommended)', 'Sidebar shares the Porcelain ground — no panel, no border. Resume card is a 40px thumb + day + 3px ember progress + glacier play. Nav 13.5/500 at 34px, active item is a white resting card. Quiet sentence-case labels. Your access: 20px thumbs, one line each, check for completed.')
    b = frame(sidebar(True).replace('class="side ','class="side sb-fixed '), 't-inst g-frost c-soft', 'B · white panel', 'White panel with a hairline edge against Frost. Same items and order; active item uses glacier-50 tint. Resume card sits in a recessed ground well.')
    body = f'<div class="doc" style="max-width:none">{doc_head("Sidebar — same structure, half the weight", "Same items in the same order: resume, Home → Account, Your access, Additional, member row.", "04")}<div class="row g24" style="align-items:flex-start;margin-top:28px">{before}{a}{b}</div></div>'
    return doc(body, 't-mona g-porcelain c-line', extra_css='.sb-fixed{height:900px!important;position:relative!important}')

def system_sheet():
    sw = lambda n,h,t='': f'<div><div class="sw" style="background:{h};height:56px"></div><div class="sm" style="font-weight:600;margin-top:8px">{n}</div><div class="spec">{h}{(" · "+t) if t else ""}</div></div>'
    palette = ''.join([sw('Ground · Porcelain','#F6F7F9'),sw('Surface','#FFFFFF'),sw('Sunk','#F0F2F5'),sw('Hairline','#E6E9ED','ink 8%'),sw('Ink','#0E1B2C'),sw('Ink 2','#435063'),sw('Ink 3','#717C8B'),sw('Ink 4','#A1A9B4')])
    brand = ''.join([sw('Glacier 500','#1A85D6','do this'),sw('Glacier 600','#146CB4','links'),sw('Glacier 50','#EEF5FC','tint'),sw('Ember 500','#F2632A','progress'),sw('Ember 700','#A93C12','ember text'),sw('Ember 50','#FFF3EC','tint'),sw('Gold','#E8B43C','badges'),sw('Night','#0F1C2C','hero scrim')])
    scale = [('Display XL','disp','80/0.94 · 700 · wdth 88 · −3%','Recovery Day',80),('Display L','disp','44/1 · 700 · wdth 88','Workout III',44),('Heading 1','h','26/1.12 · 640 · wdth 92 · −2.2%','You’re 38% of the way up.',26),('Heading 2','h','18/1.2 · 640 · wdth 92','Beyond the summit',18),('Body','','14/1.5 · 420','Low-intensity restoration: mobility, breathing and your stretch plan.',14),('Small','','12.5/1.4 · 420 · ink 3','Kettlebell Lifestyle · Level I · Phase 2',12.5),('Label','lab','10.5/1.2 · 600 · caps · +7%','YOUR CLIMB · LEVEL I',10.5),('Numerals','stat','tabular lining · −3.5%','27  23/61  2h 41m',44)]
    type_rows = ''.join(f'<div style="display:grid;grid-template-columns:150px 260px 1fr;align-items:baseline;gap:16px;padding:10px 0;border-top:1px solid var(--line)"><div class="sm" style="font-weight:600">{n}</div><div class="spec">{sp}</div><div class="{c}" style="font-size:{px}px;{"line-height:1" if px>30 else ""}">{t}</div></div>' for n,c,sp,t,px in scale)
    shadows = ''.join(f'<div class="col g8"><div class="card {c}" style="height:96px;border-radius:20px"></div><div class="sm" style="font-weight:600">{n}</div><div class="spec">{d}</div></div>' for n,c,d in [('Resting','','ring 1px ink 8% + 0 1 2 ink 3%'),('Hover','is-hover','ring 14% + 0 12 24 −12 ink 14% · −2px'),('Raised','raised','ring 6% · 1/2 · 8/16 · 28/48 (8–18%)'),('Press','is-press','ring 14% · scale .99 · #FCFCFD')])
    radii = ''.join(f'<div class="col g8" style="align-items:center"><div style="width:72px;height:72px;border-radius:{r}px;background:var(--surface);box-shadow:0 0 0 1px var(--line-2)"></div><div class="spec">{r} · {n}</div></div>' for r,n in [(24,'hero'),(20,'card'),(14,'media / inner'),(12,'control'),(8,'thumb'),(999,'pill')])
    comps = f'''<div class="row g10" style="flex-wrap:wrap"><a class="btn btn-primary btn-lg">{ic('play','sm')} Start Day 24</a><a class="btn btn-ghost btn-lg">View the program</a><a class="btn btn-soft">{ic('clip','sm')} Session plan</a><span class="link">See all {ic('arrow','xs')}</span></div>
<div class="row g8" style="margin-top:16px;flex-wrap:wrap"><span class="pill light" style="box-shadow:0 0 0 1px var(--line)">Immersion</span><span class="pill ember"><span class="dot"></span>12 days</span><span class="pill glacier">Today</span><span class="pill line">{ic('lock','xs')} Included</span><span class="blk s">S1</span><span class="blk c">C2</span><span class="streak"><span class="fl">{ic('flame','xs')}</span>12 days</span></div>
<div class="row g24" style="margin-top:18px;align-items:center"><div style="flex:1"><div class="row between xs faint"><span>Badge progress</span><b style="color:var(--ink)">27 / 30</b></div><div class="bar thin" style="margin-top:6px"><i style="width:90%"></i></div></div>{ring(38,52,4)}<div class="week" style="width:260px">{''.join(f'<div class="d done"><i>{ic("check","xs")}</i>{d}</div>' for d in 'MTW')}<div class="d today"><i>20</i>F</div><div class="d"><i></i>S</div></div></div>
<div style="margin-top:18px;width:240px" class="nav"><a class="on">{ic('home')}Home</a><a>{ic('spark')}Programs</a><a>{ic('mtn')}Retreats<span class="tagr">Apply</span></a></div>'''
    rules = '''<ul class="sm muted" style="margin:0;padding-left:18px;line-height:1.75">
<li><b style="color:var(--ink)">Glacier = do this.</b> Primary buttons, links, active nav, the current step. Never decorative.</li>
<li><b style="color:var(--ink)">Ember = progress &amp; achievement.</b> Progress bars, streaks, completed checks, the climb line. Never a button.</li>
<li><b style="color:var(--ink)">One raised card per view.</b> Everything else rests on a hairline. No shadows on lists or grids.</li>
<li><b style="color:var(--ink)">Every card has a head:</b> 6px tick · label · hairline rule · right meta. Footer actions sit in a tray.</li>
<li><b style="color:var(--ink)">Photos are mounted</b> (6px frame, radius 14). Tags on photos are white pills — colour lives in data, not chrome.</li>
<li><b style="color:var(--ink)">Concentric radii</b>: inner = outer − padding (20 → 14). Spacing on a 4pt grid: 8 · 12 · 16 · 24 · 40.</li>
<li><b style="color:var(--ink)">Numbers in the display face</b>, tabular, tight; units in body size and ink 3.</li></ul>'''
    body = f'''<div class="doc" style="max-width:1440px">{doc_head("Summit v4 — refined system", "Mona Sans on Porcelain, hairline cards with mounted photos, a lighter sidebar. Full-colour Mike, glacier to act, ember to celebrate.", "System")}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px">
  <div class="card" style="padding:24px"><div class="ch"><span class="tick"></span><span class="lab">Neutrals</span><span class="rule"></span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:16px">{palette}</div></div>
  <div class="card" style="padding:24px"><div class="ch"><span class="tick ember"></span><span class="lab">Brand</span><span class="rule"></span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:16px">{brand}</div></div>
</div>
<div class="card" style="padding:24px;margin-top:24px"><div class="ch"><span class="tick"></span><span class="lab">Type · Mona Sans (SIL OFL 1.1)</span><span class="rule"></span><span class="meta">self-hosted woff2 · variable wght 200–900 · wdth 75–125</span></div><div style="margin-top:12px">{type_rows}</div></div>
<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:24px;margin-top:24px">
  <div class="card" style="padding:24px"><div class="ch"><span class="tick"></span><span class="lab">Elevation</span><span class="rule"></span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:18px">{shadows}</div>
    <div class="ch" style="margin-top:28px"><span class="tick"></span><span class="lab">Radii</span><span class="rule"></span></div><div class="row between" style="margin-top:16px">{radii}</div></div>
  <div class="card" style="padding:24px"><div class="ch"><span class="tick"></span><span class="lab">Rules</span><span class="rule"></span></div><div style="margin-top:14px">{rules}</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
  <div class="card" style="padding:24px"><div class="ch"><span class="tick"></span><span class="lab">Controls</span><span class="rule"></span></div><div style="margin-top:16px">{comps}</div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <article class="pcard"><div class="ph"><img src="media/mike-standing.jpg" style="object-position:55% 30%" alt=""><span class="pill light">Immersion</span></div><div class="tx"><div class="t">Kettlebell Lifestyle · Level I</div><div class="prog"><span class="bar thin"><i style="width:40%"></i></span><b>40%</b></div><div class="up">Up next · <b>Day 24 · Recovery Day</b></div><div class="ft"><span class="link">Resume {ic('arrow','xs')}</span></div></div></article>
    <div class="card" style="padding:20px;align-self:start;overflow:hidden"><div class="ch"><span class="tick ember"></span><span class="lab">This week</span><span class="rule"></span></div><div class="row g10" style="margin-top:14px;align-items:flex-end"><span class="stat" style="font-size:56px">27</span><div style="padding-bottom:4px"><div class="h" style="font-size:15px">days</div><div class="xs faint">Longest streak yet</div></div></div><div class="kv" style="margin-top:16px"><span>Badge progress</span><b>27 / 30</b></div><div class="kv"><span>Planned this week</span><b>0 / 4</b></div><div class="tray" style="margin:8px -20px -20px;padding:12px 20px"><span class="link">Open plan {ic('arrow','xs')}</span></div></div>
  </div>
</div></div>'''
    return doc(body, 't-mona g-porcelain c-line')


def forms_page():
    wiz = f'''<div class="card" style="padding:36px 40px 28px">
  <span class="link" style="font-size:13px">{ic('left','xs')} Kettlebell Lifestyle</span>
  <div class="lab" style="margin-top:22px;color:var(--glacier-600)">Self-guided · Plan your weeks</div>
  <h2 class="disp" style="font-size:44px;margin:10px 0 0;line-height:1">Your weeks, laid out.</h2>
  <p class="muted" style="margin:12px 0 0;font-size:15px;max-width:520px">Kettlebell Lifestyle already has a day-by-day plan. Pick a level, your days and a start date — we turn it into a schedule on your Plan.</p>
  <div class="steps" style="margin-top:28px"><div class="on"><i></i>1 · Level</div><div><i></i>2 · Days</div><div><i></i>3 · Start</div><div><i></i>4 · Focus</div><div><i></i>5 · Preview</div></div>
  <div class="h" style="font-size:20px;margin-top:30px">Which level are you training?</div>
  <div class="sm faint" style="margin-top:4px">Each level is a full day-by-day plan: 4 phases, workout, recovery and skill days in Mike’s order.</div>
  <div class="col g10" style="margin-top:16px">
    <div class="choice on"><span class="th"><img src="media/mike-standing.jpg" style="object-position:60% 30%" alt=""></span><div><div class="t">Level I · Beginner</div><div class="s">Nine weeks to a kettlebell you can trust</div></div><span class="rd"></span></div>
    <div class="choice"><span class="th"><img src="media/mike-getup.jpg" style="object-position:50% 25%" alt=""></span><div><div class="t">Level II · Intermediate</div><div class="s">Heavier bells, longer chains, real capacity</div></div><span class="rd"></span></div>
  </div>
  <div class="row between" style="margin-top:18px"><span class="sm muted">You’re on Day 24 of Level I.</span><div class="seg"><span class="on">Continue from Day 24</span><span>Start again at Day 1</span></div></div>
  <div class="row between" style="margin-top:28px;padding-top:18px;border-top:1px solid var(--line)"><span class="sm faint"><b class="muted">38 sessions</b> · 3/week · from Nov 21</span><a class="btn btn-primary">Next {ic('right','xs')}</a></div>
</div>'''
    days = f'''<div class="card" style="padding:24px 28px">
  <div class="ch"><span class="tick"></span><span class="lab">Step 2 · Days</span><span class="rule"></span><span class="meta">3 per week</span></div>
  <div class="h" style="font-size:18px;margin-top:14px">Which days will you train?</div>
  <div class="row g8" style="margin-top:14px">{''.join(f'<span class="dayt {"on" if d in (0,2,4) else ""}">{n}<b>{23+d}</b></span>' for d,n in enumerate(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']))}</div>
  <div class="hint" style="margin-top:12px">Recovery and skill days slot in between automatically.</div>
</div>'''
    signin = f'''<div class="card" style="display:grid;grid-template-columns:1fr 1fr;overflow:hidden;padding:6px">
  <div style="position:relative;border-radius:14px;overflow:hidden;min-height:600px"><img src="media/mike-press.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%" alt="">
    <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(9,18,31,.85),rgba(9,18,31,0) 55%)"></div>
    <div style="position:absolute;left:24px;top:22px" class="row g10"><span class="mk" style="width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px);display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)">{KB}</span><b class="h" style="color:#fff;font-size:15px">Mike Salemi</b></div>
    <div style="position:absolute;left:24px;right:24px;bottom:24px;color:#fff"><div class="disp" style="font-size:34px;line-height:1">Strength you keep<br>for life.</div><div class="sm" style="opacity:.75;margin-top:10px">Kettlebell · Movement · Retreats</div></div></div>
  <div style="padding:44px 40px 32px;display:flex;flex-direction:column">
    <div class="h" style="font-size:28px">Welcome back</div><div class="sm faint" style="margin-top:6px">Sign in to pick up at Day 24.</div>
    <div class="fl" style="margin-top:28px"><label>Email</label><div class="in">daniel.reyes@mail.com</div></div>
    <div class="fl" style="margin-top:16px"><label>Password <a>Forgot?</a></label><div class="in focus">••••••••••<span class="caret" style="margin-left:2px"></span></div></div>
    <a class="btn btn-primary btn-lg" style="justify-content:center;margin-top:22px">Sign in</a>
    <div class="row g12" style="margin:20px 0;color:var(--ink-4);font-size:12px"><span class="hair" style="flex:1"></span>or<span class="hair" style="flex:1"></span></div>
    <a class="btn btn-ghost btn-lg" style="justify-content:center"><svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</a>
    <div class="sm faint" style="margin-top:auto;padding-top:24px;text-align:center">New here? <a class="link">Join Kettlebell Lifestyle</a></div>
  </div></div>'''
    states = f'''<div class="card" style="padding:24px 28px">
  <div class="ch"><span class="tick"></span><span class="lab">Field states</span><span class="rule"></span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 20px;margin-top:16px">
    <div class="fl"><label>Default</label><div class="in"><span class="ph">you@email.com</span></div></div>
    <div class="fl"><label>Focus</label><div class="in focus">dan<span class="caret" style="margin-left:-6px"></span></div></div>
    <div class="fl"><label>Filled</label><div class="in">Daniel Reyes<span style="margin-left:auto;color:var(--ember)">{ic('check','xs')}</span></div></div>
    <div class="fl"><label>Error</label><div class="in err">daniel@</div><span class="hint err">Enter a full email address.</span></div>
  </div>
  <div class="spec" style="margin-top:16px;line-height:1.6">48px · radius 12 · white on ground · ring 1px ink 14% · label 12.5/600 above, never inside<br>focus: 1.5px glacier + 4px glacier halo · error: danger red (never ember) · choices = rows with a photo, not boxes</div>
</div>'''
    body = f'''<div class="doc" style="max-width:none">{doc_head("Forms — minimal, calm, with a touch of Mike", "Fewer boxes, one question per step, a single glacier action. Choices carry a small photo so the wizard feels like Mike’s program, not a settings page.", "05")}
<div style="display:grid;grid-template-columns:1.05fr 1fr;gap:28px;margin-top:28px;align-items:start">
  <div class="col g20">{wiz}{days}</div>
  <div class="col g20">{signin}{states}</div>
</div></div>'''
    return doc(body, 't-mona g-porcelain c-line')
