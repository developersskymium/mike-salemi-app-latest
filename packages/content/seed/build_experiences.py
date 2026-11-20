"""Generates packages/content/seed/experiences.sql from the legacy retreat/coaching/program content.

Source (read-only): /home/claude/legacy/src/content/{retreats,retreat-gallery,coaching,programs}.ts —
transcribed here because the TS files import image assets. Run: python3 -I build_experiences.py
Idempotent SQL: deterministic ids via md5('ms:<name>')::uuid, upserts on slug/id.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def q(s):
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


def j(v):
    return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"


def arr(xs):
    return "array[" + ", ".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"


def uid(name):
    return f"md5('ms:{name}')::uuid"


DRAFT = "Name, dates and price awaiting Mike"

shared_faq = [
    {"q": "I'm not in great physical shape. Can I handle this?",
     "a": "Yes. The physical practices are scaled to meet you where you are. This isn't about performance. If you can walk, breathe, and move with some intention, you can do this."},
    {"q": "I've never done this kind of work before. Will I be out of place?",
     "a": "Not at all. About half the men who come are new to this. The other half are returning because they got so much from the first time. That mix is part of what makes it work."},
    {"q": "What if I'm not married or don't have kids?",
     "a": "You don't need to be. This work is about your relationship with yourself first. Whether you're single, partnered, a father, or not, it applies directly to where you are right now."},
    {"q": "How emotionally intense does it get?",
     "a": "You're always in charge of how far you go. Some men leave having broken something open they've been carrying for years. Some leave with a quiet shift that takes a few weeks to fully land. All of it counts. And you're guided through every step with care."},
]
aftercare = [
    "Men of Movement: Preparation — a practice program Mike builds for each retreat, sent in the weeks before, with foundational breathwork and meditation",
    "Daily practices to take home — breathwork and body practices from the retreat",
    "The Brotherhood — a private group with the men you went through it alongside",
    "Men of Movement: Integration — a group call one week after the retreat",
    "Continued pathways — The Grounded King, 1:1 coaching, private retreats and other offerings",
]

R = "/media/retreats/"
gallery = [
    {"url": R + "live/breakthrough-circle-room.jpg", "caption": "The sacred circle room at The Breakthrough"},
    {"url": R + "live/breakthrough-venue.jpg", "caption": "The Breakthrough venue at golden hour"},
    {"url": R + "live/qi-gong.png", "caption": "Qi Gong on Mount Shasta"},
    {"url": R + "live/breathwork.jpg", "caption": "Breathwork ceremony"},
    {"url": R + "live/fire.jpg", "caption": "Men around the fire"},
    {"url": R + "live/tims-land.jpg", "caption": "Men walking through Tim's land"},
    {"url": R + "live/maloca.jpg", "caption": "Inside the maloca, Tim's land"},
    {"url": R + "live/after-sweat-lodge.jpg", "caption": "Brotherhood after the sweat lodge"},
    {"url": R + "live/shared-meals.png", "caption": "Shared meals and brotherhood"},
    {"url": R + "live/group-tims-land.jpg", "caption": "Men of Movement group on Tim's land"},
    {"url": R + "live/facing-shasta.png", "caption": "One man facing Mount Shasta"},
    {"url": R + "online/summit-clouds.jpg", "caption": "Peaks above the clouds at first light", "stock": True},
    {"url": R + "online/campfire-men.jpg", "caption": "An evening around the fire", "stock": True},
    {"url": R + "online/forest-path.jpg", "caption": "Forest trail through old-growth pines", "stock": True},
    {"url": R + "online/alpine-pines.jpg", "caption": "Alpine valley and pine forest", "stock": True},
    {"url": R + "online/misty-ridge.jpg", "caption": "Mist lifting off the ridge", "stock": True},
    {"url": R + "online/foggy-forest.jpg", "caption": "Morning fog in the forest", "stock": True},
    {"url": R + "online/sunrise-camp.jpg", "caption": "Sunrise over the mountain camp", "stock": True},
]
by = {g["url"].rsplit("/", 1)[1]: g for g in gallery}
primal_gallery = [by[k] for k in ["tims-land.jpg", "group-tims-land.jpg", "maloca.jpg", "after-sweat-lodge.jpg", "fire.jpg", "facing-shasta.png"]]

retreat_desc = """A live retreat: four days of movement, training, breathwork, ceremony and brotherhood with Mike and his team. The in-person version of everything the programs teach.

