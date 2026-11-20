"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { Button, Glass, ProgressBar, Segmented, Sheet } from "@/components/ui";
import type { MtkPlanData } from "@/lib/loaders/mtk";
import { Check, Doc, PlayFill } from "../glyphs";
import { MtkPath } from "./MtkPath";
import "./mtk.css";

/** My MTK Plan (legacy /mtk-plan): switch, Day n of N, progress + next lesson, upcoming / all learning days, results, retake. */
export function MtkPlan({ data }: { data: MtkPlanData }) {
  const router = useRouter();
  const plan = data.plan!;
  const [showAll, setShowAll] = useState(false);
  const [retake, setRetake] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  const course = `/programs/${data.program.slug}/course`;

  const view = useMemo(() => {
    const done = new Set(data.completed);
    const total = plan.lessonIds.length;
    const completed = plan.lessonIds.filter((id) => done.has(id)).length;
    const days = plan.days.map((d) => ({ ...d, done: d.lessonIds.filter((id) => done.has(id)).length }));
    const current = days.find((d) => d.done < d.lessonIds.length) ?? days[days.length - 1]!;
    const next = plan.lessonIds.find((id) => !done.has(id)) ?? null;
    const weeks = new Map<number, typeof days>();
    for (const d of days) weeks.set(d.week, [...(weeks.get(d.week) ?? []), d]);
    return { done, total, completed, days, current, next, weeks: [...weeks] };
  }, [data.completed, plan]);

  const pct = view.total ? view.completed / view.total : 0;
  const upcoming = showAll ? view.days : view.days.filter((d) => d.day >= view.current.day).slice(0, 6);
  const title = (id: string) => data.lessons[id]?.title ?? "Lesson";

  const jump = (day: number) => {
    if (!upcoming.some((d) => d.day === day)) setShowAll(true);
    setFlash(day);
    setOpened((o) => new Set(o).add(day));
    requestAnimationFrame(() => document.getElementById(`mtk-day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    window.setTimeout(() => setFlash(null), 1300);
  };

  return (
    <div className="mtk">
      <MtkPath at={2} slug={data.program.slug} title="My Plan" sub={`Version ${plan.version} · ${plan.days.length} learning days · ${plan.lessonIds.length} lessons`} />
      <Segmented
        className="mtk-switch"
        label="Curriculum view"
        options={[{ value: "plan", label: "My Plan" }, { value: "full", label: "Full Curriculum" }] as const}
        value="plan"
        onChange={(v) => v === "full" && router.push(`${course}/resume?mode=full`)}
      />

      {data.newerAssessment && (
        <div className="mtk-banner"><span>You retook the assessment. Your new results are ready.</span><Link href="/mtk/results#schedule">See results →</Link></div>
      )}

      <p className="mtk-eyebrow mtk-num mtk-gap" data-tone="accent">My MTK Plan · version {plan.version}</p>
      <h1 className="mtk-h1 mtk-num">Day {view.current.day} of {view.days.length}</h1>
      <p className="mtk-lede">{view.current.title}</p>

      <Glass className="mtk-prog">
        <div className="mtk-prog-row">
          <span>Overall progress</span>
          <span className="mtk-num"><b>{view.completed}</b> / {view.total} recommended lessons</span>
        </div>
        <ProgressBar value={pct} tone="accent" label="Plan progress" />
        {/* Signature: the plan ribbon. One tile per learning day, by week; tap a day to open it below. */}
        <div className="mtk-ribbon" role="list" aria-label="Learning days">
          {view.weeks.map(([w, ds]) => (
            <div key={w} className="mtk-rweek" role="listitem">
              <span>W{w}</span>
              <div>
                {ds.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    className="mtk-rday"
                    data-now={d.day === view.current.day ? "" : undefined}
                    title={`Day ${d.day} · ${d.title} · ${d.done}/${d.lessonIds.length}`}
                    aria-label={`Day ${d.day}, ${d.title}, ${d.done} of ${d.lessonIds.length} done`}
                    onClick={() => jump(d.day)}
                    style={{ "--p": d.lessonIds.length ? d.done / d.lessonIds.length : 0 } as CSSProperties}
                  >
                    <i />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {view.next ? (
          <div className="mtk-nextl">
            <div className="mtk-min0">
              <small>Next lesson</small>
              <b>{title(view.next)}</b>
            </div>
            <Button href={`${course}/${view.next}?mode=plan`} icon="play">Resume plan</Button>
          </div>
        ) : (
          <p className="mtk-complete">Plan complete — every recommended lesson is done.</p>
        )}
      </Glass>

      <section className="mtk-sec" aria-labelledby="mtk-up">
        <div className="mtk-sec-head">
          <h2 id="mtk-up" className="mtk-h2">{showAll ? "All learning days" : "Upcoming learning"}</h2>
          <button type="button" className="mtk-link" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show upcoming" : `All ${view.days.length} days`}</button>
        </div>
        <ul className="mtk-dlist">
          {upcoming.map((d) => {
            const complete = d.done === d.lessonIds.length;
            const now = d.day === view.current.day;
            return (
              <li key={d.day} id={`mtk-day-${d.day}`} data-flash={flash === d.day ? "" : undefined}>
                <button type="button" className="mtk-x mtk-drow" aria-expanded={now || opened.has(d.day)} onClick={() => setOpened((o) => { const n = new Set(o); if (n.has(d.day)) n.delete(d.day); else n.add(d.day); return n; })}>
                  <span className="mtk-dbadge" data-s={complete ? "done" : now ? "now" : undefined}>{complete ? <Check /> : d.day}</span>
                  <span className="mtk-dmain">
                    <b>Day {d.day} · {d.title}</b>
                    <small className="mtk-num">Week {d.week} · {d.lessonIds.length} lessons · ~{d.minutes} min · {d.done}/{d.lessonIds.length} done</small>
                  </span>
                </button>
                {(now || opened.has(d.day)) && (
                  <ul className="mtk-dlessons">
                    {d.lessonIds.map((id) => (
                      <li key={id}>
                        <Link href={`${course}/${id}?mode=plan`} data-done={view.done.has(id) ? "" : undefined}>
                          {view.done.has(id) ? <Check /> : <PlayFill />}
                          <span>{title(id)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mtk-acts mtk-acts-rule">
        <Button variant="glass" href="/mtk/results">Results & schedule</Button>
        <Button variant="plain" icon="repeat" onClick={() => setRetake(true)}>Retake assessment</Button>
      </div>
      {data.archivedVersions > 0 && (
        <p className="mtk-foot mtk-num">
          <Doc className="mtk-foot-ic" />
          {data.archivedVersions} earlier plan version{data.archivedVersions > 1 ? "s" : ""} saved in your history.
        </p>
      )}

      <Sheet
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the assessment?"
        detents={["medium"]}
        footer={<Button block href={`/intake/${data.program.slug}?fresh=1`}>Start the assessment</Button>}
      >
        <p className="mtk-sheet-p">Your completed lessons are kept and this plan is saved in your history when you create the new one.</p>
      </Sheet>
    </div>
  );
}
