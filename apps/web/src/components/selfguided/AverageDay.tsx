"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { isFormComplete, resolveOutcome, scoreForm, type VideoRef } from "@ms/core";
import { AmbientBackdrop, Button, Glass, Icon } from "@/components/ui";
import { ReadinessDial } from "@/components/graphics";
import type { AverageDayData } from "@/lib/loaders/selfguided";
import { VideoStage } from "@/components/training/VideoStage";
import { CircuitTable } from "@/components/training/CircuitTable";
import { AVERAGE_BLOCKS, BAND_COPY } from "./averageDay";
import "@/components/training/day.css";
import "./selfguided.css";

type Clip = VideoRef & { title: string };

/**
 * "An average day in KBL" (legacy /self-guided/average-day): hero with jump chips, a readiness
 * walkthrough that adapts the example workout, then one block per part of the day — video,
 * notes and its associated videos. Built from the real Level I · Phase II · Workout III day.
 */
export function AverageDay({ data, slug }: { data: AverageDayData; slug: string }) {
  const { day, videos } = data;
  const form = day.form!;
  const qs = [...form.questions].sort((a, b) => a.position - b.position);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [i, setI] = useState(0);
  const [scored, setScored] = useState(false);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const result = useMemo(() => (isFormComplete(form, answers) ? resolveOutcome(form, scoreForm(form, answers)) : null), [form, answers]);
  const table = result?.tableId ? day.tables[result.tableId] ?? null : null;
  const q = qs[i]!;
  const blocks = AVERAGE_BLOCKS.map((b) => ({ b, step: day.steps.find((s) => b.step.test(s.title)) })).filter((x) => x.step);
  const jump = (id: string) => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const copy = result ? BAND_COPY[result.band] : null;

  return (
    <div className="sg-page">
      {day.program.media[0]?.url && <AmbientBackdrop src={day.lesson.image ?? day.program.media[0].url} fixed />}
      <Link href={`/programs/${slug}?mode=self-guided`} className="sg-link lq-t15" style={{ marginTop: 8 }}>
        <Icon name="back" size="sm" /> Self-Guided
      </Link>

      <Glass radius="hero" className="sg-avg-hero">
        <div className="sg-wrap">
          <span className="sg-intent" data-i="skill">
            Average day
          </span>
          <span className="sg-intent">{blocks.length} blocks</span>
          <span className="sg-intent">Readiness assessment included</span>
        </div>
        <h1 className="lq-t34">An average day in KBL.</h1>
        <p className="lq-t17 lq-c2 sg-measure">
          This is how a full training day runs, start to finish. Check in with your readiness first, then move through the morning routine, warm up, kettlebell prep, workout and stretching.
        </p>
        <p className="lq-t13 lq-c2">This example follows {[day.path?.shortName, day.section.title, "Workout III"].filter(Boolean).join(", ")}. Try the assessment to see how your answers adapt that workout.</p>
        <div className="sg-wrap" style={{ marginTop: 6 }}>
          {blocks.map(({ b }) => (
            <button key={b.id} type="button" className="sg-chip" onClick={() => jump(b.id)}>
              {b.title}
            </button>
          ))}
        </div>
      </Glass>

      {/* ---------------------------------------------------------- readiness walkthrough */}
      <Glass as="section" radius="hero" className="sg-avg-panel" aria-labelledby="sg-ready-h">
        <p className="sg-eyebrow">Before you train</p>
        <h2 id="sg-ready-h" className="lq-t28" style={{ margin: 0 }}>
          Training Readiness Assessment
        </h2>
        <p className="lq-t15 lq-c2" style={{ margin: 0 }}>
          Five honest questions. Your answers set the intensity for the rest of the day.
        </p>
        {!scored || !result ? (
          <div className="sg-stack sg-in" key={q.key}>
            <div className="sg-row">
              <span className="lq-progress" style={{ flex: 1 }} aria-hidden>
                <i style={{ display: "block", height: "100%", width: `${(i / qs.length) * 100}%`, background: "var(--accent)", borderRadius: 3, transition: "width .5s var(--curve-out)" }} />
              </span>
              <span className="lq-t12 lq-c2 sg-num">
                {i + 1} / {qs.length}
              </span>
            </div>
            <h3 className="lq-t20" style={{ margin: 0 }}>
              {q.prompt}
            </h3>
            <div className="sg-q" role="radiogroup" aria-label={q.prompt}>
              {q.options.map((o) => {
                const on = answers[q.key] === o.value;
                return (
                  <button key={o.value} type="button" className="sg-opt" role="radio" aria-checked={on} aria-pressed={on} onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))}>
                    <i>{on && <Icon name="check" />}</i>
                    {o.label}
                  </button>
                );
              })}
            </div>
            {q.note && <Consider note={q.note as { title?: string; body?: string; points?: string[] }} />}
            <div className="sg-row" style={{ gap: 10 }}>
              <Button
                size="md"
                iconAfter="chevron"
                disabled={!answers[q.key]}
                onClick={() => (i < qs.length - 1 ? setI(i + 1) : setScored(true))}
              >
                {i === qs.length - 1 ? "See my readiness" : "Next"}
              </Button>
              {i > 0 && (
                <Button size="md" variant="plain" icon="back" onClick={() => setI(i - 1)}>
                  Previous
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="sg-result sg-in">
            <ReadinessDial score={result.score} band={result.band} max={form.maxScore} size={180} />
            <div className="sg-stack" style={{ gap: 10 }}>
              <span className="sg-score" data-b={result.band} style={{ justifySelf: "start", height: 26, padding: "0 12px" }}>
                {copy!.pill}
              </span>
              <h3 className="lq-t22" style={{ margin: 0 }}>
                {result.name}
              </h3>
              <p className="lq-t15 lq-c2" style={{ margin: 0 }}>
                {result.message || (result.outcome === "workout" ? `Score ${result.score} of ${form.maxScore}. Fatigue: lower is better.` : "Rest is training too. Today's plan is gentler.")}
              </p>
              <ul className="sg-advice">
                {copy!.advice.map((a) => (
                  <li key={a}>
                    <Icon name="check" />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="sg-row" style={{ gap: 10, flexWrap: "wrap" }}>
                <Button size="md" iconAfter="chevron" onClick={() => jump(blocks[0]!.b.id)}>
                  Start the day
                </Button>
                <Button
                  size="md"
                  variant="plain"
                  icon="repeat"
                  onClick={() => {
                    setScored(false);
                    setI(0);
                    setAnswers({});
                  }}
                >
                  Retake
                </Button>
              </div>
            </div>
          </div>
        )}
        {scored && table && (
          <div className="sg-stack" style={{ gap: 8 }}>
            <p className="lq-t13 lq-c2" style={{ margin: 0 }}>
              Example workout: {[day.path?.shortName, day.section.title, day.lesson.title].filter(Boolean).join(" · ")}
            </p>
            <CircuitTable table={table} />
          </div>
        )}
        {!scored && isFormComplete(form, answers) && <p className="lq-t12 lq-c2">All five answered — jump ahead any time.</p>}
      </Glass>

      {/* ---------------------------------------------------------- day blocks */}
      <div className="sg-stack" style={{ marginTop: "var(--s-8)", gap: "var(--s-8)" }}>
        {blocks.map(({ b, step }, n) => {
          const own = (step!.clips as Clip[]).map((c) => ({ ...c, thumbnailUrl: c.thumbnailUrl ?? videos[c.providerId]?.thumbnailUrl ?? null }));
          const authored = (b.clips ?? []).map((id) => videos[id]).filter(Boolean) as Clip[];
          const clips = own.length ? own : authored;
          return (
            <section key={b.id} id={b.id} ref={(el) => void (refs.current[b.id] = el)} className="sg-block" aria-labelledby={`h-${b.id}`}>
              <div className="sg-measure">
                <p className="sg-eyebrow">{b.eyebrow}</p>
                <h2 id={`h-${b.id}`} className="lq-t28" style={{ margin: "4px 0" }}>
                  {b.title}
                </h2>
                <p className="lq-t15 lq-c2" style={{ margin: 0 }}>
                  {b.blurb}
                </p>
              </div>
              <Block step={step!} clips={clips} notes={b.notes} recommendation={b.recommendation} />
              {n < blocks.length - 1 && <hr className="sg-rule" style={{ margin: "var(--s-4) 0 0" }} />}
            </section>
          );
        })}
      </div>

      <Glass radius="card" className="sg-card" style={{ marginTop: "var(--s-8)", justifyItems: "start" }}>
        <p className="lq-t17" style={{ fontWeight: 650 }}>
          Ready to train it for real?
        </p>
        <p className="lq-t13 lq-c2">Open the full day with its check-in, table and progress.</p>
        <Button icon="play" href={`/programs/${slug}/session/open?lesson=${day.lesson.id}&key=${encodeURIComponent(day.lesson.key ?? day.lesson.id)}`}>
          Train {day.lesson.title.replace(/\s*-\s*.*/, "")}
        </Button>
      </Glass>
    </div>
  );
}

function Consider({ note }: { note: { title?: string; body?: string; points?: string[] } }) {
  return (
    <div className="sg-consider">
      <p className="lq-t15" style={{ fontWeight: 650, display: "flex", gap: 6, alignItems: "center" }}>
        <Icon name="sparkle" size="sm" /> {note.title ?? "Consider this"}
      </p>
      {note.body && <p className="lq-t13 lq-c2">{note.body}</p>}
      {note.points && (
        <ul>
          {note.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Block({ step, clips, notes, recommendation }: { step: AverageDayData["day"]["steps"][number]; clips: Clip[]; notes?: string; recommendation?: string[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const video = playing ? clips.find((c) => c.providerId === playing) ?? null : step.video ?? null;
  return (
    <div className="sg-block-body">
      <div className="sg-stack">
        {video ? (
          <div style={{ borderRadius: "var(--r-card)", overflow: "hidden" }}>
            <VideoStage key={video.providerId} video={video} poster={video.thumbnailUrl ?? step.poster ?? null} title={video.title ?? step.title} autoStart={Boolean(playing)} flush />
          </div>
        ) : (
          <Glass radius="card" className="sg-empty">
            <Icon name="play" />
            <p className="lq-t13 lq-c2">Pick a movement from the list to play its video.</p>
          </Glass>
        )}
        {(notes || recommendation) && (
          <div className="sg-notesbox">
            <p className="sg-eyebrow" data-tone="now">
              Notes
            </p>
            {notes && <p className="lq-t15 lq-c2">{notes}</p>}
            {recommendation && (
              <ol className="lq-t15">
                {recommendation.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
      {clips.length > 0 && (
        <aside className="sg-assoc" aria-label="Associated videos">
          <p className="sg-eyebrow">Associated videos</p>
          <div className="sg-assoc-list">
            {clips.map((c) => (
              <button key={c.providerId} type="button" className="sg-assoc-item" aria-pressed={playing === c.providerId} onClick={() => setPlaying(c.providerId)}>
                <span className="sg-assoc-th">{c.thumbnailUrl && <Image src={c.thumbnailUrl} alt="" fill sizes="96px" unoptimized={c.thumbnailUrl.startsWith("http")} />}</span>
                <span className="sg-assoc-t">
                  <span className="lq-t13 sg-ellipsis" style={{ fontWeight: 600 }}>
                    {c.title.trim()}
                  </span>
                  <span className="lq-t12 lq-c2">{playing === c.providerId ? "Playing" : "Play clip"}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
