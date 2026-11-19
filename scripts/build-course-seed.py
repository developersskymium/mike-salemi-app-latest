"""Convert Mike Salemi course exports (schema 2.x) into SQL for the app's tables.

Data model (see src/lib/courses.functions.ts):
  programs -> program_sections (subtitle = group title) -> program_lessons
  each lesson -> one program_sublessons row (main video + markdown content)
  extra videos -> sublesson_videos (vimeo id kept as "id/hash" for private videos)
The course "Home" page becomes section 1 and is recorded as meta.introSectionId.
"""
import json, os, re, sys, uuid, glob, html as htmlmod
from bs4 import BeautifulSoup, NavigableString, Tag

UP = os.environ.get("COURSE_EXPORT_DIR", "./course-exports/")
NS = uuid.UUID("6f1c2f4e-1d0a-4c55-9a51-3c0d6e2b7a11")
ASSETS = "src/assets/programs/"

COURSES = [
    # (file glob, slug, sort, type, hero asset, status)
    ("*mastering-the-kettlebell-complete-import.json", "mastering-the-kettlebell", 1, "recorded", "mastering-the-kettlebell.png", "published"),
    ("*the-training-room-complete-import.json", "the-training-room", 2, "recorded", "the-training-room.png", "published"),
    ("*athleticism-4-life-complete-import.json", "athleticism-4-life", 3, "recorded", "athleticism-4-life.png", "published"),
    ("*the-path-to-inspired-action-hybrid-import.json", "the-path-to-inspired-action", 4, "recorded", "path-to-inspired-action.png", "published"),
    ("*working-in-with-paul-chek-and-mike-salemi-complete-import.json", "working-in", 5, "recorded", "working-in.png", "published"),
    ("*men-of-movement-complete-import.json", "men-of-movement", 6, "retreat", "men-of-movement.png", "published"),
    ("*kettlebell-roadmap-complete-import.json", "kettlebell-roadmap", 7, "recorded", "kettlebell-roadmap.png", "published"),
    ("*what-your-kettlebell-swing-is-missing-complete-import.json", "what-your-kettlebell-swing-is-missing", 8, "recorded", "what-your-kettlebell-swing-is-missing.png", "published"),
    ("*free-6-video-kettlebell-mini-series-complete-import.json", "free-6-video-kettlebell-mini-series", 9, "recorded", "free-6-video-kettlebell-mini-series.png", "published"),
    ("*essential-kettlebell-training-strength-course.json", "essential-kettlebell-training-strength", 10, "recorded", None, "draft"),
]

VIMEO = re.compile(r"vimeo\.com/(?:manage/videos/|video/)?(\d+)(?:/([0-9a-f]{6,}))?", re.I)


def vimeo_ref(url_or_block):
    if isinstance(url_or_block, dict):
        b = url_or_block
        vid = b.get("vimeo_id")
        h = b.get("privacy_hash")
        if not vid:
            m = VIMEO.search(b.get("url", "") or b.get("embed_url", ""))
            if not m:
                return b.get("url") or None  # direct file video (mp4)
            vid, h = m.group(1), m.group(2)
        if not h:
            m = re.search(r"[?&]h=([0-9a-f]+)", b.get("embed_url", "") or "")
            h = m.group(1) if m else None
        return f"{vid}/{h}" if h else str(vid)
    m = VIMEO.search(url_or_block or "")
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2)}" if m.group(2) else m.group(1)


# ---------------------------------------------------------------- HTML -> MD
def md_inline(node, extra):
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            out.append(re.sub(r"\s+", " ", str(ch)))
            continue
        if not isinstance(ch, Tag):
            continue
        name = ch.name
        inner = md_inline(ch, extra)
        if name in ("strong", "b"):
            t = inner.strip()
            out.append(f"**{t}**" if t else "")
            if inner.endswith(" "):
                out.append(" ")
        elif name in ("em", "i"):
            t = inner.strip()
            out.append(f"*{t}*" if t else "")
        elif name == "a":
            href = (ch.get("href") or "").strip()
            text = inner.strip()
            ref = vimeo_ref(href) if "vimeo.com" in href else None
            if ref:
                # Private Vimeo links play in the lesson's video list (keeps the hash).
                extra.append((text or "Video", ref))
                out.append(text)
            elif href and text:
                out.append(f"[{text}]({href})")
            elif href:
                out.append(f"<{href}>")
            else:
                out.append(text)
        elif name == "br":
            out.append("  \n")
        elif name == "img":
            src = ch.get("src")
            if src:
                out.append(f"![{ch.get('alt','')}]({src})")
        elif name in ("ul", "ol", "p", "div", "h1", "h2", "h3", "h4", "h5", "h6"):
            out.append("\n" + md_block(ch, extra) + "\n")
        else:
            out.append(inner)
    return "".join(out)


