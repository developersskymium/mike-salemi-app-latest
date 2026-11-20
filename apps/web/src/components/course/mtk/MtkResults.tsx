"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { groupIntoDays, MOVEMENT_LABEL, MTK_LESSON_META, weeksNeeded, type MtkMovement } from "@ms/core";
import { MovementFigure, type MoveName } from "@/components/graphics";
import { Button, Glass, IconButton, useToast } from "@/components/ui";
import { createMtkPlanAction } from "@/lib/actions/mtk";
import type { MtkResultsData } from "@/lib/loaders/mtk";
import { Chevron } from "../glyphs";
import "./mtk.css";

const WEEKS = [2, 4, 6, 8, 12, 16, 24, 36, 52];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [15, 20, 30, 45, 60];
const LEVELS = ["Foundation", "Developing", "Proficient", "Advanced"];

export const FIGURE: Partial<Record<MtkMovement, MoveName>> = {
  deadlift: "deadlift", "single-leg-deadlift": "deadlift", swing: "swing", clean: "clean", snatch: "snatch", press: "press", jerk: "press",
  "turkish-get-up": "getup", windmill: "getup", squat: "squat", lunge: "lunge", row: "row",
};
const LIFTS: MtkMovement[] = ["deadlift", "single-leg-deadlift", "swing", "clean", "snatch", "press", "jerk", "turkish-get-up", "windmill", "squat", "lunge", "row"];
const DEPTH_LABEL = { fix: "Fix", learn: "Learn", refine: "Refine", prereq: "Foundation" } as const;
const meta = new Map(MTK_LESSON_META.map((m) => [m.id, m]));