## What it is
Two cohorts a year in Mount Shasta, California. Mornings move, afternoons go inward, and evenings are fire, food and circle.

- Daily Qi Gong and team training
- Somatic breathwork ceremony
- Sweat lodge and rite of passage
- Full-board on private land

## After you get home
You leave with a take-home practice, a private brotherhood group and an integration call one week later.

## Common questions
**Do I need to be fit?** No. Everything is scalable in the moment.

**Is it a personal-development retreat or a training camp?** Both — the training is real, and so is the inner work."""

breakthrough = {
    "key": "run:breakthrough-2027",
    "name": "The Breakthrough",
    "starts_at": "2027-05-13T12:00:00-07:00",
    "ends_at": "2027-05-16T12:00:00-07:00",
    "capacity": 20,
    "status": "open",
    "location": {"venue": "Private sanctuary", "city": "Mount Shasta", "region": "California", "country": "US",
                 "address": "Mount Shasta, Northern California (exact venue shared after acceptance)",
                 "map_query": "Mount Shasta CA", "label": "Private sanctuary, Mount Shasta, Northern California"},
    "details": {
        "slug": "breakthrough", "season": "Spring Retreat",
        "tagline": "Four days in Mount Shasta. This is where we go deep.",
        "description": "What most men haven't had is four uninterrupted days away from everything, in the right place, with the right people around them. We work with the patterns running underneath the surface, built long before you had any say in them, and we begin to change them — in your body, through ceremony and breathwork and the kind of depth that only full immersion can reach. You arrive welcomed like family into a private sanctuary in Mount Shasta, held by a master landscape architect. Every meal is prepared by Lauren Salemi.",
        "duration_label": "4 days",
        "cta_label": "Apply for May 13-16, 2027",
        "cover": R + "live/breakthrough-circle-room.jpg",
        "highlights": [
            "Daily Qi Gong with Dr. Jonny Suarez — one movement per day",
            "Somatic breathwork ceremony, the largest release of the retreat",
            "Sweat lodge and rite of passage led by an elder with over fifty years in this work",
            "Sensory ceremony dinners prepared by Lauren Salemi",
        ],
        "facilitators": [
            {"name": "Mike Salemi", "role": "Founder · Lead Facilitator"},
            {"name": "Dr. Jonny Suarez", "role": "Chinese Medicine · Functional Medicine · Qi Gong"},
            {"name": "Greg Schmaus", "role": "Archetypal & Constellation Facilitator"},
            {"name": "Tim Corcoran", "role": "Wilderness Elder · Headwaters Outdoor School (guest, select retreats)"},
            {"name": "Lauren Salemi", "role": "Private Chef · Holistic Coach · Food Ceremony"},
        ],
        "accommodation": "Private sanctuary in Mount Shasta; all meals prepared by Lauren Salemi.",
        "travel": "Airport pickup on Day I. The exact venue and travel details are shared after acceptance.",
        "prerequisites": [],
        "packing": [],
        "checklist_note": "The packing list and preparation documents are shared after acceptance.",
        "faq": shared_faq,
        "aftercare": aftercare,
    },
    "gallery": gallery,
    "itinerary": [
        (1, "Arrival & Connection", ["Airport pickup", "Team workout", "Shared meal", "Circle opens with agreements and intentions", "Evening fire with one question"]),
        (2, "Opening & Release", ["Qi Gong", "Archetypal work and hot seats", "Breathwork ceremony"]),
        (3, "Into the Fire", ["Move to Tim's outdoor school at Headwaters", "Tobacco ceremony", "Sweat lodge", "Creek plunge", "Rite of passage"]),
        (4, "Celebration & Return", ["Cacao ceremony", "Visualization of the man you're stepping into", "Shared reflection closes the arc"]),
    ],
}

primal = {
    "key": "run:primal-reset-2026",
    "name": "The Primal Reset",
    "starts_at": "2026-09-03T12:00:00-07:00",
    "ends_at": "2026-09-06T12:00:00-07:00",
    "capacity": 20,
    "status": "past",
    "location": {"venue": "Tim Corcoran's land", "city": "Mt. Shasta", "region": "California", "country": "US",
                 "address": "Mt. Shasta, California (details provided after acceptance)", "map_query": "Mount Shasta CA",
                 "label": "Tim Corcoran's land, Mt. Shasta, California"},
    "details": {
        "slug": "primal-reset", "season": "Fall Retreat",
        "tagline": "This retreat shuts it all off.",
        "description": "You're drowning in modern life. The constant connectivity. The pressure that never stops. The noise. Days on Tim Corcoran's land in Mt. Shasta — full immersion in nature. No phones. No distractions. Just the land, the elements, and your brothers. This retreat is for the man who needs to unplug, remember, and reset.",
        "duration_label": "3 nights, 4 days",
        "cover": R + "live/tims-land.jpg",
        "highlights": [
            "Complete nature immersion — sleep under the stars, wake with the sun",
            "Nature-based practices — shelter building, fire making, solo time",
            "Night hikes — moving through darkness, trusting instincts",
            "Team challenges — building, creating, problem-solving with your brothers",
            "Men's work & movement — breathwork, movement, ritual",
            "All ceremonies, all meals (dietary needs accommodated) and sleeping on the land",
        ],
        "facilitators": [
            {"name": "Mike Salemi", "role": "Founder · Lead Facilitator"},
            {"name": "Tim Corcoran", "role": "Wilderness Elder · Headwaters Outdoor School"},
        ],
        "accommodation": "Sleeping on the land; all meals included (dietary needs accommodated).",
        "travel": "Details provided after acceptance.",
        "prerequisites": [],
        "packing": [],
        "faq": shared_faq,
        "aftercare": aftercare,
    },
    "gallery": primal_gallery,
    "itinerary": [],
}


def run_sql(prog_slug, run):
    out = [f"""insert into public.program_runs (id, program_id, name, starts_at, ends_at, timezone, capacity, status,
  requires_application, price_note, location, details, gallery, draft_note)
