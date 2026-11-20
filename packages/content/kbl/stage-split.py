#!/usr/bin/env python3
"""Splits the big JSON payload of each generated SQL file into small staged parts so every execute_sql call stays small.
Usage: python3 -I stage-split.py <in-dir> <out-dir> [part-chars]
For file NN-x.sql writes NN-x.pK.sql (insert into private.import_stage) and NN-x.run.sql (runs the statements against the staged payload)."""
import re, sys, os, glob
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(src + '/*.sql')):
    name = os.path.basename(f)[:-4]
    s = open(f).read()
    m = re.search(r"\$j\$(.*?)\$j\$::jsonb", s, re.S)
    payload = m.group(1)
    run = s[:m.start() - len('(')] if False else s
    ref = f"(select string_agg(txt, '' order by part) from private.import_stage where name = '{name}')::jsonb"
    run = s[:m.start() - 0].rstrip()
    # the literal begins with "$j$" right after 'select '; rebuild the statement
    run = s.replace('$j$' + payload + '$j$::jsonb', ref)
    import hashlib
    chk = f"do $$ begin if (select md5(string_agg(txt, '' order by part)) from private.import_stage where name = '{name}') is distinct from '{hashlib.md5(payload.encode()).hexdigest()}' then raise exception 'staged payload {name} is corrupted'; end if; end $$;\n"
    run = chk + run
    # no delete/drop/truncate (they trigger a confirmation in the MCP); idempotency relies on on-conflict clauses
    run = re.sub(r'^(delete from|drop table) .*\n', '', run, flags=re.M)
    tn = '_d' + name[:2]
    run = re.sub(r'\b_d\b', tn, run)
    run = run.replace('create temp table ' + tn + ' as', 'create temp table if not exists ' + tn + ' as')
    open(f'{out}/{name}.run.sql', 'w').write(run)
    parts = [payload[i:i + N] for i in range(0, len(payload), N)]
    for k, p in enumerate(parts):
        assert '$j$' not in p and not p.endswith('$')
        open(f'{out}/{name}.p{k+1:02d}.sql', 'w').write(f"insert into private.import_stage (name, part, txt) values ('{name}', {k+1}, $j${p}$j$);\n")
    print(name, len(payload), 'parts', len(parts), 'run', len(run))
