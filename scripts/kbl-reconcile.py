"""Reconcile the Kettlebell Lifestyle master export with the app's curriculum copy.

Reads the untouched master export, patches src/content/immersion-source.json
(restores Completion steps, carries Let's Begin into the day intro, tags
static Starter Workout tables) and writes the static tables file. It never
writes to the master export. Run: python3 scripts/kbl-reconcile.py <master.json>
"""
import json, re, sys, html

MASTER = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-uploads/kettlebell-lifestyle-master.json"
SRC = "src/content/immersion-source.json"
TABLES = "src/content/starter-workout-tables.json"
IMG = json.load(open("src/content/hosted-image-map.json"))["byUrl"]

m = json.load(open(MASTER))
app = json.load(open(SRC))
LEVEL_KEY = {"beginner": "l1", "intermediate": "l2"}
LETS = {"Let's Begin", "Let’s Begin"}


def strip(h):
    return html.unescape(re.sub(r"<[^>]+>", " ", h or "")).replace("\xa0", " ").strip()


def block_html(lesson):
    return "".join(b.get("html", "") for b in lesson.get("blocks", []) if b.get("type") == "text-editor") or lesson.get("contentHtml", "")


def table_id(lesson):
    for b in lesson.get("blocks", []):
        if b.get("tableId"):
            return str(b["tableId"])
    return None


for level in m["immersion"]["levels"]:
    key = LEVEL_KEY[level["courseId"]]
    for sp, ap in zip(level["phases"], app[key]):
        assert len(sp["days"]) == len(ap["days"]), (key, ap["id"])
        for sd, ad in zip(sp["days"], ap["days"]):
            by_id = {l["id"]: l for l in ad["lessons"]}
            rebuilt = []
            ad.pop("letsBegin", None)
            for sl in sorted(sd["lessons"], key=lambda l: l.get("order", 0)):
                if sl["title"] in LETS:
                    img = next((b.get("url") for b in sl.get("blocks", []) if b.get("type") == "image"), None)
                    ad["letsBegin"] = {
                        "sourceLessonId": sl["id"],
                        "html": block_html(sl),
                        "image": IMG.get(img, img) if img else None,
                    }
                    continue
                if sl["id"] in by_id:
                    live = dict(by_id[sl["id"]])
                elif sl["title"] == "Completion":
                    live = {
                        "id": sl["id"],
                        "title": "Completion",
                        "kind": "lifestyle",
                        "special": "completion",
                        "notes": strip(block_html(sl)),
                    }
                else:
                    raise SystemExit(f"unmapped source lesson {sl['id']} {sl['title']}")
                tid = table_id(sl)
                if tid:
                    live["tableId"] = tid
                rebuilt.append(live)
            ad["lessons"] = rebuilt

json.dump(app, open(SRC, "w"), ensure_ascii=False, separators=(",", ":"))

# Static Starter Workout tables -> app WorkoutTable shape
out = {}
for tid, t in m["selfGuided"]["workoutTables"].items():
    rows = []
    for r in t["cells"][1:]:
        rest_txt = strip(r[2])
        rows.append({
            "circuit": "C1",
            "exercise": strip(r[1]),
            "rest": rest_txt,
            "restDir": "up" if rest_txt else "down",
            "intensity": strip(r[3]),
            "reps": strip(r[4]),
            "sets": strip(r[5]),
            "tempo": strip(r[6]),
        })
    out[tid] = {"id": f"static-{tid}", "title": t["title"], "rows": rows}
json.dump(out, open(TABLES, "w"), ensure_ascii=False, indent=1)
print("ok")
