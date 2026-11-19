import os
import json,glob,re,html
P=os.environ.get('KBL_HANDOFF','KBL-Migration-Handoff')+'/source-exports/tablepress-export/'
app=json.load(open('src/content/source-workout-tables.json'))
def norm(s): return re.sub(r'[^a-z0-9]+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s or '')).lower()).strip()
bad=0
for tid,a in app.items():
    d=json.load(open(glob.glob(P+tid+'-*.json')[0]))
    whole=norm(json.dumps(d,ensure_ascii=False).replace('\\n',' ').replace('\\"','"'))
    n=norm(a.get('notes',''))
    if n and n not in whole:
        # check line by line
        miss=[l for l in (a.get('notes') or '').split('\n') if norm(l) and norm(l) not in whole]
        if miss: bad+=1; print(tid,'note lines not found in source:',miss[:3])
print('tables with notes',sum(1 for a in app.values() if a.get('notes')),'mismatched',bad)
