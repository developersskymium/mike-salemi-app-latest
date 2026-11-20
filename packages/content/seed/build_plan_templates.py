"""Generates packages/content/seed/plan_templates.sql: one published plan template per goal.

Lessons are chosen from the imported v2 curriculum (MTK, A4L, KBL, Working In, The Path to Inspired
Action, Men of Movement: Preparation) and resolved to lesson ids at apply time by
(program slug, section position, lesson title prefix) — or by lesson key for KBL. Each week alternates
hard sessions with recovery sessions so no two hard sessions sit back to back.
Run: python3 -I build_plan_templates.py   (apply plan_templates.sql with execute_sql after the content import)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

MTK, A4L, KBL, WI, PATH, MOM = ("mastering-the-kettlebell", "athleticism-4-life", "kbl", "working-in",
                                "the-path-to-inspired-action", "men-of-movement")


def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def T(prog, sec, title, note=None):
    return {"prog": prog, "sec": sec, "title": title, "note": note}


def weave(weeks, pattern, hard, easy):
    """pattern like 'HRH' per week; H draws from hard, R from easy (cycled)."""
    out, hi, ei = [], 0, 0
    for w in range(1, weeks + 1):
        for s, ch in enumerate(pattern, 1):
            if ch == "H":
                ref = hard[hi % len(hard)]; hi += 1; kind = "training"
            else:
                ref = easy[ei % len(easy)]; ei += 1; kind = "recovery"
            out.append({**ref, "week": w, "session": s, "kind": kind})
    return out


EASY_A4L = [T(A4L, 24, "Recovery #1"), T(A4L, 22, "Hips"), T(A4L, 24, "Recovery #2"), T(A4L, 22, "Shoulders"),
            T(A4L, 23, "Breathe Light"), T(A4L, 22, "Spine")]

TEMPLATES = [
    {
        "slug": "strength-foundations-6w", "goal": "strength", "name": "Kettlebell Strength Foundations",
        "description": "Six weeks of the big strength patterns from Mastering the Kettlebell — deadlift, squat, press, row, lunge and get up — with a mobility or breathing session between every two lifting days.",
        "weeks": 6, "pattern": "HRH",
        "hard": [T(MTK, 5, "Two Hand Deadlift"), T(MTK, 38, "Racked Front Squat"), T(MTK, 28, "Single Arm Overhead Press"),
                 T(MTK, 46, "Staggered Stance Bent Over Row"), T(MTK, 40, "Goblet Squat"), T(MTK, 7, "Romanian Deadlift"),
                 T(MTK, 42, "Reverse Lunge"), T(MTK, 33, "Turkish Get Up"), T(MTK, 28, "Practice", "Press practice: build volume at a weight you own"),
                 T(MTK, 40, "Bulgarian Split Squat Multi-Grip"), T(MTK, 8, "Single-Arm Single-Leg Deadlift"), T(A4L, 21, "Push Press")],
        "easy": EASY_A4L,
    },
    {
        "slug": "swing-clean-snatch-6w", "goal": "technique", "name": "Swing, Clean & Snatch Technique",
        "description": "Six weeks through the ballistic pre-checks and lifts: perform, correct the common faults, then practise. Flexibility work from each pre-check fills the days between.",
        "weeks": 6, "pattern": "HRH",
        "hard": [T(MTK, 10, "Step 2 - Perform Yourself"), T(MTK, 11, "Two Hand Russian Swing"), T(MTK, 11, "Practice"),
                 T(MTK, 13, "Pulling with the Arms"), T(MTK, 16, "Step 2 - Perform Yourself"), T(MTK, 17, "Single Arm Russian Clean"),
                 T(MTK, 17, "Practice"), T(MTK, 19, "Forearm Impact"), T(MTK, 22, "Step 2 - Perform Yourself"),
                 T(MTK, 23, "Single Arm Russian Snatch"), T(MTK, 23, "Practice"), T(MTK, 25, "Lockout Position Errors")],
        "easy": [T(MTK, 10, "Step 7 - Flexibility"), T(A4L, 22, "Shoulders"), T(MTK, 16, "Step 7 - Flexibility"),
                 T(A4L, 24, "Recovery #1"), T(MTK, 22, "Step 7 - Flexibility"), T(A4L, 22, "Hips")],
    },
    {
        "slug": "mobility-joint-care-4w", "goal": "mobility", "name": "Mobility & Joint Care",
        "description": "Four weeks of joint-by-joint mobility from Athleticism 4 Life and the flexibility checks from Mastering the Kettlebell, with a full stretching or ELDOA session each week.",
        "weeks": 4, "pattern": "HRH",
        "hard": [T(A4L, 22, "Human First"), T(A4L, 22, "Shoulders"), T(A4L, 22, "Spine"), T(A4L, 22, "Hips"),
                 T(MTK, 4, "Step 7 - Flexibility"), T(MTK, 27, "Step 7 - Flexibility"), T(MTK, 37, "Step 7 - Flexibility"),
                 T(A4L, 22, "Programming")],
        "easy": [T(A4L, 24, "Recovery #1"), T(A4L, 24, "Complete Stretching Session"), T(A4L, 24, "Recovery #2"), T(A4L, 24, "TV ELDOA")],
    },
    {
        "slug": "conditioning-engine-6w", "goal": "conditioning", "name": "Conditioning Engine",
        "description": "Six weeks, four sessions a week: Athleticism 4 Life workouts and Kettlebell Lifestyle workout days, each followed by a breathing, Working In or stretching session.",
        "weeks": 6, "pattern": "HRHR",
        "hard": [T(A4L, 9, "Workout 1"), T(KBL, None, "l1-phase-1-d8"), T(A4L, 10, "Workout 2"), T(KBL, None, "l1-phase-1-d10"),
                 T(A4L, 11, "Workout 3"), T(KBL, None, "l1-phase-1-d12"), T(A4L, 12, "Workout 4"), T(KBL, None, "l1-phase-1-d15"),
                 T(A4L, 13, "Workout 5"), T(KBL, None, "l1-phase-1-d17"), T(A4L, 14, "Workout 6"), T(A4L, 15, "Completion Workout 7")],
        "easy": [T(A4L, 23, "Essential Concepts"), T(A4L, 24, "Recovery #1"), T(A4L, 25, "Crocodile Breathing"), T(A4L, 23, "Nasal Unblocking"),
                 T(A4L, 24, "Recovery #2"), T(A4L, 25, "Wood/Energy Chops"), T(A4L, 23, "Breathe Light"), T(A4L, 24, "Complete Stretching Session"),
                 T(A4L, 25, "Complete Working In Session"), T(A4L, 23, "Complete Breathing Session"), T(A4L, 24, "TV ELDOA"), T(KBL, None, "l1-phase-1-d9")],
    },
    {
        "slug": "mindset-presence-8w", "goal": "mindset", "name": "Mindset & Presence",
        "description": "Eight weeks of The Path to Inspired Action — each week's call and playwork — with a breath or Working In practice between them.",
        "weeks": 8, "pattern": "HRH",
        "hard": [x for w in range(1, 9) for x in (T(PATH, w, f"Week {w} Call"), T(PATH, w, f"Week {w} Playwork"))],
        "easy": [T(PATH, 1, "Eagle Breath"), T(MOM, 2, "Hear In Meditation"), T(WI, 2, "Understanding Working In"), T(PATH, 6, "Chi Generator"),
                 T(MOM, 2, "Piston Breathing"), T(WI, 4, "Energy Push"), T(MOM, 2, "Breathe Light 1"), T(PATH, 8, "Integrity Inventory")],
    },
    {
        "slug": "retreat-preparation-4w", "goal": "retreat_prep", "name": "Retreat Preparation",
        "description": "Four weeks to arrive ready for Men of Movement: the preparation practices, breath capacity (BOLT), Working In and simple movement prep, with a meditation or breath day between sessions.",
        "weeks": 4, "pattern": "HRH",
        "hard": [T(MOM, 2, "Wall Squat"), T(A4L, 23, "BOLT Test"), T(MOM, 2, "Abdominal (organ) Prep"), T(A4L, 26, "Bodyweight Warm Up"),
                 T(WI, 3, "Working Out and Working In"), T(A4L, 22, "Human First"), T(A4L, 25, "Complete Working In Session"), T(WI, 4, "Energy Push")],
        "easy": [T(MOM, 2, "Hear In Meditation"), T(MOM, 2, "Piston Breathing"), T(MOM, 2, "Breathe Light 1"), T(WI, 2, "Understanding Working In")],
    },
]


def build():
    s = ["-- Generated by build_plan_templates.py. Idempotent; apply after the content import.",
         "-- Lessons resolve by (program slug, section position, title prefix) or KBL lesson key; unresolved rows are dropped.",
         "begin;"]
    for pos, t in enumerate(TEMPLATES, 1):
        items = weave(t["weeks"], t["pattern"], t["hard"], t["easy"])
        rows = ",\n    ".join(
            f"({i}, {it['week']}, {it['session']}, {q(it['kind'])}, {q(it['prog'])}, {it['sec'] if it['sec'] is not None else 'null'}, {q(it['title'])}, {q(it['note'])})"
            for i, it in enumerate(items, 1))
        s.append(f"""
