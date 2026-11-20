"use client";

import { announceProgress } from "@/components/you/CelebrationHost";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { stagePlaylist, type ReadinessOutcome } from "@ms/core";
import { Button, Icon, IconButton, useToast } from "@/components/ui";
import { Completion } from "@/components/graphics";
import type { LessonPageData, PlayerStep } from "@/lib/loaders/training";
import { savePositionAction, submitReadinessAction } from "@/lib/actions/training";
import { lessonHref, lessonLabel, lessonName } from "./model";
import { VideoStage } from "./VideoStage";
import { ReadinessAssessment, WorkoutTablePanel, type Readiness } from "./Readiness";
import { SessionAutoStart } from "@/components/selfguided/SessionAutoStart";
import "./training.css";
import "./day.css";

/**
 * Self-Guided day, as in the original app: a sticky context bar with a chip per lesson
 * (scroll-spy), the day intro with "Let's begin", then every lesson stacked — its meta on
 * the left, notes, video, readiness form, workout table and exercise demos on the right —
 * and previous / next day cards.
 */
export function SelfGuidedDay({ data }: { data: LessonPageData }) {
  const { program, path, lesson, steps, section, outline, form, tables } = data;
  const toast = useToast();
  const word = program.lessonLabel || "Day";
  const [activeId, setActiveId] = useState(steps[0]?.id ?? "");
  const chips = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<Readiness | null>(() =>
    data.readiness
      ? { score: data.readiness.score, band: data.readiness.band, name: data.readiness.bandName, outcome: data.readiness.outcome, tableId: data.readiness.tableId, message: form?.bands.find((b) => b.name === data.readiness!.bandName)?.message ?? "", answers: data.readiness.answers, saved: true, prescription: data.readiness.prescription }
      : null,
  );
  const table = ready
    ? ready.prescription ?? (ready.tableId ? tables[ready.tableId] ?? null : null)
    : !form && lesson.starterTableId
      ? tables[lesson.starterTableId] ?? null
      : null;

  // Scroll-spy: the chip for the lesson in view lights up and scrolls into the chip row.
  useEffect(() => {
    const els = steps.map((s) => document.getElementById(`lesson-${s.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActiveId(vis.target.id.slice(7));
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [steps]);
  useEffect(() => {
    chips.current?.querySelector<HTMLElement>(`[data-id="${activeId}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  async function submit(answers: Record<string, string>, p: ReadinessOutcome) {
    const before = ready;
    setReady({ score: p.score, band: p.band, name: p.name, outcome: p.outcome, tableId: p.tableId, message: p.message, answers, saved: false });
    const r = await submitReadinessAction(lesson.id, answers); announceProgress();
    if (!r.ok && r.code !== "offline") {
      toast(r.message);
      setReady(before);
      return false;
    }
    if (r.ok) setReady((x) => (x ? { ...x, saved: true } : x));
    toast(r.ok ? "Readiness logged — your workout table is ready." : "Today's table is ready. Your answers save when you're back online.");
    return true;
  }

  const ord = outline.findIndex((l) => l.id === lesson.id);
  const prev = ord > 0 ? outline[ord - 1] ?? null : null;
  const next = ord >= 0 ? outline[ord + 1] ?? null : null;
  const programHref = `/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`;
  const dayName = lesson.pageType ? lesson.title : lessonName(lesson);
  const meta = [path?.shortName, section.title].filter(Boolean).join(" · ");

  return (
    <div className="kd-guide">
      <SessionAutoStart lessonId={lesson.id} />
      <div className="kd-ctx lq-glass">
        <div className="kd-ctx-row">
          <IconButton icon="back" label={`Back to ${program.name}`} href={programHref} variant="fill" size="sm" iconSize="sm" />
          <div className="kd-ctx-t">
            <p className="lq-t15 kd-ellipsis" style={{ fontWeight: 650 }}>
              {dayName}
            </p>
            <p className="lq-t12 lq-c2 kd-ellipsis">{meta}</p>
          </div>
          <span className="lq-t13 lq-c2 lq-num kd-sm">{steps.length} lessons</span>
        </div>
        <nav className="kd-chips" ref={chips} aria-label="Jump to a part of this day">
          {steps.map((s) => (
            <a key={s.id} href={`#lesson-${s.id}`} data-id={s.id} className="kd-chip" aria-current={activeId === s.id ? "true" : undefined}>
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      <header className="kd-guide-intro">
        <p className="kd-eyebrow">{[path?.shortName, section.title, lessonLabel(lesson, word)].filter(Boolean).join(" · ")}</p>
        <h1 className="lq-t34">{dayName}</h1>
        {lesson.focus && <p className="lq-t17 lq-c2 kd-lede">{lesson.focus}</p>}
        {lesson.intro && (
          <div className="kd-begin">
            {lesson.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lesson.image} alt="" loading="lazy" />
            )}
            <div className="kd-begin-t" dangerouslySetInnerHTML={{ __html: /<[a-z]/i.test(lesson.intro) ? lesson.intro : `<p>${lesson.intro}</p>` }} />
          </div>
        )}
      </header>

      <div className="kd-guide-list">
        {steps.map((s, i) => (
          <GuideLesson
            key={s.id}
            step={s}
            index={i}
            total={steps.length}
            readiness={
              s.special === "readiness" && form ? (
                <ReadinessAssessment form={form} saved={ready} initial={data.position?.draftAnswers ?? {}} onDraft={(a) => void savePositionAction(lesson.id, { draftAnswers: a })} onSubmit={submit} />
              ) : null
            }
            table={
              s.special === "workout" && (form || table) ? (
                <WorkoutTablePanel
                  hasForm={Boolean(form)}
                  readiness={ready}
                  table={table}
                  onGoToAssessment={() => {
                    const r = steps.find((x) => x.special === "readiness");
                    if (r) document.getElementById(`lesson-${r.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              ) : null
            }
            completion={
              s.special === "completion" ? (
                <div className="kd-guide-done">
                  <Completion variant="step" size={80} />
                  <p className="lq-t17">{s.body || "You've Crushed Another Day"}</p>
                  {next ? (
                    <Button size="md" href={lessonHref(program.slug, next.key, next.id, "self_guided")} iconAfter="chevron">
                      Finish day · go to {lessonLabel(next, word)}
                    </Button>
                  ) : (
                    <Button size="md" href={programHref}>
                      Finish level · back to the program
                    </Button>
                  )}
                </div>
              ) : null
            }
          />
        ))}
      </div>

      <nav className="kd-guide-days" aria-label="Day navigation">
        {prev ? (
          <Link href={lessonHref(program.slug, prev.key, prev.id, "self_guided")} className="kd-guide-day lq-press">
            <span className="kd-eyebrow">
              <Icon name="back" size="xs" /> Previous day
            </span>
            <span className="lq-t15 kd-ellipsis">{lessonLabel(prev, word)}{prev.pageType ? "" : ` · ${lessonName(prev)}`}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={lessonHref(program.slug, next.key, next.id, "self_guided")} className="kd-guide-day lq-press" data-next="">
            <span className="kd-eyebrow">
              Next day <Icon name="chevron" size="xs" />
            </span>
            <span className="lq-t15 kd-ellipsis">{lessonLabel(next, word)}{next.pageType ? "" : ` · ${lessonName(next)}`}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

function GuideLesson({ step, index, total, readiness, table, completion }: { step: PlayerStep; index: number; total: number; readiness: React.ReactNode; table: React.ReactNode; completion: React.ReactNode }) {
  const pl = stagePlaylist(step, null);
  const lines =
    step.special === "completion"
      ? []
      : (step.body ?? "")
          .replace(/^NOTES:\s*/i, "")
          .split(/\n+/)
          .map((l) => l.trim())
          .filter((l) => l && l.toLowerCase() !== step.title.trim().toLowerCase());
  return (
    <section id={`lesson-${step.id}`} className="kd-gl" aria-labelledby={`h-${step.id}`}>
      <div className="kd-gl-meta">
        <p className="kd-eyebrow lq-num">
          {index + 1} of {total}
          {step.durationLabel ? ` · ${step.durationLabel}` : ""}
        </p>
        <h2 id={`h-${step.id}`} className="lq-t22">
          {step.title}
        </h2>
        {!lines.length && step.description && step.special !== "completion" && <p className="lq-t15 lq-c2">{step.description}</p>}
      </div>
      <div className="kd-gl-body">
        {lines.length > 0 && (
          <div className="kd-notes">
            {lines.map((l, i) => (
              <p key={i} className="lq-t15">
                {l}
              </p>
            ))}
          </div>
        )}
        {pl.lead && <VideoStage video={pl.lead} poster={pl.lead.thumbnailUrl ?? step.poster ?? null} title={pl.lead.title ?? step.title} />}
        {readiness}
        {table}
        {completion}
        {step.attachments.length > 0 && (
          <div className="kd-atts">
            {step.attachments.map((a) => (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="kd-att lq-press">
                <Icon name="down" size="xs" />
                {a.title}
              </a>
            ))}
          </div>
        )}
        {pl.queue.length > 0 && (
          <div className="kd-demos">
            <p className="kd-eyebrow">Exercise demos</p>
            <div className="kd-demos-grid">
              {pl.queue.map((c, i) => (
                <div key={c.providerId + i}>
                  <VideoStage video={c} poster={c.thumbnailUrl ?? null} title={c.title} />
                  <p className="lq-t13 kd-demo-t">{c.title.trim()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