select {uid(run['key'])}, p.id, {q(run['name'])}, {q(run['starts_at'])}, {q(run['ends_at'])}, 'America/Los_Angeles', {run['capacity']},
  {q(run['status'])}, true, 'By application', {j(run['location'])}, {j(run['details'])}, {j(run['gallery'])},
  {q(DRAFT) if run['status'] == 'open' else 'null'}
from public.programs p where p.slug = {q(prog_slug)}
on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  capacity = excluded.capacity, status = excluded.status, requires_application = excluded.requires_application,
  price_note = excluded.price_note, location = excluded.location, details = excluded.details, gallery = excluded.gallery,
  draft_note = excluded.draft_note;""",
           ]
    for day, title, items in run["itinerary"]:
        for pos, item in enumerate(items, 1):
            out.append(f"insert into public.itinerary_items (id, run_id, day_index, title, description, position) values "
                       f"({uid(run['key'] + f':d{day}:{pos}')}, {uid(run['key'])}, {day}, {q(item)}, {q(f'Day {day} · {title}')}, {pos}) "
                       f"on conflict (id) do update set day_index = excluded.day_index, title = excluded.title, description = excluded.description, position = excluded.position;")
    return "\n".join(out)


coaching_pkgs = [
    ("single-60", "Single session", 60, 1, 18000, "One hour with Mike on the thing that is actually holding you back.",
     ["60-minute video call", "Technique review on your footage", "Written notes afterwards"], False),
    ("deep-dive-90", "Deep dive", 90, 1, 25000, "A longer session for a full movement screen and a rebuilt training block.",
     ["90-minute video call", "Full movement screen", "Four-week block written for you", "Follow-up message thread"], True),
    ("block-4", "Four-session block", 60, 4, 64000, "A month of weekly calls with programming adjusted between each one.",
     ["4 × 60-minute calls", "Programming adjusted weekly", "Unlimited footage review", "Priority scheduling"], False),
]


def program_upsert(slug, name, ptype, status, *, tagline=None, summary=None, description=None, highlights=(),
                   format_label=None, duration_label=None, catalog_group="experiences", draft_note=None, position=50,
                   audience=None, meta=None, keep_existing_text=False):
    # Insert or update. keep_existing_text keeps text fields another agent may already have set.
    upd = ["type = excluded.type"]
    for col in ["tagline", "summary", "description", "format_label", "duration_label", "audience"]:
        upd.append(f"{col} = coalesce(public.programs.{col}, excluded.{col})" if keep_existing_text else f"{col} = excluded.{col}")
    upd.append("highlights = case when cardinality(public.programs.highlights) > 0 then public.programs.highlights else excluded.highlights end"
               if keep_existing_text else "highlights = excluded.highlights")
    upd.append("draft_note = coalesce(public.programs.draft_note, excluded.draft_note)" if keep_existing_text else "draft_note = excluded.draft_note")
    if not keep_existing_text:
        upd += ["status = excluded.status", "catalog_group = excluded.catalog_group", "name = excluded.name"]
    return f"""insert into public.programs (slug, name, type, status, tagline, summary, description, highlights, format_label,
  duration_label, catalog_group, draft_note, position, audience, meta)
