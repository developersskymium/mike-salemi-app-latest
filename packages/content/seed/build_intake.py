"""Generates packages/content/seed/intake.sql: goal-setting, KBL and MTK intake forms (+ MTK focus paths).

Sources (read-only, legacy app):
  - KBL: src/content/onboarding.ts (13-step Intake Questionnaire, Gravity Forms form 18) and its scoreIntake().
  - MTK: src/lib/mtk-paths.ts (recommendMtkPath, MTK_PATHS) and src/lib/mtk-plan.ts. The MTK question
    wording lived in the old database; the questions and options below are rebuilt from the answer
    values those two files score (the option strings are exact, since the scoring matches on them).
Run: python3 -I build_intake.py   (writes intake.sql; apply with execute_sql after content import)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def j(v):
    return q(json.dumps(v, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"


def opts(values):
    return [{"value": v, "label": v} for v in values]


# ------------------------------------------------------------------ KBL (legacy onboarding.ts, verbatim)
yes_no = [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]
none_some_lots = [{"value": "no", "label": "No"}, {"value": "some", "label": "Yes, but not much"}, {"value": "lots", "label": "Yes, quite a bit"}]
kbl_steps = [
    {"id": "experience", "eyebrow": "Step 01", "title": "Your kettlebell history",
     "intro": "We start with the basics so we can drop you into the right level of Kettlebell Lifestyle.",
     "questions": [{"id": "used_kettlebell", "label": "Have you ever used a kettlebell before?", "type": "single", "required": True, "options": yes_no}]},
    {"id": "level", "eyebrow": "Step 02", "title": "Describe your kettlebell level",
     "intro": "Not sure? Use the intermediate movement standards as your guide — squats, two hand swings, deadlifts and overhead presses should feel proficient, not new.",
     "questions": [{"id": "kettlebell_level", "label": "Describe your kettlebell level", "type": "single", "required": True, "options": [
         {"value": "beginner", "label": "Beginner", "bullets": ["I’ve rarely used a kettlebell before"]},
         {"value": "intermediate", "label": "Intermediate", "bullets": ["I use a kettlebell fairly often", "I feel proficient with squats, two hand swings, deadlifts and overhead presses"]},
         {"value": "advanced", "label": "Advanced"}]}]},
    {"id": "fitness", "eyebrow": "Step 03", "title": "Fitness baseline", "questions": [
        {"id": "fitness_level", "label": "Describe your fitness level", "type": "single", "options": [
            {"value": "low", "label": "Low", "bullets": ["I feel out of shape"]},
            {"value": "medium", "label": "Medium", "bullets": ["I’m in decent shape, and/or I train with resistance at least 2x/week"]},
            {"value": "high", "label": "High", "bullets": ["My fitness is on the higher side, and/or I train with resistance 3+ times a week"]}]},
        {"id": "consistency", "label": "How long have you been consistently exercising?", "type": "single", "options": [
            {"value": "lt6m", "label": "Less than 6 months"}, {"value": "6m-2y", "label": "Between 6 months and 2 years"}, {"value": "gt2y", "label": "More than 2 years"}]}]},
    {"id": "mobility", "eyebrow": "Step 04", "title": "Joint mobility", "intro": "This tells us how much prep and mobility work to weave into your on-ramp.",
     "questions": [{"id": "shoulders", "label": "Do your shoulder(s) feel limited or restricted in some way?", "type": "single", "options": none_some_lots},
                   {"id": "hips", "label": "Do your hip(s) feel limited or restricted in some way?", "type": "single", "options": none_some_lots}]},
    {"id": "goals", "eyebrow": "Step 05", "title": "What do you want to improve most?", "questions": [
        {"id": "focus_areas", "label": "What areas of your training, ability, or lifestyle do you wish to improve upon most?", "help": "Select all that apply.", "type": "multi",
         "options": opts(["Kettlebell Skill", "Health", "Fitness", "Longevity & Injury Prevention", "Flexibility/Mobility", "Mindset", "Nutrition", "Sleep", "Strength", "Conditioning", "Fat Loss"])}]},
    {"id": "hydration", "eyebrow": "Step 06", "title": "Hydration", "questions": [
        {"id": "water", "label": "Are you drinking at least half an ounce of quality filtered water per pound of bodyweight a day?", "type": "single", "options": yes_no}]},
    {"id": "sleep", "eyebrow": "Step 07", "title": "Sleep",
     "note": {"title": "Questions to consider on sleep quality", "points": ["Do you fall asleep easily (~30 minutes or less)?", "Are you waking up multiple times a night?", "Do you wake up in the morning feeling rested?"]},
     "questions": [{"id": "sleep", "label": "Do you get 7+ hours of quality sleep per night?", "type": "single", "options": yes_no}]},
    {"id": "nutrition", "eyebrow": "Step 08", "title": "Nutrition & digestion", "questions": [
        {"id": "nutrition", "label": "How would you describe your nutrition and digestion?", "type": "single", "options": [
            {"value": "above", "label": "Above average", "bullets": ["Food leaves me energised, with regular, easy to pass bowel movements"]},
            {"value": "average", "label": "Average", "bullets": ["I generally eat clean, but certain foods affect my digestion adversely"]},
            {"value": "below", "label": "Below average", "bullets": ["I don’t eat the greatest, and/or often experience digestive discomfort"]}]}]},
    {"id": "stress", "eyebrow": "Step 09", "title": "Stress & balance", "questions": [
        {"id": "stress_level", "label": "How would you describe your daily stress level?", "type": "single", "options": [
            {"value": "low", "label": "Low", "bullets": ["I rarely feel stressed"]},
            {"value": "moderate", "label": "Moderate", "bullets": ["I’m sometimes stressed, but I manage it well"]},
            {"value": "high", "label": "High", "bullets": ["I feel stressed a majority of the time"]}]},
        {"id": "stress_management", "label": "How well do you manage your stress on a daily basis?", "type": "single",
         "options": [{"value": "poorly", "label": "Poorly"}, {"value": "moderate", "label": "Moderate"}, {"value": "well", "label": "Well"}]},
        {"id": "work_life", "label": "Do you feel you have a good work-life balance?", "type": "single", "options": yes_no}]},
    {"id": "solitude", "eyebrow": "Step 10", "title": "Time with yourself", "questions": [
        {"id": "alone", "label": "How comfortable do you feel being alone?", "type": "single", "options": [
            {"value": "uncertain", "label": "Not very / uncertain", "bullets": ["I’ve never paid attention to this and am not sure"]},
            {"value": "mild", "label": "Mildly", "bullets": ["I don’t feel comfortable unless I’m around others, or have the TV or radio on"]},
            {"value": "super", "label": "Super comfortable", "bullets": ["I can sit quietly or meditate with no distractions for an hour"]}]}]},
    {"id": "flexibility", "eyebrow": "Step 11", "title": "Flexibility", "questions": [
        {"id": "flexibility", "label": "Would you consider your body to be:", "type": "single", "options": [
            {"value": "stiff", "label": "Stiff as a board and not flexible"}, {"value": "mild", "label": "Mildly flexible"}, {"value": "high", "label": "Highly flexible"}]}]},
    {"id": "posture", "eyebrow": "Step 12", "title": "Posture",
     "note": {"title": "Not sure?", "points": ["If your posture shows characteristics of anything other than good posture, choose option 1 or 2.", "One tell: where do your ears sit relative to your shoulders when standing relaxed?"]},
     "questions": [{"id": "posture", "label": "Do you feel your posture is:", "type": "single", "options": [
         {"value": "poor", "label": "Poor and out of balance"}, {"value": "ok", "label": "Ok, but could use some improvement"}, {"value": "good", "label": "Good and well-balanced"}]}]},
    {"id": "coordination", "eyebrow": "Step 13", "title": "Coordination", "questions": [
        {"id": "coordination", "label": "How would you describe your level of coordination?", "type": "single", "options": [
            {"value": "low", "label": "Low", "description": "I feel like a baby giraffe at times ; )"},
            {"value": "medium", "label": "Medium", "description": "Somewhere between a giraffe and a cheetah"},
            {"value": "high", "label": "High", "description": "Oh heck yeah, I’m a cheetah!"}]}]},
]

kbl_rules = {
    "kind": "first_match",
    "rules": [{
        "when": {"all": [{"q": "used_kettlebell", "eq": "yes"}, {"q": "kettlebell_level", "in": ["intermediate", "advanced"]}, {"q": "fitness_level", "neq": "low"}]},
        "result": {"path_key": "intermediate", "label": "Level II — Intermediate", "headline": "You’re starting at Level II",
                   "summary": "Your kettlebell background and training consistency mean you can skip the absolute basics and start with the Intermediate track."},
    }],
    "default": {"path_key": "beginner", "label": "Level I — Beginner", "headline": "You’re starting at Level I",
                "summary": "We’ll build your foundation first: the On Ramp phase teaches the positions and breathing that everything else is stacked on."},
    "notes": [
        {"when": {"any": [{"q": "shoulders", "eq": "lots"}, {"q": "hips", "eq": "lots"}]}, "text": "Prioritise the mobility work in the On Ramp — your joints need runway before load."},
        {"when": {"q": "flexibility", "eq": "stiff"}, "text": "Add the stretch protocols after every session and retake the Stretch Test in 4 weeks."},
        {"when": {"q": "posture", "eq": "poor"}, "text": "Run the posture correctives daily; they unlock your overhead positions."},
        {"when": {"q": "sleep", "eq": "no"}, "text": "Sleep is the cheapest performance gain available — aim for 7+ hours before adding volume."},
        {"when": {"q": "water", "eq": "no"}, "text": "Dial in hydration: half an ounce of filtered water per pound of bodyweight, daily."},
        {"when": {"q": "nutrition", "eq": "below"}, "text": "Clean up one meal a day before overhauling everything — digestion drives recovery."},
        {"when": {"any": [{"q": "stress_level", "eq": "high"}, {"q": "stress_management", "eq": "poorly"}]}, "text": "Use the breathing and down-regulation lessons on your rest days."},
        {"when": {"q": "coordination", "eq": "low"}, "text": "Slow the tempo on skill days — reps at half speed build coordination fastest."},
    ],
    "notes_default": ["You’re in strong shape — focus on technical precision and progressive load."],
    "notes_limit": 4,
}

# ------------------------------------------------------------------ MTK (legacy mtk-paths.ts / mtk-plan.ts)
LIFTS = ["Deadlift", "Single-Leg Deadlift", "Swing", "Clean", "Snatch", "Press", "Jerk", "Turkish Get Up", "Windmill", "Squat", "Lunge", "Row"]
ROLES = ["Training for myself", "Athlete", "Personal trainer / strength coach", "Movement / rehab professional", "I train myself and coach others"]
EXPERIENCE = ["Completely new", "Used kettlebells a few times", "Less than 1 year", "1–3 years", "More than 3 years", "I regularly coach kettlebells"]
IMPROVE = ["Strong kettlebell fundamentals", "Swing / Clean / Snatch", "Power and conditioning", "Overhead strength and technique",
           "Turkish Get Up / overhead control", "Squat / Lunge / Row", "Overall strength and movement quality", "Become a better kettlebell coach", "Learn the full system"]
FOCUS = ["Ballistic Movements", "Overhead Movements", "Lower Body & Pulling", "All of them", "Not sure"]
CHALLENGE = ["Technique", "Power/explosiveness", "Conditioning", "Stability/control", "Strength", "Mobility", "Programming for myself",
             "Programming for clients", "Complete system understanding", "Advanced progressions", "Not sure where to start"]
KNOWLEDGE = ["1 — New", "2 — Developing", "3 — Competent", "4 — Experienced", "5 — Coach / Advanced"]
TIME = ["Less than 1 hour", "1–2 hours", "2–3 hours", "3–4 hours", "4+ hours"]
GUIDANCE = ["Show me exactly where to start", "Recommend a path but let me explore", "I already know what I want to work on"]

mtk_steps = [
    {"id": "about", "eyebrow": "Step 01", "title": "About you", "questions": [
        {"id": "role", "label": "Which best describes you?", "type": "single", "required": True, "options": opts(ROLES)},
        {"id": "experience", "label": "How much kettlebell experience do you have?", "type": "single", "required": True, "options": opts(EXPERIENCE)}]},
    {"id": "movements", "eyebrow": "Step 02", "title": "Where your movements are today", "questions": [
        {"id": "confident", "label": "Which movements do you already feel confident with?", "help": "Select all that apply.", "type": "multi",
         "options": opts(LIFTS + ["Still learning fundamentals", "Unsure about my technique"])},
        {"id": "struggle", "label": "Which movements do you struggle with most?", "help": "Select all that apply.", "type": "multi",
         "options": opts(LIFTS + ["None in particular"])}]},
    {"id": "goals", "eyebrow": "Step 03", "title": "What you want from MTK", "questions": [
        {"id": "improve", "label": "What do you most want to improve?", "type": "single", "required": True, "options": opts(IMPROVE)},
        {"id": "focus", "label": "Which movement area do you want to work on first?", "type": "single", "required": True, "options": opts(FOCUS)},
        {"id": "challenge", "label": "What is your biggest challenge right now?", "type": "single", "options": opts(CHALLENGE)}]},
    {"id": "practice", "eyebrow": "Step 04", "title": "Your practice", "questions": [
        {"id": "knowledge", "label": "How would you rate your kettlebell knowledge?", "type": "single", "options": opts(KNOWLEDGE)},
        {"id": "time", "label": "How much time can you give MTK each week?", "type": "single", "options": opts(TIME)},
        {"id": "guidance", "label": "How much guidance do you want?", "type": "single", "options": opts(GUIDANCE)}]},
]

PATHS = {
    "ballistic": {"key": "mtk-ballistic", "name": "Ballistic Movements", "movements": ["Deadlift", "Swing", "Clean", "Snatch"], "sections": [4, 26], "start": 4,
                  "focus": ["Deadlift / hinge foundation", "Swing mechanics", "Clean progression"]},
    "overhead": {"key": "mtk-overhead", "name": "Overhead Movements", "movements": ["Press", "Jerk", "Turkish Get Up", "Windmill"], "sections": [27, 36], "start": 27,
                 "focus": ["Press and jerk pre-check", "Overhead press position", "Turkish Get Up control"]},
    "lower": {"key": "mtk-lower", "name": "Lower Body & Pulling", "movements": ["Squat", "Lunge", "Row"], "sections": [37, 48], "start": 37,
              "focus": ["Squat pre-check and pattern", "Multi-directional lunges", "Row mechanics"]},
    "full": {"key": "mtk-full", "name": "Full Mastering the Kettlebell", "movements": ["Every MTK movement"], "sections": [1, 52], "start": 2,
             "focus": ["Grips and positions", "Deadlift and swing foundations", "Work through each movement family in order"]},
}

focus_map = {"Ballistic Movements": "ballistic", "Overhead Movements": "overhead", "Lower Body & Pulling": "lower", "All of them": "full"}
improve_map = {"Swing / Clean / Snatch": "ballistic", "Power and conditioning": "ballistic", "Overhead strength and technique": "overhead",
               "Turkish Get Up / overhead control": "overhead", "Squat / Lunge / Row": "lower", "Overall strength and movement quality": "lower",
               "Become a better kettlebell coach": "full", "Learn the full system": "full"}
challenge_map = {"Power/explosiveness": "ballistic", "Conditioning": "ballistic", "Stability/control": "overhead", "Strength": "lower", "Mobility": "lower",
                 "Programming for clients": "full", "Complete system understanding": "full", "Advanced progressions": "full"}

mtk_rule_list = []
for ans, b in focus_map.items():
    mtk_rule_list.append({"when": {"q": "focus", "eq": ans}, "add": {b: 4},
                          "reason": f"You chose {'to work on every area' if ans == 'All of them' else ans} first"})
for ans, b in improve_map.items():
    mtk_rule_list.append({"when": {"q": "improve", "eq": ans}, "add": {b: 3}, "reason": f"Your goal is {ans.lower()}"})
for ans, b in challenge_map.items():
    mtk_rule_list.append({"when": {"q": "challenge", "eq": ans}, "add": {b: 1}})
fam_conds = {b: {"q": "confident", "has_any": PATHS[b]["movements"]} for b in ["ballistic", "overhead", "lower"]}
for b, c in fam_conds.items():
    mtk_rule_list.append({"when": c, "add": {b: 1}})
mtk_rule_list.append({"when": {"count": list(fam_conds.values()), "gte": 3}, "add": {"full": 2}, "reason": "You already work across several movement categories"})
mtk_rule_list.append({"when": {"any": [{"q": "role", "in": ["Personal trainer / strength coach", "Movement / rehab professional", "I train myself and coach others"]},
                                       {"q": "experience", "eq": "I regularly coach kettlebells"}]},
                      "add": {"full": 3}, "reason": "You coach others, so the complete system serves you best", "suppress_tie_reason": True})
mtk_rule_list.append({"when": {"any": [{"q": "knowledge", "num_gte": 5}, {"q": "experience", "eq": "More than 3 years"}]}, "add": {"full": 1}})

mtk_rules = {
    "kind": "score",
    "buckets": ["ballistic", "overhead", "lower", "full"],
    "order": ["ballistic", "overhead", "lower", "full"],
    "rules": mtk_rule_list,
    "none": "ballistic", "none_reason": "No single focus stood out, so we start with the ballistic foundation every movement builds on",
    "tie": "full", "tie_reason": "No single primary focus stood out",
    "outcomes": {b: {"path_key": p["key"], "label": p["name"], "start_section": p["start"], "initial_focus": p["focus"]} for b, p in PATHS.items()},
    "flags": [{"key": "foundation_first",
               "when": {"any": [{"q": "experience", "in": ["Completely new", "Used kettlebells a few times"]},
                                {"q": "confident", "has": "Still learning fundamentals"}, {"q": "confident", "has": "Unsure about my technique"},
                                {"q": "improve", "eq": "Strong kettlebell fundamentals"}, {"q": "knowledge", "num_eq": 1}]},
               "reason": "We'll start you at the foundations and pre-checks before loading the lifts",
               "override": {"start_section": 2, "initial_focus_prefix": ["Starting up, grips and positions"], "keep_focus": 2}}],
    "pace": {"q": "time", "default": "Aim for 2–3 sessions a week and repeat a section whenever a busy week interrupts you", "map": {
        "Less than 1 hour": "2 short technique sessions a week, one movement at a time",
        "1–2 hours": "2–3 sessions a week, one section per week",
        "2–3 hours": "3 sessions a week, one to two sections per week",
        "3–4 hours": "3–4 sessions a week, two sections per week",
        "4+ hours": "4+ sessions a week, moving through a movement family every 1–2 weeks"}},
}

# ------------------------------------------------------------------ goal setting (global)
GOALS = [
    {"value": "strength", "label": "Get stronger", "description": "Build real strength with the big kettlebell lifts."},
    {"value": "technique", "label": "Sharpen my technique", "description": "Cleaner swings, cleans, snatches and presses."},
    {"value": "mobility", "label": "Move better", "description": "Mobility, flexibility and joints that feel good."},
    {"value": "conditioning", "label": "Build conditioning", "description": "Engine, work capacity and fat loss."},
    {"value": "mindset", "label": "Mindset and calm", "description": "Breath, presence and handling stress."},
    {"value": "retreat_prep", "label": "Prepare for a retreat", "description": "Get body and mind ready for Men of Movement."},
]
goal_steps = [
    {"id": "goal", "eyebrow": "Step 01", "title": "What do you want most right now?", "questions": [
        {"id": "goal_kind", "label": "Choose your main goal", "type": "single", "required": True, "options": GOALS},
        {"id": "target_date", "label": "Is there a date you are working towards?", "help": "Optional — a retreat, an event, a birthday.", "type": "date"}]},
    {"id": "programs", "eyebrow": "Step 02", "title": "Which programs interest you?", "questions": [
        {"id": "programs", "label": "Programs you want in your plan", "help": "Select all that apply. Leave empty and we will choose.", "type": "multi", "options": []}]},
    {"id": "approach", "eyebrow": "Step 03", "title": "How do you want to be guided?", "questions": [
        {"id": "approach", "label": "Choose an approach", "type": "single", "required": True, "options": [
            {"value": "guided", "label": "Guide me", "description": "Start from one of Mike's plans and follow it."},
            {"value": "custom", "label": "Build it with me", "description": "Shape your own plan from the lessons you choose."}]}]},
    {"id": "schedule", "eyebrow": "Step 04", "title": "Your week", "questions": [
        {"id": "days_per_week", "label": "How many days a week can you train?", "type": "single", "required": True, "options": opts(["2", "3", "4", "5"])},
        {"id": "session_length", "label": "How long is a typical session?", "type": "single", "options": [
            {"value": "15", "label": "About 15 minutes"}, {"value": "30", "label": "About 30 minutes"},
            {"value": "45", "label": "About 45 minutes"}, {"value": "60", "label": "An hour or more"}]}]},
    {"id": "setup", "eyebrow": "Step 05", "title": "Your setup", "questions": [
        {"id": "equipment", "label": "What equipment do you have?", "help": "Select all that apply.", "type": "multi", "options": opts([
            "One kettlebell", "Two kettlebells (a pair)", "Several kettlebells", "Pull-up bar", "Mat and floor space", "Full gym"])},
        {"id": "injuries", "label": "Any injuries or limits we should know about?", "help": "Optional.", "type": "text"}]},
]
goal_rules = {"kind": "goal", "goal_q": "goal_kind", "target_q": "target_date", "programs_q": "programs", "approach_q": "approach",
              "titles": {g["value"]: g["label"] for g in GOALS}}


def build():
    s = ["-- Generated by build_intake.py. Idempotent; apply after the content import (needs MTK and KBL programs).", "begin;", ""]
    s.append(f"""insert into public.intake_forms (key, program_id, title, introduction, questions, result_rules, version, is_published)
