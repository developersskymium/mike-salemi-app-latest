import os
import json,re,html
gf=json.load(open(os.environ.get('KBL_HANDOFF','KBL-Migration-Handoff')+'/source-exports/gravityforms-export.json'))
forms=gf if isinstance(gf,list) else gf.get('forms',gf.get('0') and [v for k,v in gf.items() if k.isdigit()] or list(gf.values()))
forms=[f for f in forms if isinstance(f,dict) and 'id' in f]
byid={str(f['id']):f for f in forms}
app=json.load(open('src/content/source-readiness.json'))
def t(s): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s or ''))).strip()
issues=[]
for fid,a in app['forms'].items():
    f=byid.get(fid)
    if not f: issues.append((fid,'missing in export')); continue
    fields={str(x['id']):x for x in f['fields']}
    for q in a['questions']:
        fl=fields.get(q['sourceFieldId'])
        if not fl: issues.append((fid,'field missing',q['sourceFieldId'])); continue
        if t(fl.get('label'))!=t(q['question']): issues.append((fid,'label',q['sourceFieldId'],t(fl.get('label')),q['question']))
        src_w=sorted(float(c.get('gquizWeight') or 0) for c in fl.get('choices',[]))
        app_w=sorted(float(v) for v in q['weights'].values())
        if q['id']=='tired' and app['scoringCorrection']: app_w=sorted(0 if v==15 and q['id']=='tired' else v for v in app_w)
        if src_w!=app_w: issues.append((fid,'weights',q['id'],src_w,app_w))
    # confirmations
    confs=list(f.get('confirmations',{}).values()) if isinstance(f.get('confirmations'),dict) else f.get('confirmations',[])
    src_rules=[]
    for c in confs:
        tb=re.search(r'table id=["\']?(\d+)',c.get('message','') or '')
        logic=c.get('conditionalLogic') or {}
        src_rules.append({'name':c.get('name'),'default':bool(c.get('isDefault')),'table':tb.group(1) if tb else None,'rules':[(r['fieldId'],r['operator'],r['value']) for r in (logic.get('rules') or [])],'msg':t(re.sub(r'\[table[^\]]*\]','',c.get('message','') or ''))})
    app_rules=[{'name':r['name'],'table':r['tableId'],'rules':[(x['fieldId'],x['operator'],x['value']) for x in r['logic']['rules']],'msg':t(r.get('message'))} for r in a['rules']]
    sd=[s for s in src_rules if not s['default']]
    for s in sd:
        m=[x for x in app_rules if x['rules']==s['rules']]
        if not m: issues.append((fid,'confirmation missing in app',s['name'],s['rules'])); continue
        m=m[0]
        if m['table']!=s['table']: issues.append((fid,'table for',s['name'],'src',s['table'],'app',m['table']))
        if s['msg'] and t(m['msg'])!=s['msg'] and s['table'] is None: issues.append((fid,'message',s['name'],s['msg'][:80],m['msg'][:80]))
    dflt=[s for s in src_rules if s['default']]
    if dflt and dflt[0]['table']!=a.get('originalDefaultTableId'): issues.append((fid,'default table','src',dflt[0]['table'],'app original',a.get('originalDefaultTableId'),'app used',a.get('defaultTableId')))
    if len(sd)!=len(app_rules): issues.append((fid,'rule count',len(sd),len(app_rules)))
print('export forms',len(byid),'app forms',len(app['forms']))
print('forms in export not used by app:',sorted(set(byid)-set(app['forms']),key=int), [byid[k]['title'] for k in sorted(set(byid)-set(app['forms']),key=int)])
for i in issues: print(i)
print('ISSUES',len(issues))
