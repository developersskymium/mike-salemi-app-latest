"use client";

import { Markdown } from "@/components/course/LessonBody";

/** Lesson / step bodies are markdown (images, rules, **bold**, lists, links) in courses and tools; KBL days are plain lines. */
const MARKDOWN = /(\*\*|__|!\[[^\]]*\]\(|\[[^\]]+\]\(|^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*(-{3,}|\*{3,}|_{3,})\s*$|^>)/m;

function clean(body: string | null | undefined): string {
  return (body ?? "").replace(/^\s*NOTES:\s*/i, "").trim();
}

/** Plain-text notes as lines, minus a line that only repeats the step title. */
function linesOf(body: string, title: string): string[] {
  const t = title.trim().toLowerCase();
  return body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && l.toLowerCase() !== t);
}

/** True when a step has notes worth a card. */
export function hasNotes(body: string | null | undefined, title: string): boolean {
  const b = clean(body);
  if (!b) return false;
  return MARKDOWN.test(b) || linesOf(b, title).length > 0;
}

/**
 * Mike's notes for a step: markdown renders as markdown (images, rules, bold, lists — never as raw
 * symbols), plain notes keep one paragraph per line as before.
 */
export function NotesBody({ body, title }: { body: string | null | undefined; title: string }) {
  const b = clean(body);
  if (!b) return null;
  if (MARKDOWN.test(b)) {
    return (
      <div className="kd-notes kd-notes-md">
        <Markdown source={b} hide={new Set([title])} />
      </div>
    );
  }
  const lines = linesOf(b, title);
  if (!lines.length) return null;
  return (
    <div className="kd-notes">
      {lines.map((l, i) => (
        <p key={i} className="lq-t15">
          {l}
        </p>
      ))}
    </div>
  );
}