values ('goal-setting', null, 'Set your goal',
  'A few questions so we can point you at the right plan. You can change your answers any time.', {j(goal_steps)}, {j(goal_rules)}, 1, true)
on conflict (key) do update set title = excluded.title, introduction = excluded.introduction, questions = excluded.questions,
  result_rules = excluded.result_rules, is_published = true, updated_at = now();
-- programs of interest = published training programs (value = slug)
update public.intake_forms set questions = jsonb_set(questions, '{{1,questions,0,options}}', coalesce((
  select jsonb_agg(jsonb_build_object('value', p.slug, 'label', p.name, 'description', p.tagline) order by p.position, p.name)
  from public.programs p where p.status = 'published' and p.type in ('day_program', 'course', 'challenge')
    and p.catalog_group in ('training', 'experiences')), '[]'::jsonb))
where key = 'goal-setting';
""")
    s.append(f"""insert into public.intake_forms (key, program_id, title, introduction, questions, result_rules, version, is_published)
select 'kbl-intake', p.id, 'Kettlebell Lifestyle intake',
  'Thirteen quick steps so we can drop you into the right level of Kettlebell Lifestyle.', {j(kbl_steps)}, {j(kbl_rules)}, 1, true
from public.programs p where p.slug = 'kettlebell-lifestyle'
on conflict (key) do update set program_id = excluded.program_id, title = excluded.title, introduction = excluded.introduction,
  questions = excluded.questions, result_rules = excluded.result_rules, is_published = true, updated_at = now();
