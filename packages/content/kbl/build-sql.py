#!/usr/bin/env python3
"""Turns courses.json + legacy-extract.json into SQL files for the v2 database.
Usage: python3 -I build-sql.py <kbl-dir> <out-dir>
Outputs numbered .sql files (each <= ~120 KB) to apply in order with execute_sql."""
import json, os, re, sys

kbl, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
C = json.load(open(f'{kbl}/courses.json'))['courses']
X = json.load(open(f'{kbl}/legacy-extract.json'))
LIMIT = 110_000

def jq(obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    assert '$j$' not in s
    return '$j$' + s + '$j$'

def lit(s):
    assert '$q$' not in s
    return '$q$' + s + '$q$'

files = []
def emit(name, sql):
    files.append((name, sql))

def chunked(name, rows, make_sql):
    """split rows so each statement stays under LIMIT bytes"""
    chunks, cur, size = [], [], 0
    for r in rows:
        n = len(json.dumps(r, ensure_ascii=False))
        if cur and size + n > LIMIT:
            chunks.append(cur); cur, size = [], 0
        cur.append(r); size += n
    if cur: chunks.append(cur)
    for i, ch in enumerate(chunks):
        emit(f'{name}-{i+1:02d}' if len(chunks) > 1 else name, make_sql(ch))

def split_vid(v):
    if not v: return None
    a, _, h = v.partition('/')
    return a, (h or None)

# ------------------------------------------------------------------ videos
vid = {}  # pid -> dict
def add_video(v, title=None, prio=0, thumb=None, level=None, cat=None):
    sv = split_vid(v)
    if not sv: return
    pid, h = sv
    e = vid.setdefault(pid, {'pid': pid, 'hash': None, 'title': '', 'tp': -1, 'thumb': None, 'level': None, 'cat': None})
    if h and not e['hash']: e['hash'] = h
    if title and prio > e['tp']: e['title'], e['tp'] = title, prio
    if thumb: e['thumb'] = thumb
    if level: e['level'] = level
    if cat: e['cat'] = cat

LIB = X['library']
for lv in LIB['videos']:
    ls = set(lv['levels'])
    lvl = 'all' if {'level-1', 'level-2'} <= ls else 'beginner' if 'level-1' in ls else 'intermediate' if 'level-2' in ls else None
    add_video(lv['vimeoId'], lv['title'], 3, '/media/library/' + os.path.basename(lv['image']), lvl, (lv['categories'] or [None])[0])
for co in C:
    for ph in co['phases']:
        add_video(ph['introVimeoId'], ph['name'] + ' overview', 1)
        for day in ph['days']:
            for l in day['lessons']:
                add_video(l['vimeoId'], l['title'], 1)
                for a in l.get('associatedVideos', []):
                    add_video(a['vimeoId'], a['title'], 2)
video_rows = [{'p': v['pid'], 'h': v['hash'], 't': v['title'], 'th': v['thumb'], 'lv': v['level'], 'c': v['cat'], 'nk': v['hash'] is None}
              for v in sorted(vid.values(), key=lambda v: v['pid'])]

# ------------------------------------------------------------------ tags
tags = []
for ns, key in (('level', 'levels'), ('category', 'categories'), ('topic', 'tags')):
    for t in LIB[key]:
        tags.append({'ns': ns, 'slug': t['id'], 'name': t['label']})
video_tags = []
for lv in LIB['videos']:
    sv = split_vid(lv['vimeoId'])
    for ns, key in (('level', 'levels'), ('category', 'categories'), ('topic', 'tags')):
        for s in lv[key]:
            video_tags.append({'p': sv[0], 'ns': ns, 'slug': s})

# ------------------------------------------------------------------ workout tables
tables = []
for tid, t in X['tables'].items():
    rows = [dict(r) for r in t['rows']]
    for sep in t.get('separators') or []:
        idx = [i for i, r in enumerate(rows) if r['circuit'] == sep['after']]
        if not idx:
            print('WARN separator without circuit', tid, sep, file=sys.stderr); continue
        rows[idx[-1]]['separator'] = sep['label']
    tables.append({'id': tid, 'title': t['title'], 'rows': rows, 'notes': t.get('notes'), 'images': t.get('images') or []})

# ------------------------------------------------------------------ forms (bands via legacy rule semantics)
def matches(rule, score):
    res = []
    for c in rule['logic']['rules']:
        v = float(c['value']); op = c['operator']
        assert c['fieldId'] == 'gquiz_score'
        res.append({'is': score == v, 'isnot': score != v, '>': score > v, '<': score < v, '>=': score >= v, '<=': score <= v}[op])
    return any(res) if rule['logic']['logicType'] == 'any' else all(res)

forms, questions, bands = [], [], []
for fid, f in X['forms'].items():
    forms.append({'id': fid, 'title': f['title'], 'max': f['maxScore'], 'dt': f['defaultTableId']})
    for i, q in enumerate(f['questions']):
        opts = [{'value': o['value'], 'label': o['label'], 'weight': q['weights'][o['value']]} for o in q['options']]
        assert set(q['weights']) == {o['value'] for o in q['options']}
        questions.append({'f': fid, 'k': q['id'], 'pos': i + 1, 'prompt': q['question'], 'note': q.get('note'), 'opts': opts})
    owner = [next((i for i, r in enumerate(f['rules']) if matches(r, s)), None) for s in range(0, f['maxScore'] + 1)]
    pos = 0
    s = 0
    while s <= f['maxScore']:
        r = owner[s]; e = s
        while e + 1 <= f['maxScore'] and owner[e + 1] == r: e += 1
        if r is not None:
            rule = f['rules'][r]; pos += 1
            outcome = 'workout' if rule['tableId'] else ('rest' if re.search(r'off|rest', rule['name'], re.I) else 'recovery')
            band = 'red' if outcome != 'workout' else ('green' if re.search(r'full', rule['name'], re.I) else 'amber')
            bands.append({'f': fid, 'pos': pos, 'name': rule['name'], 'band': band, 'out': outcome, 't': rule['tableId'], 'msg': rule['message'] or '', 'mn': s, 'mx': e})
        s = e + 1

# ------------------------------------------------------------------ KBL curriculum
day_form = {d['dayId']: d['formId'] for d in X['dayForms']}
STARTER = set(X['starterIds'])
paths = []
sections, lessons, steps, step_videos, prog_vids = [], [], [], [], set()
for pi, co in enumerate(C):
    cm = next(m for m in X['courseMeta'] if m['id'] == co['id'])
    paths.append({'key': co['id'], 'name': 'Level I · Beginner' if co['id'] == 'beginner' else 'Level II · Intermediate',
                  'short': co['level'], 'desc': co['description'], 'pos': pi + 1,
                  'meta': {'title': co['title'], 'tagline': co['tagline'], 'image': co['image'], 'outcomes': co['outcomes'], 'format': co['format'],
                           'whats_needed': co['whatsNeeded'], 'contributors': co['contributors'], 'hero_video': co['heroVimeoId']}})
    for si, ph in enumerate(co['phases']):
        iv = split_vid(ph['introVimeoId'])
        sections.append({'key': ph['id'], 'path': co['id'], 'title': ph['name'], 'sub': ph['weeks'], 'desc': ph['blurb'], 'iv': iv[0] if iv else None, 'pos': si + 1,
                         'meta': {'label': ph['label'], 'overview': ph['overview'], 'whats_next': ph.get('whatsNext'), 'plan_label': ph['planLabel']}})
        if iv: prog_vids.add(iv[0])
        for di, day in enumerate(ph['days']):
            lb = day.get('letsBegin')
            starter = None
            for l in day['lessons']:
                if l.get('tableId'):
                    assert l['tableId'] in STARTER, l['tableId']; starter = l['tableId']
            meta = {k: v for k, v in {
                'lets_begin_source_lesson': lb and lb['sourceLessonId'], 'lets_begin_image': lb and lb['image'],
                'legacy_intro': day['intro'], 'source_post_id': day.get('sourcePostId'), 'after_source_post_id': day.get('afterSourcePostId')}.items() if v}
            lessons.append({'key': day['id'], 'section': ph['id'], 'title': day['title'], 'pt': day.get('pageType'),
                            'dn': None if day.get('pageType') else day['number'], 'dt': day['type'],
                            'intro': (lb['html'] if lb and lb.get('html') else day['intro']), 'focus': day['focus'],
                            'form': day_form.get(day['id']), 'starter': starter, 'pos': di + 1, 'meta': meta})
            for li, l in enumerate(day['lessons']):
                att = [{'kind': 'image', 'title': i['alt'], 'url': i['url']} for i in l.get('images', [])] + \
                      [{'kind': 'link', 'title': k['label'], 'url': k['url']} for k in l.get('links', [])]
                sv = split_vid(l['vimeoId'])
                if sv: prog_vids.add(sv[0])
                steps.append({'k': l['id'], 'l': day['id'], 't': l['title'], 'kd': l['kind'], 'sp': l.get('special') or 'none',
                              'v': sv[0] if sv else None, 'dur': l['duration'], 'desc': l['description'], 'body': l.get('notes') or None,
                              'att': att, 'pos': li + 1})
                for ai, a in enumerate(l.get('associatedVideos', [])):
                    av = split_vid(a['vimeoId']); prog_vids.add(av[0])
                    step_videos.append({'s': l['id'], 'v': av[0], 't': a['title'], 'pos': ai + 1})
for lv in LIB['videos']: prog_vids.add(split_vid(lv['vimeoId'])[0])
assert set(day_form) <= {l['key'] for l in lessons}

# ------------------------------------------------------------------ resources
resources = []
for co in C:
    for i, p in enumerate(X['plans'][co['slug']]):
        resources.append({'path': co['id'], 'section': f"{'l1' if co['id']=='beginner' else 'l2'}-{p['id']}", 'title': p['title'], 'url': '/media/plans/' + p['filename'], 'pos': i + 1})

# ------------------------------------------------------------------ badges
def rule_for(b):
    i = b['id']
    m = {'first-day': {'kind': 'days', 'count': 1}, 'day-7': {'kind': 'days', 'count': 7}, 'day-30': {'kind': 'days', 'count': 30},
         'streak-3': {'kind': 'streak', 'days': 3}, 'streak-7': {'kind': 'streak', 'days': 7}, 'streak-30': {'kind': 'streak', 'days': 30},
         'tool-first': {'kind': 'tools', 'count': 1}, 'tool-all': {'kind': 'tools', 'all': True},
         'on-ramp': {'kind': 'phase', 'phase': 'on-ramp'}, 'phase-1': {'kind': 'phase', 'phase': 'phase-1'},
         'phase-2': {'kind': 'phase', 'phase': 'phase-2'}, 'phase-3': {'kind': 'phase', 'phase': 'phase-3'},
         'level-1': {'kind': 'path', 'path': 'beginner'}, 'level-2': {'kind': 'path', 'path': 'intermediate'}}
    return m[i]
badges = [{'id': b['id'], 'name': b['name'], 'desc': b['description'], 'tier': b['tier'], 'icon': b['icon'], 'rule': rule_for(b), 'pos': i + 1} for i, b in enumerate(X['badges'])]

# ------------------------------------------------------------------ tools
sel = X['selector']
selector_cfg = {'thresholds': sel['thresholds'], 'questions': sel['questions'], 'scenarios': sel['scenarios'], 'description': sel['meta']['description']}
st = X['stretchTest']
stretch_cfg = {'beta': True, 'description': st['description'], 'questions': st['questions'], 'bands': st['bands']}
tools = [
    {'id': 'kettlebell-selector', 'name': sel['meta']['title'], 'tagline': sel['meta']['tagline'], 'cfg': selector_cfg, 'pos': 1},
    {'id': 'stretch-test', 'name': st['title'], 'tagline': st['tagline'], 'cfg': stretch_cfg, 'pos': 2},
    {'id': 'readiness-check', 'name': 'Readiness Check', 'tagline': 'Should you push today, or back off?', 'cfg': {'form_id': '2'}, 'pos': 3},
    {'id': 'kettlebell-roadmap', 'name': 'Kettlebell Roadmap', 'tagline': 'The four fundamental lifts, and your next step', 'cfg': {'phases': []}, 'pos': 4},
]

# ------------------------------------------------------------------ program texts
beg, inter = C[0], C[1]
program = {
    'slug': 'kettlebell-lifestyle', 'name': 'Kettlebell Lifestyle',
    'tagline': 'Nine weeks to a kettlebell you can trust, at two levels',
    'summary': 'A 9-week personalised, multi-level kettlebell and wellness program: morning routines, bodyweight warm-ups, follow-along workouts and personalised stretching.',
    'description': f"**Level I — Beginner.** {beg['description']}\n\n**Level II — Intermediate.** {inter['description']}",
    'highlights': ['Two nine-week levels: Beginner and Intermediate', 'Follow-along workouts with a daily readiness check', 'Morning routine, warm-up and personalised stretching every day'],
    'format': '61 days · 4 phases per level',
}

# ================================================================== SQL (dictionary-encoded payloads)
# Every string is stored once in "d"; rows are arrays of indexes into "d" (-1 = null). The SQL expands them again.
class Enc:
    def __init__(self): self.d, self.m = [], {}
    def i(self, s):
        if s is None: return -1
        if not isinstance(s, str): s = json.dumps(s, ensure_ascii=False, separators=(',', ':'))
        if s not in self.m: self.m[s] = len(self.d); self.d.append(s)
        return self.m[s]
    def payload(self, **kw): return jq({'d': self.d, **kw})

def S(n, r='r'): return f"_d.a[({r}->>{n})::int+1]"
def N(n, r='r'): return f"({r}->>{n})::int"
def J(n, r='r'): return f"({S(n, r)})::jsonb"
PRE = lambda payload: f"create temp table _d as select j, array(select jsonb_array_elements_text(j->'d')) as a from (select {payload}::jsonb as j) s;\n"
POST = "\ndrop table _d;\n"

ROWK = ['circuit', 'exercise', 'rest', 'restDir', 'restArrow', 'intensity', 'reps', 'sets', 'tempo', 'circuitIcon', 'restIcon', 'separator']

# ---- 01 reference
e = Enc()
tag_rows = [[e.i(t['ns']), e.i(t['slug']), e.i(t['name'])] for t in tags]
table_rows = []
for t in tables:
    rr = []
    for r in t['rows']:
        row = []
        for k in ROWK:
            v = r.get(k)
            row.append((1 if v else 0) if k == 'restArrow' and v is not None else e.i(v) if k != 'restArrow' else None)
        rr.append(row)
    table_rows.append([e.i(t['id']), e.i(t['title']), e.i(t['notes']), e.i(t['images']), rr])
form_rows = [[e.i(f['id']), e.i(f['title']), f['max'], e.i(f['dt'])] for f in forms]
q_rows = [[e.i(q['f']), e.i(q['k']), q['pos'], e.i(q['prompt']), e.i(q['note']), e.i(q['opts'])] for q in questions]
band_rows = [[e.i(b['f']), b['pos'], e.i(b['name']), e.i(b['band']), e.i(b['out']), e.i(b['t']), e.i(b['msg']), b['mn'], b['mx']] for b in bands]
rowexpr = "jsonb_build_object(" + ", ".join(
    (f"'restArrow', case when rw->>{i} is null then null else rw->>{i} = '1' end" if k == 'restArrow' else f"'{k}', {S(i, 'rw')}") for i, k in enumerate(ROWK)) + ")"
emit('01-reference', PRE(e.payload(tags=tag_rows, tables=table_rows, forms=form_rows, q=q_rows, b=band_rows)) + f"""
insert into public.tags (namespace, slug, name)
select {S(0)}, {S(1)}, {S(2)} from _d cross join jsonb_array_elements(j->'tags') r
on conflict (namespace, slug) do update set name = excluded.name;

insert into public.workout_tables (id, title, rows, notes, images)
select {S(0)}, {S(1)}, (select coalesce(jsonb_agg(jsonb_strip_nulls({rowexpr}) order by o), '[]'::jsonb) from jsonb_array_elements(r->4) with ordinality as x(rw, o)), {S(2)}, {J(3)}
from _d cross join jsonb_array_elements(j->'tables') r
on conflict (id) do update set title=excluded.title, rows=excluded.rows, notes=excluded.notes, images=excluded.images, updated_at=now();

insert into public.forms (id, title, max_score, default_table_id)
select {S(0)}, {S(1)}, {N(2)}, {S(3)} from _d cross join jsonb_array_elements(j->'forms') r
on conflict (id) do update set title=excluded.title, max_score=excluded.max_score, default_table_id=excluded.default_table_id, updated_at=now();

delete from public.form_questions where form_id in (select id from public.forms);
insert into public.form_questions (form_id, key, position, prompt, note, options)
select {S(0)}, {S(1)}, {N(2)}, {S(3)}, {J(4)}, {J(5)} from _d cross join jsonb_array_elements(j->'q') r;

delete from public.form_bands where form_id in (select id from public.forms);
insert into public.form_bands (form_id, position, name, band, outcome, table_id, message, min_score, max_score)
select {S(0)}, {N(1)}, {S(2)}, {S(3)}, {S(4)}::public.band_outcome, {S(5)}, {S(6)}, {N(7)}, {N(8)} from _d cross join jsonb_array_elements(j->'b') r;
""" + POST)

# ---- 02 videos
e = Enc()
vrows = [[e.i(v['p']), e.i(v['h']), e.i(v['t']), e.i(v['th']), e.i(v['lv']), e.i(v['c']), 1 if v['nk'] else 0] for v in video_rows]
emit('02-videos', PRE(e.payload(v=vrows)) + f"""
insert into public.videos (provider, provider_id, privacy_hash, title, thumbnail_url, level, category, needs_key)
select 'vimeo', {S(0)}, {S(1)}, {S(2)}, {S(3)}, {S(4)}, {S(5)}, {N(6)} = 1 from _d cross join jsonb_array_elements(j->'v') r
on conflict (provider, provider_id) do update set
  privacy_hash = coalesce(public.videos.privacy_hash, excluded.privacy_hash),
  title = case when public.videos.title = '' then excluded.title else public.videos.title end,
  thumbnail_url = coalesce(excluded.thumbnail_url, public.videos.thumbnail_url),
  level = coalesce(excluded.level, public.videos.level),
  category = coalesce(excluded.category, public.videos.category);
""" + POST)

# ---- 03 program, paths, sections
e = Enc()
path_rows = [[e.i(a['key']), e.i(a['name']), e.i(a['short']), e.i(a['desc']), a['pos'], e.i(a['meta'])] for a in paths]
sec_rows = [[e.i(x['key']), e.i(x['path']), e.i(x['title']), e.i(x['sub']), e.i(x['desc']), e.i(x['iv']), x['pos'], e.i(x['meta'])] for x in sections]
emit('03-program', PRE(e.payload(paths=path_rows, secs=sec_rows, hl=program['highlights'])) + f"""
with p as (
  insert into public.programs (slug, name, type, status, tagline, summary, description, highlights, format_label, duration_label, level, catalog_group, section_label, lesson_label)
  values ('kettlebell-lifestyle', {lit(program['name'])}, 'day_program', 'published', {lit(program['tagline'])}, {lit(program['summary'])}, {lit(program['description'])},
          array(select jsonb_array_elements_text(j->'hl') from _d), {lit(program['format'])}, '9 weeks per level', 'all', 'training', 'Phase', 'Day')
  on conflict (slug) do update set name=excluded.name, type=excluded.type, status=excluded.status, tagline=excluded.tagline, summary=excluded.summary,
    description=excluded.description, highlights=excluded.highlights, format_label=excluded.format_label, duration_label=excluded.duration_label,
    level=excluded.level, catalog_group=excluded.catalog_group, section_label=excluded.section_label, lesson_label=excluded.lesson_label, updated_at=now()
  returning id)
insert into public.program_modes (program_id, mode, is_default)
select p.id, m.mode::public.learning_mode, m.d from p, (values ('immersion', true), ('self_guided', false), ('library', false)) as m(mode, d)
on conflict (program_id, mode) do update set is_default = excluded.is_default;

delete from public.program_media where program_id = (select id from public.programs where slug = 'kettlebell-lifestyle');
insert into public.program_media (program_id, role, url, alt, position)
select p.id, m.role, m.url, m.alt, m.pos from public.programs p, (values
 ('card', {lit(C[0]['image'])}::text, 'Kettlebell Lifestyle Level I', 0), ('gallery', {lit(C[1]['image'])}::text, 'Kettlebell Lifestyle Level II', 1)) as m(role, url, alt, pos)
where p.slug = 'kettlebell-lifestyle';

insert into public.program_paths (program_id, key, kind, name, short_name, description, position, meta)
select p.id, {S(0)}, 'level', {S(1)}, {S(2)}, {S(3)}, {N(4)}, {J(5)}
from public.programs p cross join _d cross join jsonb_array_elements(j->'paths') r where p.slug = 'kettlebell-lifestyle'
on conflict (key) do update set name=excluded.name, short_name=excluded.short_name, description=excluded.description, position=excluded.position, meta=excluded.meta;

insert into public.sections (program_id, path_id, key, title, subtitle, description, intro_video_id, position, meta)
select pa.program_id, pa.id, {S(0)}, {S(2)}, {S(3)}, {S(4)}, v.id, {N(6)}, {J(7)}
from _d cross join jsonb_array_elements(j->'secs') r
join public.program_paths pa on pa.key = {S(1)}
left join public.videos v on v.provider = 'vimeo' and v.provider_id = {S(5)}
on conflict (key) do update set title=excluded.title, subtitle=excluded.subtitle, description=excluded.description, intro_video_id=excluded.intro_video_id, position=excluded.position, meta=excluded.meta;
""" + POST)

# ---- 04 curriculum: lessons, steps, step videos
e = Enc()
lesson_rows = []
for l in lessons:
    m = {k: v for k, v in l['meta'].items() if k != 'legacy_intro'}
    lesson_rows.append([e.i(l['key']), e.i(l['section']), e.i(l['title']), e.i(l['pt']), l['dn'], e.i(l['dt']), e.i(l['intro']), e.i(l['focus']),
                        e.i(l['form']), e.i(l['starter']), l['pos'], e.i(m or None)])
svl_idx, svl = {}, []
svmap = {}
for x in step_videos: svmap.setdefault(x['s'], []).append([e.i(x['v']), e.i(x['t'])])
tpl_idx, tpl, step_rows = {}, [], []
for st in steps:
    assert st['k'].startswith(st['l'] + '-'), st
    pairs = svmap.get(st['k'])
    sl = None
    if pairs:
        kk = json.dumps(pairs)
        if kk not in svl_idx: svl_idx[kk] = len(svl); svl.append(pairs)
        sl = svl_idx[kk]
    t = [e.i(st['t']), e.i(st['kd']), e.i(st['sp']), e.i(st['v']), e.i(st['dur']), e.i(st['desc']), e.i(st['body']), e.i(st['att'] or None), sl]
    kk = json.dumps(t)
    if kk not in tpl_idx: tpl_idx[kk] = len(tpl); tpl.append(t)
    step_rows.append([e.i(st['l']), e.i(st['k'][len(st['l']) + 1:]), tpl_idx[kk], st['pos']])
T = lambda n: f"_d.a[((t->>{n})::int)+1]"
emit('04-curriculum', PRE(e.payload(l=lesson_rows, s=step_rows, t=tpl, svl=svl)) + f"""
insert into public.lessons (section_id, program_id, path_id, key, title, page_type, day_number, day_type, intro, focus, form_id, starter_table_id, position, meta)
select s.id, s.program_id, s.path_id, {S(0)}, {S(2)}, {S(3)}, {N(4)}, {S(5)}, {S(6)}, {S(7)}, {S(8)}, {S(9)}, {N(10)}, coalesce({J(11)}, '{{}}'::jsonb)
from _d cross join jsonb_array_elements(j->'l') r join public.sections s on s.key = {S(1)}
on conflict (key) do update set title=excluded.title, page_type=excluded.page_type, day_number=excluded.day_number, day_type=excluded.day_type, intro=excluded.intro,
  focus=excluded.focus, form_id=excluded.form_id, starter_table_id=excluded.starter_table_id, position=excluded.position, meta=excluded.meta;

insert into public.steps (lesson_id, program_id, key, title, kind, special, video_id, duration_label, description, body, attachments, position)
select l.id, l.program_id, {S(0)} || '-' || {S(1)}, {T(0)}, {T(1)}, {T(2)}::public.step_special, v.id, {T(4)}, {T(5)}, {T(6)}, coalesce(({T(7)})::jsonb, '[]'::jsonb), {N(3)}
from _d cross join jsonb_array_elements(j->'s') r
cross join lateral (select j->'t'->({N(2)}) as t) q
join public.lessons l on l.key = {S(0)}
left join public.videos v on v.provider = 'vimeo' and v.provider_id = {T(3)}
on conflict (key) do update set title=excluded.title, kind=excluded.kind, special=excluded.special, video_id=excluded.video_id, duration_label=excluded.duration_label,
  description=excluded.description, body=excluded.body, attachments=excluded.attachments, position=excluded.position;

delete from public.step_videos sv using public.steps s where sv.step_id = s.id and s.program_id = (select id from public.programs where slug = 'kettlebell-lifestyle');
insert into public.step_videos (step_id, video_id, title, position)
select s.id, v.id, _d.a[(pr->>1)::int+1], pos
from _d cross join jsonb_array_elements(j->'s') r
cross join lateral (select j->'t'->({N(2)}) as t) q
cross join lateral jsonb_array_elements(j->'svl'->((t->>8)::int)) with ordinality as p(pr, pos)
join public.steps s on s.key = ({S(0)} || '-' || {S(1)})
join public.videos v on v.provider = 'vimeo' and v.provider_id = _d.a[(pr->>0)::int+1]
where (t->>8) is not null;
""" + POST)

# ---- 05 misc
e = Enc()
pv = sorted(prog_vids)
vt_rows = [[e.i(x['p']), e.i(x['ns']), e.i(x['slug'])] for x in video_tags]
res_rows = [[e.i(x['path']), e.i(x['section']), e.i(x['title']), e.i(x['url']), x['pos']] for x in resources]
tool_rows = [[e.i(t['id']), e.i(t['name']), e.i(t['tagline']), e.i(t['cfg']), t['pos']] for t in tools]
badge_rows = [[e.i(b['id']), e.i(b['name']), e.i(b['desc']), e.i(b['tier']), e.i(b['icon']), e.i(b['rule']), b['pos']] for b in badges]
pv_rows = [e.i(x) for x in pv]
emit('05-misc', PRE(e.payload(vt=vt_rows, res=res_rows, tools=tool_rows, badges=badge_rows, pv=pv_rows)) + f"""
insert into public.program_videos (program_id, video_id, in_library)
select p.id, v.id, true from public.programs p cross join _d cross join jsonb_array_elements(j->'pv') ix
join public.videos v on v.provider = 'vimeo' and v.provider_id = _d.a[(ix#>>'{{}}')::int+1]
where p.slug = 'kettlebell-lifestyle' on conflict do nothing;

delete from public.resources where program_id = (select id from public.programs where slug = 'kettlebell-lifestyle');
insert into public.resources (program_id, path_id, section_id, title, kind, url, position)
select s.program_id, s.path_id, s.id, {S(2)}, 'pdf', {S(3)}, {N(4)} from _d cross join jsonb_array_elements(j->'res') r
join public.sections s on s.key = {S(1)};

insert into public.video_tags (video_id, tag_id)
select v.id, t.id from _d cross join jsonb_array_elements(j->'vt') r
join public.videos v on v.provider = 'vimeo' and v.provider_id = {S(0)} join public.tags t on t.namespace = {S(1)} and t.slug = {S(2)} on conflict do nothing;

insert into public.tools (id, name, tagline, status, config, position)
select {S(0)}, {S(1)}, {S(2)}, 'published', {J(3)}, {N(4)} from _d cross join jsonb_array_elements(j->'tools') r
on conflict (id) do update set name=excluded.name, tagline=excluded.tagline, config=excluded.config, position=excluded.position;

insert into public.badges (id, name, description, tier, icon, rule, points, position)
select {S(0)}, {S(1)}, {S(2)}, {S(3)}, {S(4)}, {J(5)}, 0, {N(6)} from _d cross join jsonb_array_elements(j->'badges') r
on conflict (id) do update set name=excluded.name, description=excluded.description, tier=excluded.tier, icon=excluded.icon, rule=excluded.rule, position=excluded.position;
""" + POST)

for name, sql in files:
    with open(f'{out}/{name}.sql', 'w') as f: f.write(sql.strip() + '\n')
    print(name, len(sql))
print('counts: videos', len(video_rows), 'tags', len(tags), 'tables', len(tables), 'forms', len(forms), 'questions', len(questions), 'bands', len(bands),
      'paths', len(paths), 'sections', len(sections), 'lessons', len(lessons), 'steps', len(steps), 'step_videos', len(step_videos),
      'program_videos', len(prog_vids), 'resources', len(resources), 'video_tags', len(video_tags), 'badges', len(badges))
json.dump({'bands': bands, 'forms': forms, 'questions': questions, 'day_form': day_form}, open(f'{kbl}/v2-readiness-rows.json', 'w'))
