"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { stagePlaylist, type ReadinessOutcome } from "@ms/core";
import { AmbientBackdrop, Button, Chip, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { DayGlyph, ReadinessDial } from "@/components/graphics";
import type { LessonPageData, PlayerStep } from "@/lib/loaders/training";
import { savePositionAction, submitReadinessAction } from "@/lib/actions/training";
import { dayGlyph, dayTypeShort, lessonHref, lessonLabel, lessonName, minutesOf } from "./model";
import { VideoStage } from "./VideoStage";
import { ClipRow } from "./ClipRow";
import { WorkoutPanel } from "./WorkoutPanel";
import { ReadinessSheet, zonesFor } from "./ReadinessSheet";
import "./training.css";

type Ready = { score: number; band: "green" | "amber" | "red"; name: string; outcome: "workout" | "recovery" | "rest"; tableId: string | null; message: string; answers: Record<string, string> };

/** Self-Guided day: all steps stacked, sticky step chips with scroll-spy, readiness and table, prev/next day. */
export function SelfGuidedDay({ data }: { data: LessonPageData }) {
  const { program, path, lesson, steps, section, outline, form, tables } = data;
  const toast = useToast();
  const word = program.lessonLabel || "Day";
  const [activeId, setActiveId] = useState(steps[0]?.id ?? "");
  const chips = useRef<HTMLDivElement>(null);
  const [readyOpen, setReadyOpen] = useState(false);
  const [ready, setReady] = useState<Ready | null>(() =>
    data.readiness ? { score: data.readiness.score, band: data.readiness.band, name: data.readiness.bandName, outcome: data.readiness.outcome, tableId: data.readiness.tableId, message: form?.bands.find((b) => b.name === data.readiness!.bandName)?.message ?? "", answers: data.readiness.answers } : null,
  );
  const table = ready
    ? data.readiness?.prescription && data.readiness.score === ready.score
      ? data.readiness.prescription
      : ready.tableId
        ? tables[ready.tableId] ?? null
        : null
    : !form && lesson.starterTableId
      ? tables[lesson.starterTableId] ?? null
      : null;

  // Scroll-spy: the chip for the step in view lights up and scrolls into the chip row.
  useEffect(() => {
    const els = steps.map((s) => document.getElementById(`step-${s.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActiveId(vis.target.id.slice(5));
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [steps]);
  useEffect(() => {
    chips.current?.querySelector<HTMLElement>(`[data-id="${activeId}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  async function submit(answers: Record<string, string>, p: ReadinessOutcome) {
    setReady({ score: p.score, band: p.band, name: p.name, outcome: p.outcome, tableId: p.tableId, message: p.message, answers });
    const r = await submitReadinessAction(lesson.id, answers);
    if (!r.ok && r.code !== "offline") {
      toast(r.message);
      return false;
    }
    if (!r.ok) toast("Today's table is ready. Your answers save when you're back online.");
    else toast("Readiness saved", { tone: "success" });
    return true;
  }

  const ord = outline.findIndex((l) => l.id === lesson.id);
  const prev = ord > 0 ? outline[ord - 1] : null;
  const next = ord >= 0 ? outline[ord + 1] ?? null : null;
  const programHref = `/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`;
  const glyph = dayGlyph(lesson.dayType, lesson.pageType);
  const minutes = minutesOf(steps.map((s) => s.durationLabel));
  const backdrop = lesson.image ?? steps.find((s) => s.poster)?.poster ?? program.media[0]?.url ?? null;

  return (
    <div className="trn-guide">
      {backdrop && <AmbientBackdrop src={backdrop} fixed className="trn-ambient" />}
      <div className="trn-prog-top">
        <IconButton icon="back" label={`Back to ${program.name}`} href={programHref} />
        <Chip variant="glass" icon="compass">
          Self-Guided
        </Chip>
      </div>

      <header className="trn-guide-head">
        <span className="trn-guide-glyph" aria-hidden>
          <DayGlyph type={glyph} size={36} strokeWidth={1.5} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="lq-t13 lq-c2 trn-eyebrow">{[lessonLabel(lesson, word), section.title, path?.shortName].filter(Boolean).join(" · ")}</p>
          <h1 className="lq-t34">{lesson.pageType ? lesson.title : lessonName(lesson)}</h1>
          <p className="lq-t15 lq-c2 lq-num">
            {steps.length} steps{minutes ? ` · about ${minutes} min` : ""}
            {lesson.dayType && !lesson.pageType ? ` · ${dayTypeShort(lesson.dayType)}` : ""}
          </p>
        </div>
      </header>

      <div className="trn-chips lq-glass" ref={chips} role="navigation" aria-label="Steps">
        {steps.map((s, i) => (
          <a key={s.id} href={`#step-${s.id}`} data-id={s.id} className="trn-chip" aria-current={activeId === s.id ? "true" : undefined}>
            <span className="lq-num">{i + 1}</span>
            {s.title}
          </a>
        ))}
      </div>

      <div className="trn-guide-steps">
        {steps.map((s, i) => (
          <GuideStep
            key={s.id}
            step={s}
            index={i}
            total={steps.length}
            fallbackPoster={lesson.image}
            glyph={glyph}
            readiness={s.special === "readiness" && form ? (
              <Glass radius="card" className="trn-gatecard">
                {ready ? (
                  <>
                    <ReadinessDial score={ready.score} band={ready.band} max={form.maxScore} zones={zonesFor(form)} size={200} />
                    <div>
                      <p className="lq-t22">{ready.name}</p>
                      {ready.message && <p className="lq-t15 lq-c2">{ready.message}</p>}
                    </div>
                    <Button variant="fill" size="md" icon="repeat" onClick={() => setReadyOpen(true)}>
                      Review answers
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="lq-t17">Five honest questions set today&apos;s workout</p>
                      <p className="lq-t13 lq-c2">Takes about a minute.</p>
                    </div>
                    <Button size="md" icon="play" onClick={() => setReadyOpen(true)}>
                      Start check-in
                    </Button>
                  </>
                )}
              </Glass>
            ) : null}
            table={s.special === "workout" ? (
              table ? (
                <WorkoutPanel table={table} band={ready?.name ?? null} score={ready?.score ?? null} />
              ) : ready && ready.outcome !== "workout" ? (
                <Glass radius="card" className="trn-gatecard">
                  <p className="lq-t17">{ready.outcome === "rest" ? "Today is for rest." : "Today is for recovery."}</p>
                  {ready.message && <p className="lq-t15 lq-c2">{ready.message}</p>}
                </Glass>
              ) : form ? (
                <Glass radius="card" className="trn-gatecard" data-locked="">
                  <span className="trn-gatecard-ic" aria-hidden>
                    <Icon name="lock" size="sm" />
                  </span>
                  <div>
                    <p className="lq-t17">Your table unlocks after the check-in</p>
                    <p className="lq-t13 lq-c2">Five quick questions pick the right load for today.</p>
                  </div>
                  <Button size="md" icon="play" onClick={() => setReadyOpen(true)}>
                    Start check-in
                  </Button>
                </Glass>
              ) : null
            ) : null}
          />
        ))}
      </div>

      <nav className="trn-guide-days" aria-label="Other days">
        {prev ? (
          <Link href={lessonHref(program.slug, prev.key, prev.id, "self_guided")} className="trn-guide-day lq-glass">
            <Icon name="back" size="sm" />
            <span>
              <span className="lq-t13 lq-c2">Previous</span>
              <b className="lq-t15 trn-ellipsis">{lessonLabel(prev, word)}</b>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={lessonHref(program.slug, next.key, next.id, "self_guided")} className="trn-guide-day lq-glass" data-next="">
            <span>
              <span className="lq-t13 lq-c2">Next</span>
              <b className="lq-t15 trn-ellipsis">{lessonLabel(next, word)}</b>
            </span>
            <Icon name="chevron" size="sm" />
          </Link>
        )}
      </nav>

      {form && (
        <ReadinessSheet
          open={readyOpen}
          onClose={() => setReadyOpen(false)}
          form={form}
          initial={data.position?.draftAnswers ?? {}}
          saved={ready ? { ...ready } : null}
          onDraft={(a) => void savePositionAction(lesson.id, { draftAnswers: a })}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function GuideStep({ step, index, total, fallbackPoster, glyph, readiness, table }: { step: PlayerStep; index: number; total: number; fallbackPoster: string | null; glyph: ReturnType<typeof dayGlyph>; readiness: React.ReactNode; table: React.ReactNode }) {
  const [clipId, setClipId] = useState<string | null>(null);
  const pl = stagePlaylist(step, clipId);
  const video = clipId ? pl.queue.find((c) => c.providerId === clipId) ?? null : pl.lead;
  return (
    <section id={`step-${step.id}`} className="trn-gstep" aria-labelledby={`h-${step.id}`}>
      <p className="lq-t13 lq-c2 lq-num" style={{ fontWeight: 600 }}>
        Step {index + 1} of {total}
        {step.durationLabel ? ` · ${step.durationLabel}` : ""}
      </p>
      <h2 id={`h-${step.id}`} className="lq-t22">
        {step.title}
      </h2>
      {video && (
        <VideoStage key={video.providerId} video={video} poster={video.thumbnailUrl ?? step.poster ?? fallbackPoster} title={video.title ?? step.title} autoStart={Boolean(clipId)} onEnded={() => pl.nextClip && setClipId(pl.nextClip.providerId)}>
          <div className="trn-stage-inner">
            <DayGlyph type={glyph} size={56} tone="mono" />
          </div>
        </VideoStage>
      )}
      <ClipRow clips={pl.queue} playingId={clipId ?? pl.playingClipId} nextId={pl.nextClip?.providerId} glyph={glyph} onPlay={setClipId} label={`${step.title} clips`} />
      {readiness}
      {table}
      {step.special === "completion" && (
        <Glass radius="card" className="trn-gatecard">
          <p className="lq-t17">{step.body || "You've crushed another day"}</p>
        </Glass>
      )}
      {step.body && step.special !== "completion" && (
        <Glass radius="card" className="trn-notes">
          {step.body
            .replace(/^NOTES:\s*/i, "")
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((p, i) => (
              <p key={i} className="lq-t15">
                {p}
              </p>
            ))}
        </Glass>
      )}
    </section>
  );
}
