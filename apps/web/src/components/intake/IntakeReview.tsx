"use client";

import Image from "next/image";
import Link from "next/link";
import { LevelEmblem } from "@/components/graphics";
import { Button } from "@/components/ui";
import type { IntakeAttempt, IntakePageData } from "@/lib/loaders/course";

interface Props {
  data: IntakePageData;
  attempt: IntakeAttempt;
  attempts: number;
  onReview: () => void;
  onFresh: () => void;
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
);
const Close = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
);

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Every answered question with the label of the chosen option(s). */
function Answers({ data, attempt }: Pick<Props, "data" | "attempt">) {
  const rows = data.form.steps.flatMap((s) =>
    s.questions.flatMap((q) => {
      const v = attempt.answers[q.id];
      if (v == null || (Array.isArray(v) && !v.length) || v === "") return [];
      const label = (x: string) => q.options?.find((o) => o.value === x)?.label ?? x;
      return [{ id: q.id, q: q.label, a: Array.isArray(v) ? v.map(label).join(", ") : label(String(v)) }];
    }),
  );
  if (!rows.length) return null;
  return (
    <details className="itk-answers">
      <summary>Your answers <span>{rows.length}</span></summary>
      <dl>{rows.map((r) => <div key={r.id}><dt>{r.q}</dt><dd>{r.a}</dd></div>)}</dl>
    </details>
  );
}

/** "Your program approach" (legacy review): headline, priorities, keep in mind, Open program / Review answers / Start fresh. */
export function IntakeReview({ data, attempt, attempts, onReview, onFresh }: Props) {
  const r = attempt.result;
  const open = data.program.type === "course" ? `/programs/${data.program.slug}/course` : `/programs/${data.program.slug}`;
  return (
    <div className="itk-page">
      <div className="itk-page-in">
        <div className="itk-page-top">
          <p className="itk-eyebrow" data-tone="accent">{data.program.name}</p>
          <Link href={open} className="itk-back" aria-label="Close"><Close /></Link>
        </div>
        <h1>Your program approach</h1>
        <div className="itk-approach">
          {data.program.image && <Image src={data.program.image} alt="" fill sizes="(min-width: 700px) 672px, 100vw" priority />}
          <div className="itk-approach-in">
            <small>Your anchor</small>
            <p>{r.headline ?? "Your intake is complete."}</p>
          </div>
        </div>
        {r.priorities?.length ? (
          <ul className="itk-list">{r.priorities.map((p) => <li key={p}><Tick />{p}</li>)}</ul>
        ) : null}
        {r.caution && <p className="itk-keep"><b>Keep in mind:</b> {r.caution}</p>}
        <div className="itk-acts">
          <Button href={open}>Open program</Button>
          <Button variant="glass" icon="repeat" onClick={onReview}>Review answers</Button>
          <Button variant="plain" onClick={onFresh}>Start fresh</Button>
        </div>
        <p className="itk-meta">Attempt {attempts} · saved {when(attempt.createdAt)}. Earlier attempts are kept.</p>
        <Answers data={data} attempt={attempt} />
      </div>
    </div>
  );
}

/** Kettlebell Lifestyle intake result (legacy onboarding result): course pill, level emblem, headline, summary, priorities, Start Level →. */
export function KblResult({ data, attempt, attempts, onReview, onFresh }: Props) {
  const r = attempt.result;
  const key = (r.path_key as string | undefined) ?? "beginner";
  const level = key === "intermediate" ? 2 : 1;
  const notes = (r.notes as string[] | undefined) ?? [];
  const label = (r.label as string | undefined) ?? (level === 2 ? "Level II — Intermediate" : "Level I — Beginner");
  return (
    <div className="itk-page">
      <div className="itk-page-in itk-result">
        <div className="itk-page-top">
          <div className="itk-pills">
            <span className="itk-pill" data-tone="accent"><Tick /> Your plan</span>
            <span className="itk-pill">{label}</span>
          </div>
          <Link href={`/programs/${data.program.slug}`} className="itk-back" aria-label="Close"><Close /></Link>
        </div>
        <div className="itk-emblem"><LevelEmblem level={level} size={112} label={label} /></div>
        <h1>{(r.headline as string | undefined) ?? `You’re starting at Level ${level === 2 ? "II" : "I"}`}</h1>
        {r.summary && <p className="itk-sub">{r.summary as string}</p>}
        {notes.length > 0 && <ul className="itk-list">{notes.map((p) => <li key={p}><Tick />{p}</li>)}</ul>}
        <div className="itk-acts">
          <Button href={`/programs/${data.program.slug}?path=${encodeURIComponent(key)}`}>Start Level {level === 2 ? "II" : "I"}</Button>
          <Button variant="glass" icon="repeat" onClick={onReview}>Review answers</Button>
          <Button variant="plain" onClick={onFresh}>Start fresh</Button>
        </div>
        <p className="itk-meta">Attempt {attempts} · saved {when(attempt.createdAt)}. You can change level any time on the program page.</p>
        <div className="itk-wide"><Answers data={data} attempt={attempt} /></div>
      </div>
    </div>
  );
}