values ({q(slug)}, {q(name)}, {q(ptype)}, {q(status)}, {q(tagline)}, {q(summary)}, {q(description)}, {arr(list(highlights))},
  {q(format_label)}, {q(duration_label)}, {q(catalog_group)}, {q(draft_note)}, {position}, {q(audience)}, {j(meta or {})})
on conflict (slug) do update set {', '.join(upd)};"""


def build():
    s = ["-- Generated by build_experiences.py from legacy src/content/{retreats,retreat-gallery,coaching,programs}.ts.",
         "-- Idempotent. Apply with the Supabase MCP execute_sql.", "begin;", ""]
    s.append("-- Men of Movement Retreats (content import may have created it; keep its text if set)")
    s.append(program_upsert("men-of-movement-retreats", "Men of Movement Retreats", "retreat", "published",
                            tagline="In-person immersion, small group",
                            summary="Four days of movement, training, breathwork, ceremony and brotherhood with Mike and his team in Mount Shasta, California.",
                            description=retreat_desc,
                            highlights=["Live, in person", "Small groups", "Movement, ceremony, recovery"],
                            format_label="Four days, in person", duration_label="4 days", audience="Men ready to go deep, in any shape",
                            draft_note=DRAFT, position=40, keep_existing_text=True))
    s.append("update public.programs set type = 'retreat', catalog_group = 'experiences' where slug = 'men-of-movement-retreats';")
    s.append(f"""insert into public.program_media (id, program_id, role, url, alt, position)
select {uid('media:mom:hero')}, p.id, 'hero', '/media/retreats/live/breakthrough-circle-room.jpg', 'The sacred circle room at The Breakthrough', 0
from public.programs p where p.slug = 'men-of-movement-retreats'
  and not exists (select 1 from public.program_media m where m.program_id = p.id and m.role = 'hero')
on conflict (id) do nothing;
insert into public.program_media (id, program_id, role, url, alt, position)
select {uid('media:mom:card')}, p.id, 'card', '/media/retreats/mom-cover.jpg', 'Men of Movement', 0
from public.programs p where p.slug = 'men-of-movement-retreats'
  and not exists (select 1 from public.program_media m where m.program_id = p.id and m.role = 'card')
on conflict (id) do nothing;""")
    rows = ",\n  ".join(f"({q(g['url'])}, {q(g['caption'])}, {i})" for i, g in enumerate(gallery, 1))
    s.append(f"""insert into public.program_media (id, program_id, role, url, alt, position)
