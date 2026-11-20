"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import type { LearningMode } from "@ms/core";
import { AmbientBackdrop, Button, Glass, Icon, IconButton, ProgressBar, Rings, Segmented, useToast } from "@/components/ui";
import { DayGlyph, LevelEmblem, PhaseLandscape } from "@/components/graphics";
import type { ProgramPageData } from "@/lib/loaders/training";
import { enrollAction } from "@/lib/actions/training";
import { buildMap, currentFrom, dayGlyph, dayTypeShort, lessonHref, lessonLabel } from "./model";
import { ScheduleSheet } from "./ScheduleSheet";
import { RestartSheet } from "./RestartSheet";
import "./training.css";

const MODE_COPY: Record<"immersion" | "self_guided", { title: string; line: string }> = {
  immersion: { title: "Immersion", line: "One day at a time, in order. Each day opens the next." },
  self_guided: { title: "Self-Guided", line: "Every day open. Train in any order, at your own pace." },
};

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

export function ProgramView({ data, offer }: { data: ProgramPageData; offer?: ReactNode }) {
  const { program, path, paths, sections, lessons, progress, enrollment, resources, locked, certificateId } = data;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const trainModes = program.modes.filter((m): m is "immersion" | "self_guided" => m === "immersion" || m === "self_guided");
  const [mode, setMode] = useState<"immersion" | "self_guided">(
    enrollment?.mode === "self_guided" || enrollment?.mode === "immersion" ? enrollment.mode : trainModes[0] ?? "self_guided",
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);

  const map = useMemo(() => buildMap(sections, lessons, progress), [sections, lessons, progress]);
  const current = currentFrom(lessons, progress);
  const totalDays = lessons.filter((l) => l.dayNumber != null).length;
  const doneIds = new Set(progress.filter((p) => p.complete).map((p) => p.lessonId));
  const doneDays = lessons.filter((l) => l.dayNumber != null && doneIds.has(l.id)).length;
  const pathDone = lessons.length > 0 && doneIds.size >= lessons.length;
  const started = progress.some((p) => p.doneSteps > 0);
  const currentSection = map.find((s) => s.id === current?.sectionId) ?? null;
  const word = program.lessonLabel || "Day";
  const levelPaths = paths.length > 1;
  const pathWord = path?.kind === "level" ? "level" : "course";
  const image = path?.image ?? program.media[0]?.url ?? null;

  const phases = map
    .filter((s) => s.firstDay != null)
    .map((s) => ({ startDay: s.firstDay!, label: s.title.replace(/\s*phase$/i, "").replace(/^phase\s*/i, "Phase "), name: s.subtitle ?? undefined }));

  const go = (href: string) => router.push(href);
  const currentHref = current ? lessonHref(program.slug, current.key, current.id, mode) : null;

  async function begin() {
    if (!current) return;
    if (enrollment && enrollment.mode === mode) return go(currentHref!);
    start(async () => {
      const r = await enrollAction(program.id, path?.id ?? null, mode as LearningMode, program.slug);
      if (!r.ok && r.code !== "offline") {
        toast(r.message);
        return;
      }
      go(currentHref!);
    });
  }

  function chooseMode(m: "immersion" | "self_guided") {
    if (m === mode) return;
    setMode(m);
    if (!enrollment) return;
    start(async () => {
      const r = await enrollAction(program.id, path?.id ?? null, m, program.slug);
      if (r.ok) toast(m === "immersion" ? "Switched to Immersion" : "Switched to Self-Guided", { tone: "success" });
      else if (r.code === "offline") toast("Saved on this screen. It will apply when you're back online.");
      else {
        setMode(mode);
        toast(r.message);
      }
    });
  }

  /* ---------------------------------------------------------------- primary action */
  let cta: ReactNode;
  if (locked || program.access === "locked") {
    cta = (
      <Button block icon="lock" href={`/explore/${program.slug}`}>
        Unlock {program.name}
      </Button>
    );
  } else if (pathDone) {
    cta = certificateId ? (
      <Button block icon="sparkle" href={`/you/certificates/${certificateId}`}>
        View your certificate
      </Button>
    ) : (
      <Button block icon="repeat" onClick={() => setRestartOpen(true)}>
        Run {path?.shortName ?? "it"} again
      </Button>
    );
  } else if (current) {
    const label = started && enrollment ? `Continue ${lessonLabel(current, word)}` : `Start ${path?.shortName ?? lessonLabel(current, word)}`;
    cta = (
      <Button block icon="play" onClick={begin} aria-busy={pending || undefined}>
        {label}
      </Button>
    );
  }

  const nowLine = pathDone
    ? `${path?.shortName ?? program.name} complete`
    : current
      ? `${currentSection?.title ?? ""}${current.dayType ? ` · ${dayTypeShort(current.dayType)}` : ""}`
      : "";

  return (
    <div className="trn-prog">
      {image && <AmbientBackdrop src={image} fixed position="50% 40%" className="trn-ambient" />}

      <div className="trn-prog-top">
        <IconButton icon="back" label="Programs" href="/programs" />
      </div>

      <header className="trn-prog-head">
        <p className="lq-t13 lq-c2 trn-eyebrow">
          Mike Salemi{program.formatLabel ? ` · ${program.formatLabel}` : ""}
        </p>
        <h1 className="lq-t34">{program.name}</h1>
        {(path?.tagline || program.tagline) && <p className="lq-t17 lq-c2 trn-tagline">{path?.tagline ?? program.tagline}</p>}
      </header>

      <div className="trn-prog-grid">
        <div className="trn-prog-main">
          {levelPaths && (
            <nav className="trn-levels" aria-label="Levels">
              {paths.map((p, pi) => {
                const on = p.id === path?.id;
                const n = ROMAN[(p.shortName ?? "").replace(/^level\s*/i, "")] ?? pi + 1;
                const sub = p.name.split("·")[1]?.trim() ?? p.name;
                return (
                  <Link
                    key={p.id}
                    href={`/programs/${program.slug}?path=${encodeURIComponent(p.key ?? p.id)}`}
                    scroll={false}
                    replace
                    aria-current={on ? "page" : undefined}
                    className="trn-level lq-glass lq-fx lq-press"
                    data-fx=""
                    data-on={on ? "" : undefined}
                  >
                    {p.kind === "level" && <LevelEmblem level={n} size={40} />}
                    <span className="trn-level-t">
                      <b className="lq-t17">{p.shortName ?? p.name}</b>
                      <span className="lq-t13 lq-c2">{sub}</span>
                    </span>
                    {on && <i className="trn-level-dot" aria-hidden />}
                  </Link>
                );
              })}
            </nav>
          )}

          <Glass as="section" radius="hero" className="trn-hero" aria-label="Your progress">
            <div className="trn-hero-ridge">
              {totalDays > 1 ? (
                <PhaseLandscape totalDays={totalDays} completedDays={doneDays} currentDay={current?.dayNumber ?? undefined} phases={phases} />
              ) : (
                <div className="trn-hero-flat" />
              )}
            </div>
            <div className="trn-hero-foot">
              <div className="trn-hero-stats">
                <Rings size={60} stroke={8} rings={[{ value: totalDays ? doneDays / totalDays : 0, tone: 1 }]} label={`${doneDays} of ${totalDays} days`}>
                  <span className="lq-t13 lq-num" style={{ fontWeight: 700 }}>
                    {totalDays ? Math.round((doneDays / totalDays) * 100) : 0}%
                  </span>
                </Rings>
                <div style={{ minWidth: 0 }}>
                  <div className="lq-t22 lq-num">
                    {pathDone ? "All done" : current?.dayNumber != null ? `${word} ${current.dayNumber}` : current?.title ?? ""}
                    {!pathDone && totalDays > 0 && current?.dayNumber != null && <span className="lq-c2 trn-of"> of {totalDays}</span>}
                  </div>
                  <div className="lq-t13 lq-c2 trn-ellipsis">{nowLine}</div>
                </div>
              </div>
              {cta}
            </div>
          </Glass>

          <section className="trn-sec" aria-labelledby="trn-map-h">
            <div className="trn-sec-h">
              <h2 id="trn-map-h" className="lq-t22">
                {program.sectionLabel === "Phase" ? "Phases" : `${program.sectionLabel}s`}
              </h2>
              <span className="lq-t13 lq-c2 lq-num">
                {doneDays} of {totalDays} {word.toLowerCase()}s
              </span>
            </div>
            <div className="trn-phases">
              {map.map((s) => {
                const isNow = s.id === current?.sectionId;
                const res = resources.find((r) => r.sectionId === s.id);
                return (
                  <Glass as="article" radius="card" key={s.id} className="trn-phase" data-now={isNow ? "" : undefined}>
                    <header className="trn-phase-h">
                      <div>
                        <h3 className="lq-t17">
                          {isNow && <i className="trn-now-dot" aria-hidden />}
                          {s.title}
                        </h3>
                        <p className="lq-t13 lq-c2 lq-num">
                          {s.subtitle}
                          {s.firstDay != null && ` · ${word}s ${s.firstDay}–${s.lastDay}`}
                        </p>
                      </div>
                      <span className="lq-t13 lq-num trn-phase-count" data-done={s.done === s.total ? "" : undefined}>
                        {s.done === s.total ? <Icon name="check" size="xs" /> : null}
                        {s.done}/{s.total}
                      </span>
                    </header>
                    <ProgressBar value={s.total ? s.done / s.total : 0} tone={isNow ? "accent" : "label"} label={`${s.title} progress`} className="trn-phase-bar" />
                    <ol className="trn-days" aria-label={`${s.title} days`}>
                      {s.lessons.map((l) => {
                        const done = Boolean(l.progress?.complete);
                        const now = l.id === current?.id;
                        const lockedDay = !locked && mode === "immersion" && enrollment?.mode === "immersion" && l.progress ? !l.progress.unlocked : locked;
                        const glyph = dayGlyph(l.dayType, l.pageType);
                        const label = l.dayNumber != null ? String(l.dayNumber) : l.pageType === "transition" ? "Next" : "Intro";
                        const aria = `${lessonLabel(l, word)}${l.dayType && l.dayNumber != null ? `, ${dayTypeShort(l.dayType)}` : ""}${done ? ", done" : now ? ", today" : lockedDay ? ", locked" : ""}`;
                        const body = (
                          <>
                            <DayGlyph type={glyph} size={18} tone={now ? "accent" : "mono"} title="" />
                            <span className="lq-num">{label}</span>
                            {done && (
                              <i className="trn-tick" aria-hidden>
                                <Icon name="check" size="xs" />
                              </i>
                            )}
                            {lockedDay && !done && (
                              <i className="trn-lock" aria-hidden>
                                <Icon name="lock" size="xs" />
                              </i>
                            )}
                          </>
                        );
                        return (
                          <li key={l.id}>
                            {locked ? (
                              <span className="trn-day" data-state="locked" aria-label={aria}>
                                {body}
                              </span>
                            ) : (
                              <Link
                                href={lessonHref(program.slug, l.key, l.id, lockedDay ? "self_guided" : mode)}
                                className="trn-day"
                                data-state={done ? "done" : now ? "now" : lockedDay ? "locked" : undefined}
                                data-kind={l.pageType ?? undefined}
                                aria-label={aria}
                                title={l.title}
                              >
                                {body}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                    {res && (
                      <a className="trn-phase-res lq-t13" href={res.url} target="_blank" rel="noreferrer">
                        <Icon name="down" size="xs" />
                        {res.title}
                        <span className="lq-c2">PDF</span>
                      </a>
                    )}
                  </Glass>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="trn-prog-side">
          {trainModes.length > 0 && !locked && (
            <section className="trn-sec" aria-labelledby="trn-mode-h">
              <div className="trn-sec-h">
                <h2 id="trn-mode-h" className="lq-t22">
                  How you train
                </h2>
              </div>
              <div className="trn-modes" role="radiogroup" aria-label="Training mode">
                {trainModes.map((m) => {
                  const on = m === mode;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className="trn-mode lq-glass lq-fx lq-press"
                      data-fx=""
                      data-on={on ? "" : undefined}
                      onClick={() => chooseMode(m)}
                    >
                      <span className="trn-mode-ic" aria-hidden>
                        <Icon name={m === "immersion" ? "steps" : "compass"} size="sm" />
                      </span>
                      <span className="trn-mode-t">
                        <b className="lq-t15">{MODE_COPY[m].title}</b>
                        <span className="lq-t13 lq-c2">{MODE_COPY[m].line}</span>
                      </span>
                      <span className="trn-radio" aria-hidden>
                        {on && <Icon name="check" size="xs" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {mode === "immersion" && enrollment?.mode === "immersion" && (
                <Glass radius="card" className="trn-pace">
                  <div className="trn-pace-row">
                    <div>
                      <b className="lq-t15">Pace</b>
                      <p className="lq-t13 lq-c2">
                        {enrollment.pace === "scheduled"
                          ? `Scheduled on your training days. See it in Plan.`
                          : "Free: train whenever you're ready."}
                      </p>
                    </div>
                  </div>
                  <Segmented
                    label="Immersion pace"
                    variant="fill"
                    size="sm"
                    options={[
                      { value: "free", label: "Free" },
                      { value: "scheduled", label: "Scheduled" },
                    ]}
                    value={enrollment.pace === "scheduled" ? "scheduled" : "free"}
                    onChange={(v) => {
                      if (v === "scheduled") setScheduleOpen(true);
                      else router.push("/plan");
                    }}
                  />
                </Glass>
              )}
            </section>
          )}

          {offer}

          {path && (path.outcomes.length > 0 || path.whatsNeeded.length > 0) && (
            <section className="trn-sec" aria-labelledby="trn-about-h">
              <div className="trn-sec-h">
                <h2 id="trn-about-h" className="lq-t22">
                  In {path.shortName ?? "this " + pathWord}
                </h2>
              </div>
              <Glass radius="card" className="trn-about">
                {path.outcomes.length > 0 && (
                  <ul className="trn-checks">
                    {path.outcomes.map((o) => (
                      <li key={o} className="lq-t15">
                        <Icon name="check" size="xs" />
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {path.whatsNeeded.length > 0 && (
                  <>
                    <h3 className="lq-t13 lq-c2 trn-about-sub">What you need</h3>
                    <ul className="trn-dots">
                      {path.whatsNeeded.map((o) => (
                        <li key={o} className="lq-t15">
                          {o}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Glass>
            </section>
          )}

          {resources.length > 0 && (
            <section className="trn-sec" aria-labelledby="trn-res-h">
              <div className="trn-sec-h">
                <h2 id="trn-res-h" className="lq-t22">
                  Phase plans
                </h2>
                <span className="lq-t13 lq-c2">Train away from the screen</span>
              </div>
              <Glass radius="card" className="trn-list">
                {resources.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="trn-row">
                    <span className="trn-row-ic" aria-hidden>
                      <Icon name="down" size="sm" />
                    </span>
                    <span className="lq-t15 trn-row-t">{r.title}</span>
                    <span className="lq-t13 lq-c2">{r.kind.toUpperCase()}</span>
                  </a>
                ))}
              </Glass>
            </section>
          )}

          {enrollment && started && !locked && (
            <div className="trn-restart">
              <Button variant="plain" size="sm" icon="repeat" onClick={() => setRestartOpen(true)}>
                Restart {path?.shortName ?? "from the beginning"}
              </Button>
            </div>
          )}
        </aside>
      </div>

      {enrollment && (
        <ScheduleSheet open={scheduleOpen} onClose={() => setScheduleOpen(false)} enrollmentId={enrollment.id} initialDays={enrollment.trainingDays} slug={program.slug} />
      )}
      <RestartSheet
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        programId={program.id}
        pathId={path?.id ?? null}
        slug={program.slug}
        name={path?.shortName ?? program.name}
        done={doneDays}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