""")
    for pos, (b, p) in enumerate(PATHS.items(), 1):
        meta = {"recommend_key": b, "movements": p["movements"], "section_range": p["sections"], "start_section": p["start"], "initial_focus": p["focus"]}
        a, z = p["sections"]
        s.append(f"""insert into public.program_paths (program_id, key, kind, name, short_name, description, position, meta)
select p.id, {q(p['key'])}, 'focus', {q(p['name'])}, {q(p['name'].replace('Full Mastering the Kettlebell', 'Full program'))},
  {q('Movements: ' + ', '.join(p['movements']))}, {pos},
  {j(meta)} || jsonb_build_object('section_ids', coalesce((select jsonb_agg(s.id order by s.position) from public.sections s
                                   where s.program_id = p.id and s.position between {a} and {z}), '[]'::jsonb),
                                 'start_section_id', (select s.id from public.sections s where s.program_id = p.id and s.position = {p['start']} limit 1))
from public.programs p where p.slug = 'mastering-the-kettlebell'
on conflict (key) do update set name = excluded.name, short_name = excluded.short_name, description = excluded.description,
  position = excluded.position, meta = excluded.meta;""")
    s.append(f"""
insert into public.intake_forms (key, program_id, title, introduction, questions, result_rules, version, is_published)
select 'mtk-intake', p.id, 'Mastering the Kettlebell assessment',
  'Tell us where your lifts are today and we will recommend where to start in Mastering the Kettlebell.', {j(mtk_steps)}, {j(mtk_rules)}, 1, true
from public.programs p where p.slug = 'mastering-the-kettlebell'
on conflict (key) do update set program_id = excluded.program_id, title = excluded.title, introduction = excluded.introduction,
  questions = excluded.questions, result_rules = excluded.result_rules, is_published = true, updated_at = now();
""")
    s.append("commit;")
    return "\n".join(s) + "\n"


if __name__ == "__main__":
    with open(os.path.join(HERE, "intake.sql"), "w") as f:
        f.write(build())
    print("wrote intake.sql")
