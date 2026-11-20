"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { saveDayNoteAction } from "@/lib/actions/selfguided";
import "./lesson-b.css";

/** Notes and the reflection share the lesson's private day note (day_notes, read by You › Journal). */
const MARK = "\n\n— Reflection: ";

export function splitNote(body: string | null | undefined): { notes: string; reflection: { q: string; a: string } | null } {
  const b = body ?? "";
  const i = b.indexOf(MARK);
  if (i < 0) return { notes: b, reflection: null };
  const rest = b.slice(i + MARK.length);
  const nl = rest.indexOf("\n");
  return { notes: b.slice(0, i), reflection: { q: nl < 0 ? rest : rest.slice(0, nl), a: nl < 0 ? "" : rest.slice(nl + 1) } };
}
const joinNote = (notes: string, q: string | null, a: string) => (q && a.trim() ? `${notes}${MARK}${q}\n${a}` : notes);

type Status = "idle" | "saving" | "saved" | "error";

/** Mike's key points (3–5), private autosaving notes, and an optional reflection question → Journal. */
export function NotesB({ lessonId, points, initial, question }: { lessonId: string; points: string[]; initial: string | null; question: string | null }) {
  const seed = splitNote(initial);
  const [notes, setNotes] = useState(seed.notes);
  const [answer, setAnswer] = useState(seed.reflection?.a ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [savedReflection, setSavedReflection] = useState(Boolean(seed.reflection?.a));
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);

  const save = async (n: string, a: string) => {
    const body = joinNote(n, question, a);
    try {
      window.localStorage.setItem(`lesson-note:${lessonId}`, body);
    } catch {}
    setStatus("saving");
    const r = await saveDayNoteAction(lessonId, body);
    setStatus(r.ok || r.code === "offline" ? "saved" : "error");
    dirty.current = false;
  };
  const queue = (n: string, a: string) => {
    dirty.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(n, a), 900);
  };
  // No server note yet (preview, offline save): pick up this device's copy after hydration.
  useEffect(() => {
    if (initial) return;
    try {
      const local = splitNote(window.localStorage.getItem(`lesson-note:${lessonId}`));
      if (local.notes) setNotes(local.notes);
      if (local.reflection?.a) (setAnswer(local.reflection.a), setSavedReflection(true));
    } catch {}
  }, [initial, lessonId]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <div className="lb-notes">
      {points.length > 0 && (
        <section className="lb-points" aria-labelledby={`lb-pts-${lessonId}`}>
          <p className="lb-h" id={`lb-pts-${lessonId}`}>Mike's key points</p>
          <ul>
            {points.map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}
          </ul>
        </section>
      )}

      {question && (
        <section className="lb-reflect" aria-labelledby={`lb-rq-${lessonId}`}>
          <p className="lb-h" id={`lb-rq-${lessonId}`}><Icon name="leaf" size="xs" /> Reflection · optional</p>
          <p className="lb-q">{question}</p>
          <textarea
            className="lb-area"
            rows={3}
            value={answer}
            placeholder="A few honest lines. Only you see this."
            onChange={(e) => {
              setAnswer(e.target.value);
              setSavedReflection(false);
            }}
          />
          <div className="lb-row">
            <button
              type="button"
              className="lb-btn"
              disabled={!answer.trim() || savedReflection}
              onClick={async () => {
                await save(notes, answer);
                setSavedReflection(true);
              }}
            >
              {savedReflection ? "Saved to your Journal" : "Save to Journal"}
            </button>
            <a href="/you" className="lb-link">Open Journal</a>
          </div>
        </section>
      )}

      <section className="lb-mine" aria-labelledby={`lb-n-${lessonId}`}>
        <div className="lb-row">
          <p className="lb-h" id={`lb-n-${lessonId}`}>My notes</p>
          <span className="lb-status" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved, kept on this device" : "Private · saves as you type"}</span>
        </div>
        <textarea
          className="lb-area"
          rows={4}
          value={notes}
          maxLength={3500}
          placeholder="What do you want to remember from this?"
          onChange={(e) => {
            setNotes(e.target.value);
            queue(e.target.value, savedReflection ? answer : "");
          }}
          onBlur={() => {
            if (dirty.current) {
              if (timer.current) window.clearTimeout(timer.current);
              void save(notes, savedReflection ? answer : "");
            }
          }}
        />
      </section>
    </div>
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
