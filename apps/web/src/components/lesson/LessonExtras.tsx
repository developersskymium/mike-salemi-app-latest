"use client";

/**
 * Shared lesson-page pieces (spec 12, Lesson page ideas 4–10), reusable by every program's lesson
 * view: resume pill, "Next in 5s" countdown, Mike's key points, private autosaving notes,
 * downloadable chips, audio-only toggle and an optional reflection that lands in You › Journal.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { saveDayNoteAction } from "@/lib/actions/selfguided";
import "./lesson.css";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** "Resumed at 4:12" for two seconds. */
export function ResumedPill({ seconds }: { seconds: number }) {
  const [show, setShow] = useState(seconds > 8);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 2200);
    return () => window.clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return <span className="lx-resumed" role="status"><Icon name="play" size="xs" />Resumed at {clock(seconds)}</span>;
}

/** After the video is watched (and the lesson auto-completed): "Next in 5s · Cancel". */
export function NextCountdown({ title, onGo, onCancel, seconds = 5 }: { title: string; onGo: () => void; onCancel: () => void; seconds?: number }) {
  const [left, setLeft] = useState(seconds);
  const go = useRef(onGo);
  useEffect(() => {
    go.current = onGo;
  });
  useEffect(() => {
    if (left <= 0) {
      go.current();
      return;
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return (
    <div className="lx-next" role="status" aria-live="polite">
      <span className="lx-next-ring lq-num" aria-hidden>{left}</span>
      <span className="lx-next-c"><small>Lesson complete · next in {left}s</small><b>{title}</b></span>
      <button type="button" className="lx-btn" onClick={onCancel}>Cancel</button>
      <button type="button" className="lx-btn" data-primary="" onClick={() => go.current()}>Play now</button>
    </div>
  );
}

/** 3–5 bullets from the lesson body (its own list items, else its bold sub-heads). */
export function keyPointsOf(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const clean = (s: string) => s.replace(/\*\*|__|\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  const bullets = markdown
    .split("\n")
    .map((l) => l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)$/)?.[1] ?? null)
    .filter((l): l is string => Boolean(l) && !/^\[?download|https?:\/\//i.test(l!) && !/\]\(http/.test(l!))
    .map(clean)
    .filter((l) => l.length > 3 && l.length < 160);
  if (bullets.length >= 2) return bullets.slice(0, 5);
  const bold = [...markdown.matchAll(/^\s*\*\*([^*]{4,90})\*\*\s*$/gm)].map((m) => clean(m[1]!));
  return bold.length >= 2 ? bold.slice(0, 5) : [];
}

export function KeyPoints({ points }: { points: string[] }) {
  if (points.length < 2) return null;
  return (
    <section className="lx-card lx-points" aria-labelledby="lx-points-h">
      <p id="lx-points-h" className="lx-eyebrow">Mike's key points</p>
      <ul>{points.map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}</ul>
    </section>
  );
}

const noteKey = (id: string) => `ms-note:${id}`;
const JOURNAL = "ms-journal";

/** Private notes for this lesson: autosave (debounced) to the server, mirrored on the device. */
export function LessonNotes({ lessonId, initial }: { lessonId: string; initial?: string | null }) {
  const [body, setBody] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "local">("idle");
  const first = useRef(true);
  useEffect(() => {
    if (initial) return;
    try {
      const v = window.localStorage.getItem(noteKey(lessonId));
      if (v) setBody(v);
    } catch {}
  }, [lessonId, initial]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      window.localStorage.setItem(noteKey(lessonId), body);
    } catch {}
    setState("saving");
    const t = window.setTimeout(async () => {
      const r = await saveDayNoteAction(lessonId, body).catch(() => null);
      setState(r && r.ok ? "saved" : "local");
    }, 900);
    return () => window.clearTimeout(t);
  }, [body, lessonId]);
  return (
    <section className="lx-card lx-notes">
      <div className="lx-row">
        <label htmlFor={`lx-n-${lessonId}`} className="lx-eyebrow">My notes · private</label>
        <span className="lx-save" aria-live="polite">{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "local" ? "Saved on this device" : ""}</span>
      </div>
      <textarea id={`lx-n-${lessonId}`} value={body} onChange={(e) => setBody(e.target.value.slice(0, 4000))} placeholder="Cues that clicked, weights used, what to try next time…" rows={3} />
    </section>
  );
}

/** One optional reflection question; the answer goes to You › Journal. */
export function Reflection({ lessonId, lessonTitle, program, question }: { lessonId: string; lessonTitle: string; program: string; question: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const entry = { lessonId, lessonTitle, program, question, answer: text.trim(), at: new Date().toISOString() };
    if (!entry.answer) return;
    try {
      const list = JSON.parse(window.localStorage.getItem(JOURNAL) ?? "[]") as unknown[];
      window.localStorage.setItem(JOURNAL, JSON.stringify([entry, ...list].slice(0, 200)));
    } catch {}
    // Server copy rides on the lesson's private note so it syncs across devices.
    let note = "";
    try {
      note = window.localStorage.getItem(noteKey(lessonId)) ?? "";
    } catch {}
    await saveDayNoteAction(lessonId, `${note ? `${note}\n\n` : ""}Reflection — ${question}\n${entry.answer}`.slice(0, 4000)).catch(() => null);
    setSaved(true);
  };
  if (saved) return <p className="lx-card lx-reflect-done"><Icon name="check" size="xs" />Saved to your Journal.</p>;
  return (
    <section className="lx-card lx-reflect">
      {!open ? (
        <button type="button" className="lx-reflect-q" onClick={() => setOpen(true)}>
          <span className="lx-eyebrow">Reflect · optional</span>
          <b>{question}</b>
          <Icon name="chevron" size="xs" />
        </button>
      ) : (
        <>
          <label className="lx-eyebrow" htmlFor={`lx-r-${lessonId}`}>Reflect · optional</label>
          <b className="lx-reflect-t">{question}</b>
          <textarea id={`lx-r-${lessonId}`} rows={3} value={text} onChange={(e) => setText(e.target.value.slice(0, 1500))} autoFocus />
          <div className="lx-row">
            <button type="button" className="lx-btn" onClick={() => setOpen(false)}>Not now</button>
            <button type="button" className="lx-btn" data-primary="" disabled={!text.trim()} onClick={() => void save()}>Save to Journal</button>
          </div>
        </>
      )}
    </section>
  );
}

export function DownloadChips({ items }: { items: { title: string; url: string; kind?: string | null }[] }) {
  if (!items.length) return null;
  return (
    <div className="lx-chips" role="list" aria-label="Downloads">
      {items.map((r) => (
        <a key={r.url} role="listitem" href={r.url} target="_blank" rel="noreferrer" className="lx-chip lq-press">
          <Icon name={r.kind === "link" ? "external" : "download"} size="xs" />
          <span>{r.title.replace(/^download:\s*/i, "")}</span>
        </a>
      ))}
    </div>
  );
}

/** Audio-only: the player collapses to a slim bar and keeps playing. */
export function AudioOnlyToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="lx-tog" aria-pressed={on} onClick={() => onChange(!on)}>
      <Icon name={on ? "video" : "speaker"} size="xs" />
      {on ? "Show video" : "Audio only"}
    </button>
  );
}

/** A reflection question that fits the lesson. */
export function reflectionFor(program: string, title: string) {
  if (/check.?in/i.test(title)) return "What felt stronger this week, and what still feels hard?";
  if (/common errors|fault/i.test(title)) return "Which of these errors do you catch yourself making?";
  if (/day\s*\d+/i.test(title)) return "How did your body feel today, from 1 to 10, and why?";
  if (/mastering/i.test(program)) return "What's one cue you'll take into your next session?";
  return "What's one thing you'll do differently after this lesson?";
}