insert into public.plan_templates (slug, name, goal_kind, description, weeks, days_per_week, items, is_published, position)
select {q(t['slug'])}, {q(t['name'])}, {q(t['goal'])}, {q(t['description'])}, {t['weeks']}, {len(t['pattern'])},
  coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('seq', sp.seq, 'week', sp.week, 'session', sp.session, 'kind', sp.kind,
              'lesson_id', l.id, 'lesson_key', l.key, 'note', sp.note)) order by sp.seq)
            from (values
    {rows}) as sp(seq, week, session, kind, prog, sec, title, note)
            join lateral (
              select l.id, l.key from public.lessons l
              join public.sections s on s.id = l.section_id join public.programs p on p.id = l.program_id
              where (sp.prog = 'kbl' and l.key = sp.title)
                 or (p.slug = sp.prog and s.position = sp.sec and regexp_replace(l.title, '\\s+', ' ', 'g') ilike sp.title || '%')
              order by l.position limit 1) l on true), '[]'::jsonb),
  true, {pos}
on conflict (slug) do update set name = excluded.name, goal_kind = excluded.goal_kind, description = excluded.description,
  weeks = excluded.weeks, days_per_week = excluded.days_per_week, items = excluded.items, is_published = true, position = excluded.position;""")
    s.append("\ncommit;")
    s.append("select slug, goal_kind, weeks, days_per_week, jsonb_array_length(items) as items, weeks * days_per_week as expected from public.plan_templates order by position;")
    return "\n".join(s) + "\n"


if __name__ == "__main__":
    with open(os.path.join(HERE, "plan_templates.sql"), "w") as f:
        f.write(build())
    print("wrote plan_templates.sql")
