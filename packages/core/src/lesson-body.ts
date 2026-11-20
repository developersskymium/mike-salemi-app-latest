/**
 * Lesson content for the course player (port of legacy `parseContent()` in
 * src/routes/_authenticated/courses.$courseSlug.tsx) plus a tiny, safe markdown parser.
 *
 * The importer and every client agree on the same split:
 *   - Vimeo links in the body become extra clips ("Technique breakdowns")
 *   - download links (…/download/…, .mp3 .m4a .wav .pdf .doc(x) .zip) become resources
 *   - audio resources (title or url says audio/mp3/meditation) get audio cards
 *   - direct .mp4 files ("Lesson video (legacy host)") become the lesson video
 *   - lines that only repeated those links are removed from the reading body
 * Pure and platform-neutral: no React, no DOM. Renderers walk the `MdBlock` tree.
 */

export type ResourceKind = "audio" | "file" | "link";

export interface LessonResource {
  title: string;
  url: string;
  kind: ResourceKind;
}

export interface BodyClip {
  title: string;
  providerId: string;
  privacyHash: string | null;
}

export interface LessonBody {
  /** Markdown left for reading (links already shown as cards removed). */
  body: string;
  audio: LessonResource[];
  files: LessonResource[];
  clips: BodyClip[];
  /** A direct video file (legacy host .mp4) when the lesson has no Vimeo video. */
  directVideo: { url: string; title: string } | null;
}

export interface Attachment {
  title: string;
  url: string;
  kind?: string | null;
}

