"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Icon, Sheet, useToast } from "@/components/ui";
import type { LessonLite, ProgressRow } from "@/lib/loaders/training";
import type { LessonExtra } from "@/lib/loaders/selfguided";
import { logCompletionAction, saveDayNoteAction } from "@/lib/actions/selfguided";
import { dayTypeShort, lessonLabel, lessonName } from "@/components/training/model";
import { IntentTag } from "./parts";

/** One day's notes, completion count and "did it again" (repeats count each time). */
export function DaySheet({
  lesson, onClose, href, progress, count, note, extra, lessonWord, onNote, onLogged,
}: {
  lesson: LessonLite | null;
  onClose: () => void;
  href: string;
  progress: ProgressRow | undefined;
  count: number;
  note: string;
  extra: LessonExtra | undefined;
  lessonWord: string;
  onNote: (lessonId: string, body: string) => void;
  onLogged: (lessonId: string, count: number) => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState(note);
  const [saving, start] = useTransition();
  const [logging, startLog] = useTransition();
  useEffect(() => setBody(note), [note, lesson?.id]);
  if (!lesson) return <Sheet open={false} onClose={onClose} title="Day" />;
  const done = Boolean(progress?.complete);
  const title = lesson.pageType || lesson.dayNumber == null ? lesson.title : `${lessonLabel(lesson, lessonWord)} · ${lessonName(lesson)}`;

  const save = () =>
    start(async () => {
      const r = await saveDayNoteAction(lesson.id, body);
      if (r.ok) {
        onNote(lesson.id, body);
        toast("Note saved", { tone: "success" });
      } else toast(r.message);
    });
  const logAgain = () =>
    startLog(async () => {
      const r = await logCompletionAction(lesson.id);
      if (!r.ok) return toast(r.message);
      onLogged(lesson.id, r.count);
      toast(r.logged ? `Logged. You've done this ${lessonWord.toLowerCase()} ${r.count} times.` : "Already logged a moment ago.", { tone: "success" });
    });

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      description={[lesson.dayType ? dayTypeShort(lesson.dayType) : null, extra?.minutes ? `${extra.minutes} min` : null, progress ? `${progress.doneSteps} of ${progress.totalSteps} steps` : null].filter(Boolean).join(" · ")}
      detents={["medium", "large"]}
      footer={
        <Button block icon="play" href={href}>
          {done ? `Do ${lessonLabel(lesson, lessonWord)} again` : progress?.doneSteps ? `Resume ${lessonLabel(lesson, lessonWord)}` : `Open ${lessonLabel(lesson, lessonWord)}`}
        </Button>
      }
    >
      <div className="sg-sheet-sec">
        <div className="sg-wrap">
          {extra && <IntentTag intent={extra.intent} />}
          <span className="sg-intent">{done ? `Completed ${Math.max(count, 1)}×` : progress?.doneSteps ? "In progress" : "Not started"}</span>
        </div>
        {extra?.focus && <p className="lq-t15 lq-c2" style={{ margin: 0 }}>{extra.focus}</p>}
        {done && (
          <Button variant="fill" size="md" icon="repeat" onClick={logAgain} aria-busy={logging || undefined}>
            I did it again, log it
          </Button>
        )}
      </div>
      <div className="sg-sheet-sec">
        <label htmlFor="sg-note" className="lq-t15" style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="bookmark" size="sm" /> Your notes for this {lessonWord.toLowerCase()}
        </label>
        <textarea id="sg-note" className="sg-textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Weights used, how it felt, what to change next time…" />
        <div className="sg-row" style={{ justifyContent: "space-between" }}>
          <span className="lq-t12 lq-c3 sg-num">{body.length}/4000</span>
          <Button size="sm" variant="glass" onClick={save} disabled={body === note} aria-busy={saving || undefined}>
            Save note
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
