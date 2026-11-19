import os
import json,glob,re,html,collections
P=os.environ.get('KBL_HANDOFF','KBL-Migration-Handoff')+'/source-exports/tablepress-export/'
app=json.load(open('src/content/source-workout-tables.json'))
def txt(c): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',c))).replace('\xa0',' ').strip()
def icon(c):
    m=re.search(r'/([^/"]+)\.png',c); return m.group(1) if m else None
# learn type-icon -> circuit mapping from all tables
votes=collections.defaultdict(collections.Counter)
src={}
for f in glob.glob(P+'*.json'):
    d=json.load(open(f)); src[str(d['id'])]=d
for tid,a in app.items():
    d=src.get(tid)
    if not d: continue
    srows=[r for r in d['data'][1:] if r[1]!='#colspan#' and txt(r[1])]
    for s,r in zip(srows,a['rows']):
        if icon(s[0]): votes[icon(s[0])][r['circuit']]+=1
        else: votes['TEXT:'+txt(s[0])][r['circuit']]+=1
print('TYPE ICON MAP:',{k:dict(v) for k,v in votes.items()})
issues=[]
for tid in sorted(set(app)|set(src),key=int):
    a=app.get(tid); d=src.get(tid)
    if not a: issues.append((tid,'only in source (not in app)',d['name'])); continue
    if not d: issues.append((tid,'only in app')); continue
    data=d['data']; body=data[1:]
    srows=[r for r in body if not (len(r)>1 and r[1]=='#colspan#') and txt(r[1] if len(r)>1 else '')]
    seps=[txt(r[0]) for r in body if len(r)>1 and r[1]=='#colspan#']
    if len(srows)!=len(a['rows']): issues.append((tid,'row count',len(srows),len(a['rows'])))
    for i,(s,r) in enumerate(zip(srows,a['rows'])):
        exp={'exercise':txt(s[1]),'rest':txt(s[2]),'intensity':txt(s[3]),'reps':txt(s[4]),'sets':txt(s[5]),'tempo':txt(s[6]) if len(s)>6 else ''}
        for k,v in exp.items():
            if v!=(r.get(k) or '').strip(): issues.append((tid,f'row{i+1} {k}',v,r.get(k)))
        ri=icon(s[2]); exp_dir={'992EEC4A-7496-4689-A28B-CA5B9CF0F310':('down',True),'Arrow-mirrored':('up',True),None:(None,False)}.get(ri,('?',True))
        if exp_dir[1]!=r['restArrow'] or (exp_dir[0] and exp_dir[0]!=r['restDir']): issues.append((tid,f'row{i+1} rest arrow',ri,r['restDir'],r['restArrow']))
        ti=icon(s[0]) or 'TEXT:'+txt(s[0]); best=votes[ti].most_common(1)[0][0]
        if r['circuit']!=best: issues.append((tid,f'row{i+1} circuit',ti,r['circuit'],'expected',best))
    asep=[x['label'] for x in a.get('separators',[])]
    if seps!=asep: issues.append((tid,'separators',seps,asep))
    simgs=set(re.findall(r'/([^/"]+\.(?:png|jpe?g))',json.dumps(d)))-{'992EEC4A-7496-4689-A28B-CA5B9CF0F310.png','Arrow-mirrored.png','564C4D2C-836F-42CA-A871-43639C3F0998.png','D1752BFB-BF96-4CE7-BB46-6C2B027A2A33.png','1977DD0F-5BD5-45EE-97F2-C3077736FB54.png','Image20200316091907.png','DD469C09-A909-4923-B45E-E80A731CCAA1.png','S1-Symbol.png','S2-Symbol.png','S3-Symbol.png','S4-Symbol.png','S5-Symbol.png'}
    if len(simgs)!=len(a.get('images') or []): issues.append((tid,'illustrations',sorted(simgs),[x['url'] for x in a.get('images') or []]))
    # notes: source description/options text vs app notes
print('tables in source',len(src),'in app',len(app))
for i in issues: print(i)
print('ISSUES',len(issues))
