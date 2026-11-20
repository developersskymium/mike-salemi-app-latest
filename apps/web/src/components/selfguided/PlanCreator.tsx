"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { buildTrainingPlan, DEFAULT_WEEKDAYS, type PlanFocus, type PlanItem } from "@ms/core";
import { AmbientBackdrop, Button, Glass, Icon, Segmented, useToast } from "@/components/ui";
import type { PlanBuilderData } from "@/lib/loaders/selfguided";
import { savePlanAction } from "@/lib/actions/selfguided";
import { IntentTag, dayOf } from "./parts";
import "./selfguided.css";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Legacy Self-Guided plan creator (L11): the form on the left (sticky on desktop), the pathway on
 * the right — overview, weeks with real lessons, the reason each belongs, minutes — then
 * "Save and schedule" into Plan, and the saved plans. Plans only use lessons the member can open.
 */
export function PlanCreator({ data, slug }: { data: PlanBuilderData; slug: string }) {
  const toast = useToast();
  const [goal, setGoal] = useState("Build consistent strength and movement practice");
  const [weeks, setWeeks] = useState(4);
  const [perWeek, setPerWeek] = useState(3);
  const [days, setDays] = useState<number[]>(DEFAULT_WEEKDAYS[3]!);
  const [minutes, setMinutes] = useState(35);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [focus, setFocus] = useState<PlanFocus>("balanced");
  const [selected, setSelected] = useState<string[]>(() => {
    const first = data.programs.find((p) => p.slug === slug) ?? data.programs[0];
    return first ? [first.slug] : [];
  });
  const [equipment, setEquipment] = useState("One kettlebell");
  const [recovery, setRecovery] = useState("");
  const [constraints, setConstraints] = useState("");
  const [start, setStart] = useState(data.today);
  const [built, setBuilt] = useState<{ items: PlanItem[]; overview: string } | null>(null);
  const [saved, setSaved] = useState(data.saved);
  const [pending, run] = useTransition();

  const make = () =>
    setBuilt(
      buildTrainingPlan({
        programs: data.programs.filter((p) => selected.includes(p.slug)),
        weeks,
        weekdays: days,
        startDate: start,
        minutes,
        focus,
      }),
    );
  const byWeek = useMemo(() => {
    const m = new Map<number, PlanItem[]>();
    for (const it of built?.items ?? []) m.set(it.week, [...(m.get(it.week) ?? []), it]);
    return [...m.entries()];
  }, [built]);

  const save = () =>
    run(async () => {
      if (!built) return;
      const name = `${weeks}-week ${goal.trim().toLowerCase() || "plan"}`.slice(0, 100);
      const r = await savePlanAction(name, { goal, weeks, daysPerWeek: perWeek, weekdays: days, minutes, experience, focus, programSlugs: selected, equipment, recovery, constraints, startDate: start, overview: built.overview }, built.items.map((i) => ({ date: i.date, lessonId: i.lessonId, kind: i.kind, note: i.note })));
      if (!r.ok) return toast(r.message);
      setSaved((s) => [{ id: r.planId, name, startsOn: built.items[0]?.date ?? start, sessions: built.items.length, done: 0, createdAt: new Date().toISOString(), overview: built.overview }, ...s]);
      toast("Plan saved to your calendar", { tone: "success", action: { label: "Open Plan", onClick: () => (window.location.href = "/plan") } });
    });

  const setPer = (n: number) => {
    setPerWeek(n);
    setDays(DEFAULT_WEEKDAYS[n] ?? [1, 3, 5]);
  };
  const image = data.programs.find((p) => p.slug === slug)?.image ?? null;

  return (
    <div className="sg-page">
      {image && <AmbientBackdrop src={image} fixed />}
      <Link href={`/programs/${slug}?mode=self-guided`} className="sg-link lq-t15" style={{ marginTop: 8 }}>
        <Icon name="back" size="sm" /> Self-Guided
      </Link>
      <header className="sg-measure" style={{ marginTop: "var(--s-4)", display: "grid", gap: 8 }}>
        <p className="sg-eyebrow" data-tone="now">
          Self-guided creator
        </p>
        <h1 className="lq-t34" style={{ margin: 0 }}>
          Build a path around your life
        </h1>
        <p className="lq-t17 lq-c2" style={{ margin: 0 }}>
          Choose the outcome, time and programs. Your plan uses only real lessons already available in your account.
        </p>
      </header>

      <div className="sg-creator">
        <Glass as="form" radius="card" className="sg-creator-form" onSubmit={(e: React.FormEvent) => (e.preventDefault(), make())}>
          <label className="sg-field">
            <span>Primary goal</span>
            <input className="sg-input" value={goal} maxLength={200} onChange={(e) => setGoal(e.target.value)} />
          </label>
          <div className="sg-field-3">
            <Num label="Weeks" value={weeks} min={2} max={8} onChange={setWeeks} />
            <Num label="Days/week" value={perWeek} min={2} max={6} onChange={setPer} />
            <Num label="Minutes" value={minutes} min={10} max={120} step={5} onChange={setMinutes} />
          </div>
          <div className="sg-field">
            <span>Training days</span>
            <div className="sg-weekdays" role="group" aria-label="Training days" style={{ justifyContent: "space-between" }}>
              {WD.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  className="sg-chip"
                  aria-pressed={days.includes(i)}
                  aria-label={d}
                  style={{ width: 36, height: 36, padding: 0, justifyContent: "center" }}
                  onClick={() => setDays((x) => (x.includes(i) ? (x.length > 1 ? x.filter((y) => y !== i) : x) : [...x, i].sort()))}
                >
                  {d.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>
          <div className="sg-field">
            <span>Focus</span>
            <Segmented
              label="Focus"
              variant="fill"
              size="sm"
              value={focus}
              onChange={setFocus}
              options={[
                { value: "balanced", label: "Balanced" },
                { value: "strength", label: "Strength" },
                { value: "skill", label: "Skill" },
                { value: "mobility", label: "Mobility" },
              ]}
            />
          </div>
          <label className="sg-field">
            <span>Experience</span>
            <select className="sg-input sg-select" value={experience} onChange={(e) => setExperience(e.target.value as typeof experience)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <div className="sg-field">
            <span>Programs</span>
            <div className="sg-checks">
              {data.programs.map((p) => {
                const on = selected.includes(p.slug);
                const open = p.lessons.filter((l) => l.intent !== "overview");
                return (
                  <label key={p.slug}>
                    <input type="checkbox" checked={on} onChange={() => setSelected((s) => (on ? s.filter((x) => x !== p.slug) : [...s, p.slug]))} />
                    <span className="sg-ellipsis">{p.name}</span>
                    <span className="lq-c2 sg-num">{open.filter((l) => !l.done).length} left</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label className="sg-field">
            <span>Equipment</span>
            <input className="sg-input" value={equipment} onChange={(e) => setEquipment(e.target.value)} maxLength={200} />
          </label>
          <label className="sg-field">
            <span>Recovery needs</span>
            <textarea className="sg-textarea" style={{ minHeight: 70 }} value={recovery} onChange={(e) => setRecovery(e.target.value)} maxLength={500} placeholder="Sore lower back after long drives…" />
          </label>
          <label className="sg-field">
            <span>Constraints</span>
            <textarea className="sg-textarea" style={{ minHeight: 70 }} value={constraints} onChange={(e) => setConstraints(e.target.value)} maxLength={1000} placeholder="Travel every second week, mornings only…" />
          </label>
          <label className="sg-field">
            <span>Start date</span>
            <input className="sg-input" type="date" value={start} min={data.today} onChange={(e) => setStart(e.target.value || data.today)} />
          </label>
          <Button type="submit" block icon="sparkle" disabled={!selected.length || goal.trim().length < 2}>
            {built ? "Regenerate plan" : "Create my plan"}
          </Button>
        </Glass>

        <div className="sg-stack">
          {!built ? (
            <Glass radius="card" className="sg-placeholder">
              <div>
                <span className="sg-li-ic" style={{ width: 48, height: 48 }} aria-hidden>
                  <Icon name="sparkle" />
                </span>
                <h2 className="lq-t22">Your pathway will appear here</h2>
                <p className="lq-t15 lq-c2">It will include a weekly intention, real lesson links, session spacing and the reason each lesson belongs.</p>
              </div>
            </Glass>
          ) : (
            <>
              <Glass radius="card" className="sg-card sg-in">
                <p className="sg-eyebrow" data-tone="now">
                  Your {weeks}-week pathway
                </p>
                <h2 className="lq-t22">{goal}</h2>
                <p className="lq-t15 lq-c2">
                  {built.overview}
                  {constraints.trim() ? ` Planned around: ${constraints.trim()}.` : ""}
                  {recovery.trim() ? ` Recovery note: ${recovery.trim()}.` : ""}
                </p>
                <div className="sg-row" style={{ flexWrap: "wrap" }}>
                  <Button icon="calendar" onClick={save} aria-busy={pending || undefined} disabled={!built.items.length}>
                    Save and schedule
                  </Button>
                  <span className="lq-t13 lq-c2 sg-num">
                    {built.items.length} sessions · first on {built.items[0] ? `${WD[new Date(`${built.items[0].date}T00:00:00Z`).getUTCDay()]} ${dayOf(built.items[0].date).d} ${dayOf(built.items[0].date).m}` : "—"}
                  </span>
                </div>
              </Glass>
              <div className="sg-weeks">
                {byWeek.map(([w, items], i) => (
                  <Glass as="details" radius="card" className="sg-week sg-in" key={w} open={i === 0}>
                    <summary>
                      <span>
                        <b className="lq-t15">Week {w}</b>
                        <span className="lq-t13 lq-c2"> · {items.length} sessions · {items.reduce((n, x) => n + x.minutes, 0)} min</span>
                      </span>
                      <Icon name="chevron" />
                    </summary>
                    <ol>
                      {items.map((it) => {
                        const d = dayOf(it.date);
                        return (
                          <li key={it.date + it.lessonId}>
                            <Link className="sg-wrow" href={`/programs/${it.programSlug}/session/open?lesson=${it.lessonId}`} prefetch={false}>
                              <span className="sg-wdate" data-k={it.kind}>
                                <span>{WD[new Date(`${it.date}T00:00:00Z`).getUTCDay()]}</span>
                                <b>{d.d}</b>
                              </span>
                              <span className="sg-li-t">
                                <span className="lq-t15 sg-ellipsis" style={{ fontWeight: 600 }}>
                                  {it.title}
                                </span>
                                <span className="lq-t12 lq-c2 sg-ellipsis">
                                  {it.programName} · {it.note}
                                </span>
                              </span>
                              <span className="sg-row" style={{ gap: 6 }}>
                                <IntentTag intent={it.intent} />
                                <span className="lq-t12 lq-c2 sg-num">{it.minutes}m</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </Glass>
                ))}
              </div>
            </>
          )}

          {saved.length > 0 && (
            <section className="sg-stack" style={{ marginTop: "var(--s-5)" }} aria-labelledby="sg-saved-h">
              <h2 id="sg-saved-h" className="lq-t17" style={{ margin: 0 }}>
                Saved plans
              </h2>
              <div className="sg-saved">
                {saved.slice(0, 4).map((p) => (
                  <Glass key={p.id} as={Link} href="/plan" radius="card" interactive className="sg-card">
                    <p className="lq-t15" style={{ fontWeight: 650 }}>
                      {p.name}
                    </p>
                    <p className="lq-t12 lq-c2 sg-num">
                      {p.sessions} scheduled sessions · {p.done} done · from {dayOf(p.startsOn).d} {dayOf(p.startsOn).m}
                    </p>
                    <span className="lq-progress" aria-hidden>
                      <i style={{ display: "block", height: "100%", width: `${p.sessions ? (p.done / p.sessions) * 100 : 0}%`, background: "var(--accent)", borderRadius: 3 }} />
                    </span>
                  </Glass>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  return (
    <label className="sg-field">
      <span>{label}</span>
      <input className="sg-input sg-num" type="number" inputMode="numeric" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
    </label>
  );
}