def md_list(node, extra, depth):
    lines = []
    ordered = node.name == "ol"
    i = 0
    for li in node.find_all("li", recursive=False):
        i += 1
        text_parts, sub = [], []
        for ch in li.children:
            if isinstance(ch, Tag) and ch.name in ("ul", "ol"):
                sub.append(md_list(ch, extra, depth + 1))
            else:
                wrapper = BeautifulSoup("<span></span>", "html.parser").span
                wrapper.append(ch.__copy__() if isinstance(ch, Tag) else NavigableString(str(ch)))
                text_parts.append(md_inline(wrapper, extra))
        text = re.sub(r"\s*\n\s*", " ", "".join(text_parts)).strip()
        bullet = f"{i}." if ordered else "-"
        lines.append("  " * depth + f"{bullet} {text}")
        lines.extend(s for s in sub if s)
    return "\n".join(lines)


def md_block(node, extra):
    blocks = []
    buf = []

    def flush():
        t = "".join(buf).strip()
        if t:
            blocks.append(t)
        buf.clear()

    for ch in node.children:
        if isinstance(ch, Tag) and ch.name in ("ul", "ol"):
            flush()
            blocks.append(md_list(ch, extra, 0))
        elif isinstance(ch, Tag) and ch.name in ("p", "div"):
            flush()
            blocks.append(md_block(ch, extra))
        elif isinstance(ch, Tag) and re.fullmatch(r"h[1-6]", ch.name):
            flush()
            t = md_inline(ch, extra).strip().strip("*").strip()
            if t:
                blocks.append(f"### {t}")
        else:
            wrapper = BeautifulSoup("<span></span>", "html.parser").span
            wrapper.append(ch.__copy__() if isinstance(ch, Tag) else NavigableString(str(ch)))
            buf.append(md_inline(wrapper, extra))
    flush()
    return "\n\n".join(b for b in blocks if b.strip())