const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]{6,}))?/i;
const DOWNLOAD_RE = /\/download\/|\.(mp3|m4a|wav|pdf|docx?|zip)(\?|#|$)/i;
const AUDIO_RE = /audio|\.mp3|\.m4a|\.wav|meditation/i;
const VIDEO_FILE_RE = /\.(mp4|m4v|mov|webm)(\?|#|$)/i;

/** "Eagle_Breath (Audio Only)" → "Eagle Breath"; "Download: Suggested Schedule" → "Suggested Schedule". */
export function prettyResourceTitle(t: string): string {
  return t
    .replace(/_/g, " ")
    .replace(/\s*\((audio only|audio)\)/i, "")
    .replace(/^download:\s*/i, "")
    .replace(/\.(pdf|docx?|zip|mp3|m4a|wav)$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function classifyResource(title: string, url: string, kind?: string | null): ResourceKind {
  if (kind === "audio" || AUDIO_RE.test(`${title} ${url}`)) return "audio";
  if (kind === "link") return DOWNLOAD_RE.test(url) ? "file" : "link";
  if (kind === "file" || DOWNLOAD_RE.test(url)) return "file";
  return "link";
}

/** Split a lesson's markdown and attachments into body, audio, files, clips and a direct video. */
export function parseLessonBody(md: string | null | undefined, attachments: Attachment[] = []): LessonBody {
  const source = md ?? "";
  const resources: LessonResource[] = [];
  const clips: BodyClip[] = [];
  let directVideo: LessonBody["directVideo"] = null;

  const add = (title: string, url: string, kind?: string | null) => {
    if (VIDEO_FILE_RE.test(url)) {
      if (!directVideo) directVideo = { url, title };
      return;
    }
    if (resources.some((r) => r.url === url)) return;
    resources.push({ title: title.trim() || url, url, kind: classifyResource(title, url, kind) });
  };

  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(source))) {
    const title = m[1]!;
    const url = m[2]!;
    if (source[m.index - 1] === "!") continue; // image
    const v = VIMEO_RE.exec(url);
    if (v) {
      if (!clips.some((c) => c.providerId === v[1])) clips.push({ title: title.trim(), providerId: v[1]!, privacyHash: v[2] ?? null });
      continue;
    }
    if (DOWNLOAD_RE.test(url) || VIDEO_FILE_RE.test(url)) add(title, url);
  }
  for (const a of attachments) if (a?.url) add(a.title ?? "", a.url, a.kind);

  const titles = new Set([...resources.map((r) => r.title.trim()), ...clips.map((c) => c.title.trim())]);
  const body = source
    .split("\n")
    .filter((line) => {
      const t = line.trim().replace(/^[-*]\s+/, "");
      if (!t) return true;
      if (titles.has(t)) return false;
      if (VIMEO_RE.test(t) && !t.includes("](")) return false;
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
      if (link && (titles.has(link[1]!.trim()) || VIMEO_RE.test(link[2]!) || resources.some((r) => r.url === link[2]))) return false;
      return true;
    })
    .join("\n")
    .replace(/\*\*Resources\*\*\s*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    body,
    audio: resources.filter((r) => r.kind === "audio"),
    files: resources.filter((r) => r.kind !== "audio"),
    clips,
    directVideo,
  };
}

/* ------------------------------------------------------------------ markdown */

export type MdInline =
  | { t: "text"; v: string }
  | { t: "strong"; c: MdInline[] }
  | { t: "em"; c: MdInline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: MdInline[] }
  | { t: "br" };

export type MdBlock =
  | { t: "h"; level: 1 | 2 | 3 | 4; c: MdInline[] }
  | { t: "p"; c: MdInline[] }
  /** A paragraph that is only bold text: rendered as a small sub-heading (legacy rule). */
  | { t: "lead"; c: MdInline[] }
  | { t: "ul" | "ol"; start?: number; items: MdInline[][] }
  | { t: "quote"; c: MdBlock[] }
  | { t: "img"; src: string; alt: string }
  | { t: "hr" }
  | { t: "table"; head: MdInline[][]; rows: MdInline[][][] };

const SAFE_URL = /^(https?:|mailto:|tel:|\/(?!\/)|#)/i;

/** Only http(s), mailto, tel, site-relative and hash links survive. */
export function safeUrl(u: string): string | null {
  const s = u.trim();
  return SAFE_URL.test(s) ? s : null;
}

/** Inline markdown: **bold**, *em* / _em_, `code`, [links](url), bare URLs, hard breaks. */
export function parseInline(src: string): MdInline[] {
  const out: MdInline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let mm: RegExpExecArray | null;
    if ((mm = /^\*\*([\s\S]+?)\*\*/.exec(rest)) || (mm = /^__([\s\S]+?)__/.exec(rest))) {
      flush();
      out.push({ t: "strong", c: parseInline(mm[1]!) });
      i += mm[0].length;
      continue;
    }
    if ((mm = /^\*(?!\s)([^*]+?)\*/.exec(rest)) || (mm = /^_(?!\s)([^_]+?)_(?![a-z0-9])/i.exec(rest))) {
      const prev = src[i - 1];
      if (!(rest[0] === "_" && prev && /[a-z0-9]/i.test(prev))) {
        flush();
        out.push({ t: "em", c: parseInline(mm[1]!) });
        i += mm[0].length;
        continue;
      }
    }
    if ((mm = /^`([^`]+)`/.exec(rest))) {
      flush();
      out.push({ t: "code", v: mm[1]! });
      i += mm[0].length;
      continue;
    }
    if ((mm = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest))) {
      flush();
      const href = safeUrl(mm[2]!);
      if (href) out.push({ t: "link", href, c: parseInline(mm[1]!) });
      else out.push(...parseInline(mm[1]!));
      i += mm[0].length;
      continue;
    }
    if ((mm = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/.exec(rest)) && !/[a-z0-9]/i.test(src[i - 1] ?? "")) {
      flush();
      out.push({ t: "link", href: mm[0], c: [{ t: "text", v: mm[0].replace(/^https?:\/\/(www\.)?/, "") }] });
      i += mm[0].length;
      continue;
    }
    if (rest.startsWith("  \n") || rest.startsWith("\\\n")) {
      flush();
      out.push({ t: "br" });
      i += rest.startsWith("  \n") ? 3 : 2;
      continue;
    }
    text += src[i] === "\n" ? " " : src[i];
    i += 1;
  }
  flush();
  return out;
}

const isOnlyStrong = (c: MdInline[]) => {
  const parts = c.filter((n) => !(n.t === "text" && !n.v.trim()));
  return parts.length === 1 && parts[0]!.t === "strong";
};

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => parseInline(c.trim()));

/** Block markdown: headings, paragraphs, lists, quotes, images, rules and pipe tables. */
export function parseMarkdown(md: string): MdBlock[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.trim();
    if (!t) {
      i += 1;
      continue;
    }
    let mm: RegExpExecArray | null;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push({ t: "hr" });
      i += 1;
      continue;
    }
    if ((mm = /^(#{1,6})\s+(.*?)\s*#*$/.exec(t))) {
      blocks.push({ t: "h", level: Math.min(4, mm[1]!.length) as 1 | 2 | 3 | 4, c: parseInline(mm[2]!) });
      i += 1;
      continue;
    }
    if ((mm = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.exec(t))) {
      const src = safeUrl(mm[2]!);
      if (src) blocks.push({ t: "img", src, alt: mm[1]!.replace(/_/g, " ") });
      i += 1;
      continue;
    }
    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        buf.push(lines[i]!.trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ t: "quote", c: parseMarkdown(buf.join("\n")) });
      continue;
    }
    if (t.startsWith("|") && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1]!.trim())) {
      const head = cells(t);
      i += 2;
      const rows: MdInline[][][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        rows.push(cells(lines[i]!));
        i += 1;
      }
      blocks.push({ t: "table", head, rows });
      continue;
    }
    const ul = /^[-*+]\s+/;
    const ol = /^(\d+)[.)]\s+/;
    if (ul.test(t) || ol.test(t)) {
      const ordered = ol.test(t);
      const re = ordered ? ol : ul;
      const start = ordered ? Number(ol.exec(t)![1]) : undefined;
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]!.trim();
        if (!l) {
          // a blank line between items keeps the list going
          const nxt = lines[i + 1]?.trim() ?? "";
          if (re.test(nxt)) {
            i += 1;
            continue;
          }
          break;
        }
        if (re.test(l)) items.push(l.replace(re, ""));
        else if (/^\s{2,}/.test(lines[i]!) && items.length) items[items.length - 1] += ` ${l}`;
        else break;
        i += 1;
      }
      blocks.push(ordered ? { t: "ol", start, items: items.map(parseInline) } : { t: "ul", items: items.map(parseInline) });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i]!;
      const lt = l.trim();
      if (!lt || /^(#{1,6})\s/.test(lt) || /^[-*+]\s+/.test(lt) || /^\d+[.)]\s+/.test(lt) || lt.startsWith(">") || /^!\[/.test(lt) || /^(-{3,}|\*{3,})$/.test(lt)) break;
      buf.push(l.replace(/^\s+/, ""));
      i += 1;
    }
    if (!buf.length) {
      i += 1;
      continue;
    }
    const c = parseInline(buf.join("\n"));
    blocks.push(isOnlyStrong(c) ? { t: "lead", c: (c.find((n) => n.t === "strong") as { c: MdInline[] }).c } : { t: "p", c });
  }
  return blocks;
}

/** Plain text of inline nodes (search, previews, accessible names). */
export function inlineText(c: MdInline[]): string {
  return c.map((n) => (n.t === "text" || n.t === "code" ? n.v : n.t === "br" ? " " : inlineText(n.c))).join("");
}