select md5('ms:media:mom:gallery:' || g.url)::uuid, p.id, 'gallery', g.url, g.alt, g.pos
from public.programs p, (values
  {rows}) as g(url, alt, pos)
where p.slug = 'men-of-movement-retreats' on conflict (id) do nothing;""")
    s.append("")
    s.append(run_sql("men-of-movement-retreats", primal))
    s.append(run_sql("men-of-movement-retreats", breakthrough))
    s.append("")

    s.append("-- Coaching")
    s.append(program_upsert("coaching", "1:1 Coaching with Mike", "coaching", "published",
                            tagline="Your program, built around you",
                            summary="Direct coaching for people who want the program adapted to their body, schedule and goals — with feedback on technique and accountability week to week.",
                            description="""Direct coaching for people who want the program adapted to their body, schedule and goals — with feedback on technique and accountability week to week.

## How it works
Book a session in the app, send your training footage ahead of time, and spend the call working on exactly what is limiting you. Every session ends with a written plan.

- Video call with Mike, 60 or 90 minutes
- Technique review on your own footage
- A written block you can follow immediately
- Session notes and history kept in the app

## Who it is for
Lifters stuck at a plateau, people coming back from injury, and coaches who want their own coaching eye sharpened.

## Common questions
**Do I have to commit to a block?** No. Single sessions are fine, though most people book a four-session block.

**What if I need to move a session?** Reschedule from your coaching page up to 24 hours before.""",
                            highlights=["Personal programming", "Technique review", "Weekly accountability"],
                            format_label="Live video sessions", duration_label="Weekly or fortnightly", position=41,
                            meta={"schedule": {"weekdays": [2, 3, 4, 5, 6], "times": ["07:00", "08:00", "09:00", "10:00", "11:00", "13:00", "14:00"], "timezone": "America/Los_Angeles"}}))
    for pos, (key, name, minutes, sessions, cents, summary, includes, featured) in enumerate(coaching_pkgs, 1):
        desc = summary + "\n\n" + "\n".join("- " + i for i in includes)
        pid = uid('coaching:' + key)
        # Another seed (0007 commerce offers) may already hold a package with this name and no program:
        # adopt it instead of creating a duplicate, and keep ours inactive.
        s.append(f"""update public.coaching_packages c set program_id = p.id, description = {q(desc)}, sessions = {sessions},
  duration_minutes = {minutes}, position = {pos}
from public.programs p where p.slug = 'coaching' and c.name = {q(name)} and c.program_id is null and c.id <> {pid};""")
        s.append(f"""insert into public.coaching_packages (id, program_id, name, description, sessions, duration_minutes, format, requires_application, is_active, position)
select {uid('coaching:' + key)}, p.id, {q(name)}, {q(desc)}, {sessions}, {minutes}, 'one_to_one', false, true, {pos}
from public.programs p where p.slug = 'coaching'
  and not exists (select 1 from public.coaching_packages o where o.name = {q(name)} and o.id <> {pid} and o.is_active)
on conflict (id) do update set name = excluded.name, description = excluded.description, sessions = excluded.sessions,
  duration_minutes = excluded.duration_minutes, position = excluded.position;
insert into public.prices (id, kind, ref_id, label, interval, amount_cents, currency, access_days, is_active, draft_note)
select {uid('price:coaching:' + key)}, 'coaching', c.id::text, {q(name + (' (recommended)' if featured else ''))}, 'one_time', {cents}, 'usd', null, true, 'Price awaiting Mike'
from public.coaching_packages c where c.name = {q(name)} and c.is_active
  and not exists (select 1 from public.prices x where x.kind = 'coaching' and x.ref_id = c.id::text and x.is_active)