def html_to_md(html_src, extra):
    if not html_src or not html_src.strip():
        return ""
    soup = BeautifulSoup(html_src.replace("​", ""), "html.parser")
    md = md_block(soup, extra)
    md = htmlmod.unescape(md).replace("\xa0", " ")
    md = re.sub(r"[ \t]+\n", "\n", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


# ---------------------------------------------------------------- lessons
def convert_lesson(lesson):
    """Return (main_video, markdown, extra_videos[(title, ref)])."""
    videos, parts, extra = [], [], []
    last_heading = None
    blocks = sorted(lesson.get("content_blocks") or [], key=lambda b: b.get("order", 0))
    if not blocks:  # schema 1.x fallback
        for v in lesson.get("videos", []):
            r = vimeo_ref(v)
            if r:
                videos.append((lesson.get("title"), r))
        if lesson.get("content_markdown") or lesson.get("content"):
            parts.append(lesson.get("content_markdown") or lesson.get("content"))
    for b in blocks:
        t = b.get("type")
        if t == "video":
            r = vimeo_ref(b)
            if r:
                videos.append((last_heading or lesson.get("title"), r))
            last_heading = None
        elif t == "video_gallery":
            for it in sorted(b.get("items", []), key=lambda x: x.get("order", 0)):
                r = vimeo_ref(it)
                if r:
                    videos.append(((it.get("title") or "Video").strip(), r))
        elif t in ("rich_text",):
            if b.get("format") == "markdown":
                md = (b.get("content") or "").strip()
                for m in re.finditer(r"\[([^\]]*)\]\((https?://[^)\s]*vimeo\.com[^)\s]*)\)", md):
                    r = vimeo_ref(m.group(2))
                    if r:
                        extra.append((m.group(1) or "Video", r))
            else:
                md = html_to_md(b.get("html") or "", extra)
            if md:
                parts.append(md)
                plain = re.sub(r"[*#_`]", "", md).strip()
                last_heading = plain if len(plain) < 80 and "\n" not in plain else None
        elif t == "callout":
            body = html_to_md(b.get("html") or "", extra)
            title = (b.get("title") or "").strip()
            parts.append((f"**{title}**\n\n" if title else "") + body)
        elif t == "image":
            for im in b.get("images") or ([{"url": b.get("url")}] if b.get("url") else []):
                if im.get("url"):
                    parts.append(f"![{im.get('alt','')}]({im['url']})")
        elif t in ("files", "file"):
            items = b.get("items") or [b]
            for it in items:
                if it.get("url"):
                    parts.append(f"- [{(it.get('title') or it.get('text') or 'Download').strip()}]({it['url']})")
        elif t == "audio":
            if b.get("url"):
                parts.append(f"- [{(b.get('title') or 'Audio').replace('_', ' ')}]({b['url']})")
        elif t == "external_link":
            if b.get("url"):
                parts.append(f"[{(b.get('title') or b['url']).strip()}]({b['url']})")
        elif t == "divider":
            parts.append("---")
        elif t == "lesson_link":
            pass  # in-course navigation buttons; the app's lesson list covers this
    md = "\n\n".join(p for p in parts if p and p.strip())
    md = re.sub(r"(\n\n---)+\s*$", "", md)
    md = re.sub(r"^(---\n\n)+", "", md)
    md = re.sub(r"(\n\n---){2,}", "\n\n---", md).strip()
    main = videos[0][1] if videos else None
    extras = videos[1:] + extra
    seen, uniq = {main}, []
    for title, ref in extras:
        if ref not in seen:
            seen.add(ref)
            uniq.append((title[:200], ref))
    return main, md, uniq


# ---------------------------------------------------------------- structure
def course_structure(course):
    """Yield (group_title or None, section_title, [lessons])."""
    out = []
    if "modules" in course:  # GoHighLevel export
        for m in course["modules"]:
            out.append((None, m["title"], [
                {"title": l["title"], "id": str(i), "content_blocks": [
                    *([{"order": 0, "type": "video", "url": l["primary_video"]["url"]}] if (l.get("primary_video") or {}).get("url") else []),
                    {"order": 1, "type": "rich_text", "format": "html", "html": l.get("content_html") or ""},
                ]} for i, l in enumerate(m["lessons"])
            ]))
        return out
    for g in sorted(course.get("groups") or [], key=lambda g: g.get("order", 0)):
        if g.get("lessons"):
            out.append((None, g["title"], sorted(g["lessons"], key=lambda l: l.get("order", 0))))
        for s in sorted(g.get("sections") or [], key=lambda s: s.get("order", 0)):
            out.append((g["title"], s["title"], sorted(s["lessons"], key=lambda l: l.get("order", 0))))
    for s in sorted(course.get("sections") or [], key=lambda s: s.get("order", 0)):
        out.append((None, s["title"], sorted(s["lessons"], key=lambda l: l.get("order", 0))))
    return out


def localize(text):
    """Point images at the self-hosted copies in public/media (see scripts/media-manifest.json).
    New image URLs must be added to the manifest so the download workflow fetches them."""
    if not text:
        return text
    text = text.replace("/__l5e/assets-v1/", "/media/l5e/")
    text = re.sub(r"https://d11n7da8rpqbjy\.cloudfront\.net(/[^\s)\"'<>\]]+?\.(?:png|jpe?g|gif|webp|svg))", r"/media/ext/d11n7da8rpqbjy\1", text, flags=re.I)
    text = re.sub(r"https://storage\.googleapis\.com(/[^\s)\"'<>\]]+?\.(?:png|jpe?g|gif|webp|svg))", r"/media/ext/storage-googleapis-com\1", text, flags=re.I)
    return text


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def hero_url(name):
    if not name:
        return None
    return json.load(open(ASSETS + name + ".asset.json"))["url"]


def build():
    mtk_meta = json.load(open("src/content/mtk-lesson-meta.json"))
    mtk_ids = {(m["s"], m["q"]): m["id"] for m in mtk_meta}
    sql, report = ["begin;"], []
    for pattern, slug, sort, ptype, hero, status in COURSES:
        path = glob.glob(UP + pattern)[0]
        doc = json.load(open(path))
        c = doc["course"]
        pid = str(uuid.uuid5(NS, f"program:{slug}"))
        sections = course_structure(c)
        home = c.get("home")
        sec_rows, les_rows, sub_rows, vid_rows = [], [], [], []
        seq = 1
        intro_id = None
        if home:
            intro_id = str(uuid.uuid5(NS, f"{slug}:section:home"))
            sections = [(None, home.get("title") or "Home", [dict(home, title=home.get("title") or "Home", id="home")])] + sections
        stats = {"sections": 0, "lessons": 0, "videos": 0, "no_video": 0}
        for s_index, (group, title, lessons) in enumerate(sections):
            is_home = home is not None and s_index == 0
            sid = intro_id if is_home else str(uuid.uuid5(NS, f"{slug}:section:{s_index}:{title}"))
            sec_rows.append((sid, pid, title.strip(), group, seq))
            for l_index, lesson in enumerate(lessons, start=1):
                if slug == "mastering-the-kettlebell" and (seq, l_index) in mtk_ids:
                    lid = mtk_ids[(seq, l_index)]
                else:
                    lid = str(uuid.uuid5(NS, f"{slug}:lesson:{seq}:{l_index}:{lesson.get('id','')}"))
                main, md, extras = convert_lesson(lesson)
                les_rows.append((lid, sid, lesson["title"].strip(), l_index))
                sub_id = str(uuid.uuid5(NS, f"{lid}:sub"))
                sub_rows.append((sub_id, lid, lesson["title"].strip(), main, localize(md), bool(extras)))
                for v_index, (vt, ref) in enumerate(extras, start=1):
                    vid_rows.append((str(uuid.uuid5(NS, f"{sub_id}:v:{v_index}")), sub_id, vt, ref, v_index))
                stats["lessons"] += 1
                stats["videos"] += (1 if main else 0) + len(extras)
                stats["no_video"] += 0 if main else 1
            seq += 1
            stats["sections"] += 1
        if slug == "mastering-the-kettlebell":
            assert len(les_rows) == len(mtk_meta), (len(les_rows), len(mtk_meta))
            assert all(r[0] in {m["id"] for m in mtk_meta} for r in les_rows)
        meta = {"instructor": "Mike Salemi", "highlights": c.get("highlights") or []}
        if intro_id:
            meta["introSectionId"] = intro_id
        sql.append(f"delete from public.programs where slug = {q(slug)};")
        sql.append(
            "insert into public.programs (id, slug, name, type, status, summary, description, hero_image_url, "
            "included_in_subscription, price_cents, sort_order, meta) values ("
            f"{q(pid)}, {q(slug)}, {q(c['title'].strip())}, {q(ptype)}, {q(status)}, {q(c.get('tagline'))}, "
            f"{q(c.get('short_description'))}, {q(localize(hero_url(hero)))}, true, 0, {sort}, {q(meta)});"
        )
        for chunk_rows, table, cols in [
            (sec_rows, "program_sections", "id, program_id, title, subtitle, sequence"),
            (les_rows, "program_lessons", "id, section_id, title, sequence"),
            (sub_rows, "program_sublessons", "id, lesson_id, title, vimeo_id, content, has_associated_videos"),
            (vid_rows, "sublesson_videos", "id, sublesson_id, title, vimeo_id, sequence"),
        ]:
            for i in range(0, len(chunk_rows), 200):
                vals = ",\n".join("(" + ", ".join(q(v) for v in row) + ")" for row in chunk_rows[i:i + 200])
                sql.append(f"insert into public.{table} ({cols}) values\n{vals};")
        report.append((slug, status, stats))
    sql.append("commit;")
    return "\n".join(sql), report


if __name__ == "__main__":
    text, report = build()
    open(sys.argv[1] if len(sys.argv) > 1 else "course-seed.sql", "w").write(text)
    for r in report:
        print(r)
    print(len(text) // 1024, "KB SQL")