function Choice({ label, value, options, suffix, onChange, short }: { label: string; value: number; options: number[]; suffix: string; onChange: (v: number) => void; short?: (v: number) => boolean }) {
  return (
    <div className="mtk-choice" role="group" aria-label={label}>
      <p>{label}</p>
      <div className="mtk-chips">
        {options.map((o) => (
          <button key={o} type="button" className="mtk-chip" aria-pressed={value === o} data-short={short?.(o) ? "" : undefined} onClick={() => onChange(o)}>
            {o} {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

/** MTK results (legacy /mtk-plan/results): N of M, level · strengths · gaps, personalised curriculum, schedule → Create my plan. */
export function MtkResults({ data }: { data: MtkResultsData }) {
  const router = useRouter();
  const toast = useToast();
  const a = data.assessment!;
  const r = a.result;
  const [weeks, setWeeks] = useState(data.activePlan?.weeks ?? 8);
  const [days, setDays] = useState(data.activePlan?.daysPerWeek ?? 3);
  const [minutes, setMinutes] = useState(data.activePlan?.minutes ?? 20);
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => {
    const grouped = groupIntoDays(r.lessonIds, minutes, days);
    return { count: grouped.length, needed: weeksNeeded(grouped.length, days), first: grouped.slice(0, 3) };
  }, [r.lessonIds, minutes, days]);
  const unrealistic = weeks < preview.needed;
  const samePlan = data.activePlan && data.activePlan.responseId === a.responseId;

  const byMovement = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const id of r.lessonIds) {
      const mv = meta.get(id)?.movement ?? "general";
      m.set(mv, [...(m.get(mv) ?? []), id]);
    }
    return m;
  }, [r.lessonIds]);

  const depthOf = (mv: MtkMovement) => r.focusAreas.find((f) => f.movement === mv)?.depth;
  const confident = new Set(r.strengths);

  const create = async () => {
    setSaving(true);
    const res = await createMtkPlanAction(a.responseId, { weeks, daysPerWeek: days, minutes });
    setSaving(false);
    if (!res.ok) {
      toast(res.message);
      return;
    }
    toast("Your MTK plan is active", { tone: "success" });
    router.push("/mtk");
  };

  const courseHref = `/programs/${data.program.slug}/course`;
  return (
    <div className="mtk">
      <div className="mtk-top">
        <IconButton icon="back" label={data.activePlan ? "My Plan" : "Mastering the Kettlebell"} href={data.activePlan ? "/mtk" : `${courseHref}/resume?mode=full`} />
        <span className="mtk-eyebrow mtk-num">Assessment {a.attempt}</span>
      </div>
      <p className="mtk-eyebrow" data-tone="accent">{data.program.name} · Your results</p>
      <h1 className="mtk-h1 mtk-num"><b>{r.recommended}</b> of {r.total} lessons recommended</h1>
      <p className="mtk-lede">{r.summary}</p>
      {a.path?.reasons?.length ? <div className="mtk-why">{a.path.reasons.map((x) => <span key={x}>{x}</span>)}</div> : null}

      <div className="mtk-cards">
        <Glass className="mtk-card">
          <span className="mtk-eyebrow">Your MTK level</span>
          <span className="mtk-card-v">{r.level}</span>
          <span className="mtk-levels" aria-hidden>{LEVELS.map((l, i) => <i key={l} data-on={i <= LEVELS.indexOf(r.level) ? "" : undefined} />)}</span>
          {r.coach && <small>Coaching track</small>}
        </Glass>
        <Glass className="mtk-card">
          <span className="mtk-eyebrow">Your strengths</span>
          <p>{r.strengths.length ? r.strengths.join(", ") : "None reported yet — we’ll build them"}</p>
        </Glass>
        <Glass className="mtk-card">
          <span className="mtk-eyebrow">Focus areas / gaps</span>
          <p>{r.gaps.length ? r.gaps.join(", ") : "Fundamentals"}</p>
        </Glass>
      </div>

      <section className="mtk-sec" aria-labelledby="mtk-cur">
        <h2 id="mtk-cur" className="mtk-h2">Your personalized curriculum</h2>
        <p className="mtk-note">About {Math.max(1, Math.round(r.minutes / 60))} hours of learning, in the original MTK order.</p>
        <div className="mtk-map" role="list" aria-label="Movement map">
          {LIFTS.map((mv) => {
            const d = depthOf(mv);
            const n = byMovement.get(mv)?.length ?? 0;
            const strong = confident.has(MOVEMENT_LABEL[mv]);
            return (
              <div key={mv} role="listitem" className="mtk-move" data-depth={n ? d ?? "learn" : undefined}>
                <span className="mtk-move-fig"><MovementFigure move={FIGURE[mv]!} size={60} animated={d === "fix"} /></span>
                <b>{MOVEMENT_LABEL[mv]}</b>
                <small>{n ? `${d ? DEPTH_LABEL[d] : "Plan"} · ${n}` : strong ? "Strength" : "Open anytime"}</small>
              </div>
            );
          })}
        </div>
        <div className="mtk-legend" aria-hidden>
          <span><i data-k="fix" />You struggle with it: pre-checks and corrections</span>
          <span><i data-k="plan" />In your plan</span>
          <span><i />Full Curriculum</span>
        </div>
        <div className="mtk-list">
          {r.focusAreas.map((f) => {
            const ids = byMovement.get(f.movement) ?? [];
            return (
              <details key={f.movement} className="mtk-area">
                <summary>
                  <span className="mtk-area-main"><b>{f.label}</b><small>{f.why}</small></span>
                  <span className="mtk-area-n">{f.count} lessons</span>
                  <Chevron className="mtk-chev" />
                </summary>
                <ol>{ids.map((id) => <li key={id}><Link href={`${courseHref}/${id}?mode=full`}>{data.lessons[id]?.title ?? meta.get(id)?.title}</Link></li>)}</ol>
              </details>
            );
          })}
        </div>
      </section>

      <section id="schedule" className="mtk-sched" aria-labelledby="mtk-sched-h">
        <p className="mtk-eyebrow" data-tone="accent">Your schedule</p>
        <h2 id="mtk-sched-h" className="mtk-h2 mtk-h2-gap">How would you like to complete your {r.recommended} lessons?</h2>
        <Choice label="How quickly would you like to finish?" value={weeks} options={WEEKS} suffix="weeks" onChange={setWeeks} short={(w) => w < preview.needed} />
        <Choice label="Learning days per week" value={days} options={DAYS} suffix="days" onChange={setDays} />
        <Choice label="Time per learning session" value={minutes} options={MINUTES} suffix="min" onChange={setMinutes} />

        <Glass className="mtk-preview" aria-live="polite">
          <span className="mtk-eyebrow">Your plan</span>
          <p className="mtk-preview-v mtk-num">{preview.count} learning days · about {preview.needed} weeks</p>
          <div className="mtk-weeks" aria-hidden>
            {Array.from({ length: Math.min(preview.needed, 26) }, (_, w) => (
              <div key={`${days}-${minutes}-${w}`} className="mtk-week">
                <span>W{w + 1}</span>
                <div>{Array.from({ length: days }, (_, d) => <i key={d} data-on={w * days + d < preview.count ? "" : undefined} style={{ animationDelay: `${Math.min(w * 30 + d * 12, 600)}ms` }} />)}</div>
              </div>
            ))}
          </div>
          <ul className="mtk-days">
            {preview.first.map((d) => <li key={d.day}><b>Day {d.day}:</b> {d.title} · {d.lessonIds.length} lessons · ~{d.minutes} min</li>)}
          </ul>
          {unrealistic && (
            <div className="mtk-warn" role="status">
              {weeks} weeks isn’t realistic for {r.recommended} lessons at {days} days × {minutes} min. The recommended minimum is <b>{preview.needed} weeks</b>.{" "}
              <button type="button" className="mtk-link" onClick={() => setWeeks(WEEKS.find((w) => w >= preview.needed) ?? 52)}>Use {WEEKS.find((w) => w >= preview.needed) ?? 52} weeks</button>
            </div>
          )}
        </Glass>
        <div className="mtk-acts">
          <Button onClick={() => void create()} disabled={unrealistic || saving} aria-busy={saving || undefined}>
            {samePlan ? "Update my plan" : data.activePlan ? "Create my new plan" : "Create my plan"}
          </Button>
          <Button variant="glass" href={`${courseHref}/resume?mode=full`}>Browse the full curriculum</Button>
        </div>
      </section>
      <p className="mtk-foot">Want different results? <Link href={`/intake/${data.program.slug}?fresh=1`}>Retake the assessment</Link> — completed lessons are always kept.</p>
    </div>
  );
}
