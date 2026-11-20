"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { saveDayNoteAction } from "@/lib/actions/selfguided";
import "./lesson-b.css";

/** Older notes kept a reflection after this marker in the lesson's day note (day_notes, read by You › Journal). */
const MARK = "\n\n— Reflection: ";

export function splitNote(body: string | null | undefined): { notes: string; reflection: { q: string; a: string } | null } {
  const b = body ?? "";
  const i = b.indexOf(MARK);
  if (i < 0) return { notes: b, reflection: null };
  const rest = b.slice(i + MARK.length);
  const nl = rest.indexOf("\n");
  return { notes: b.slice(0, i), reflection: { q: nl < 0 ? rest : rest.slice(0, nl), a: nl < 0 ? "" : rest.slice(nl + 1) } };
}
/** Old notes saved with a separate reflection read back as one block of text. */
export function mergeNote(body: string | null | undefined): string {
  const { notes, reflection } = splitNote(body);
  if (!reflection || !reflection.a.trim()) return notes;
  return [notes.trim(), `${reflection.q}\n${reflection.a}`].filter(Boolean).join("\n\n");
}

type Status = "idle" | "saving" | "saved" | "error";

/* Drafts survive a remount (the notes panel moves between the side column and the lesson column). */
const drafts = new Map<string, string>();

/** Mike's key points (3–5) for the lesson column. */
export function KeyPointsB({ lessonId, points }: { lessonId: string; points: string[] }) {
  if (!points.length) return null;
  return (
    <section className="lb-points" aria-labelledby={`lb-pts-${lessonId}`}>
      <p className="lb-h" id={`lb-pts-${lessonId}`}>Mike's key points</p>
      <ul>
        {points.map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}
      </ul>
    </section>
  );
}

/**
 * "Your notes": one private box per lesson (notes and reflection merged). Autosaves as you type to
 * the lesson's day note, which You › Journal reads. The lesson's reflection question is a gentle prompt.
 */
export function YourNotes({ lessonId, initial, question }: { lessonId: string; initial: string | null; question: string | null }) {
  const [text, setText] = useState(() => drafts.get(lessonId) ?? mergeNote(initial));
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);

  const save = async (body: string) => {
    try {
      window.localStorage.setItem(`lesson-note:${lessonId}`, body);
    } catch {}
    setStatus("saving");
    const r = await saveDayNoteAction(lessonId, body).catch(() => null);
    setStatus(r && (r.ok || r.code === "offline") ? "saved" : "error");
    dirty.current = false;
  };
  const queue = (body: string) => {
    dirty.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(body), 900);
  };
  // No server note yet (preview, offline save): pick up this device's copy after hydration.
  useEffect(() => {
    if (initial || drafts.has(lessonId)) return;
    try {
      const local = window.localStorage.getItem(`lesson-note:${lessonId}`) ?? window.localStorage.getItem(`ms-note:${lessonId}`);
      if (local) setText(mergeNote(local));
    } catch {}
  }, [initial, lessonId]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <section className="lb-mine" aria-labelledby={`lb-n-${lessonId}`}>
      <div className="lb-row">
        <label className="lb-h" id={`lb-n-${lessonId}`} htmlFor={`lb-ta-${lessonId}`}>Your notes</label>
        <span className="lb-status" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Kept on this device" : "Private"}</span>
      </div>
      {question && <p className="lb-prompt"><Icon name="leaf" size="xs" /><span><b>Prompt:</b> {question}</span></p>}
      <textarea
        id={`lb-ta-${lessonId}`}
        className="lb-area"
        rows={7}
        value={text}
        maxLength={4000}
        placeholder="What do you want to remember? Only you see this."
        onChange={(e) => {
          setText(e.target.value);
          drafts.set(lessonId, e.target.value);
          queue(e.target.value);
        }}
        onBlur={() => {
          if (dirty.current) {
            if (timer.current) window.clearTimeout(timer.current);
            void save(text);
          }
        }}
      />
      <div className="lb-row">
        <span className="lb-status">Saves as you type</span>
        <a href="/you#yc-jr" className="lb-link">All notes →</a>
      </div>
    </section>
  );
}

/** Mike's key points from a lesson body: bullet lines, else short bold lines (3–5), minus video titles. */
export function keyPoints(body: string | null | undefined, hide: Set<string>): string[] {
  if (!body) return [];
  const lines = body.split("\n").map((l) => l.trim());
  const clean = (s: string) => s.replace(/\*\*|__|\*|_/g, "").replace(/\[(.+?)\]\(.+?\)/g, "$1").trim();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const hidden = new Set([...hide].map(norm));
  const ok = (s: string) => s.length > 3 && s.length < 140 && !hidden.has(norm(s)) && !/^https?:/.test(s);
  const bullets = lines.filter((l) => /^([-*•]|\d+[.)])\s+/.test(l)).map((l) => clean(l.replace(/^([-*•]|\d+[.)])\s+/, ""))).filter(ok);
  if (bullets.length >= 2) return bullets.slice(0, 5);
  const bold = lines.filter((l) => /^\*\*[^*]+\*\*:?$/.test(l)).map(clean).filter(ok);
  return bold.length >= 2 ? bold.slice(0, 5) : [];
}