on conflict (id) do nothing;""")
    s.append("")

    s.append("-- Executive Edge (coaching, by application, draft)")
    s.append(program_upsert("executive-edge", "Executive Edge", "coaching", "published",
                            tagline="A high-touch path for focus, energy and resilience",
                            summary="An eight-week, 60-day concept combining daily five-minute practices with three to four direct coaching interactions.",
                            description="""An eight-week, 60-day concept combining daily five-minute practices with three to four direct coaching interactions.

## The proposed rhythm
A focused daily practice supported by a small number of high-value coaching interactions.

- Daily five-minute homework
- Three to four direct interactions
- Personalized next actions""",
                            highlights=["Mental focus and energy", "Antifragility under pressure", "Personalized direct support"],
                            format_label="8 weeks / 60 days", duration_label="5 minutes daily + direct support",
                            draft_note="Concept preview — format and price ($4,500–$5,000) awaiting Mike", position=42,
                            meta={"requires_application": True, "price_label": "$4,500–$5,000 Draft"}))
    s.append(f"""insert into public.coaching_packages (id, program_id, name, description, sessions, duration_minutes, format, requires_application, is_active, position)
select {uid('coaching:executive-edge')}, p.id, 'Executive Edge', 'Eight weeks: daily five-minute practices plus three to four direct coaching interactions. By application.', 4, 60, 'one_to_one', true, true, 10
from public.programs p where p.slug = 'executive-edge'
on conflict (id) do update set description = excluded.description, requires_application = true;""")
    s.append("")

    s.append("-- The Grounded King (live, draft)")
    s.append(program_upsert("the-grounded-king", "The Grounded King", "live", "draft",
                            tagline="Strength, presence and nervous-system work",
                            summary="Mike's work on rebuilding a grounded, regulated body — breath, movement and mindset for men who want capacity that lasts beyond the gym.",
                            description="""Mike's work on rebuilding a grounded, regulated body — breath, movement and mindset for men who want capacity that lasts beyond the gym.

## What it is
Eight weeks of daily practice built around three pillars: breath mechanics, ground-based movement, and the inner work that keeps a man steady under load.

- Daily breath protocol, 10 minutes
- Ground flow and mobility sessions
- Weekly reflection and journalling prompts
- Strength work that scales to any equipment

## What changes
Better sleep, a slower resting heart rate, and the ability to hold your centre in conversations and situations that used to spike you.""",
                            highlights=["Breath and regulation", "Movement practice", "Mindset work"],
                            format_label="8-week guided program", duration_label="4 sessions a week",
                            draft_note="Format, dates and price awaiting Mike", position=43))
    s.append("")

    s.append("-- Zen Savage Challenge (challenge, published, draft run)")
    s.append(program_upsert("zen-savage", "Zen Savage Challenge", "challenge", "published",
                            tagline="A possible next chapter in group coaching",
                            summary="A stakeholder concept for balancing grounded awareness with decisive action.",
                            description="A stakeholder concept for balancing grounded awareness with decisive action. Its relationship to The Grounded King is still being decided.",
                            highlights=["Strength and stillness", "Guided group rhythm", "Identity-based practice"],
                            format_label="Four-week group challenge", duration_label="Jan 11 – Feb 7, 2027 (draft)",
                            draft_note="Concept — format, dates and pricing awaiting Mike", position=44))
    s.append(f"""insert into public.program_runs (id, program_id, name, starts_at, ends_at, timezone, capacity, status, requires_application, price_note, details, draft_note)
select {uid('run:zen-savage-2027')}, p.id, 'Zen Savage Challenge · Winter 2027', '2027-01-11T00:00:00-08:00', '2027-02-07T23:59:00-08:00',
  'America/Los_Angeles', null, 'draft', false, 'Pricing to be confirmed', {j({"format": "Four-week group challenge", "prerequisites": [], "packing": []})},
  'Dates and format awaiting Mike'
from public.programs p where p.slug = 'zen-savage'
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, draft_note = excluded.draft_note;""")
    s.append("")
    s.append("commit;")
    return "\n".join(s) + "\n"


if __name__ == "__main__":
    with open(os.path.join(HERE, "experiences.sql"), "w") as f:
        f.write(build())
    print("wrote experiences.sql")
