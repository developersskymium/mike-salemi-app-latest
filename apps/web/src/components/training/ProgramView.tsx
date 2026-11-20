"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import type { LearningMode } from "@ms/core";
import { AmbientBackdrop, Button, Glass, Icon, IconButton, Segmented, useToast } from "@/components/ui";
import type { LessonLite, ProgramPageData } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { enrollAction } from "@/lib/actions/training";
import { Curriculum } from "@/components/selfguided/Curriculum";
import { RepeatList, SelfGuidedBoard } from "@/components/selfguided/Board";
import { TrainingPanel } from "@/components/selfguided/TrainingPanel";
import { currentFrom, dayTypeShort, lessonHref, lessonLabel, WEEKDAYS } from "./model";
import { VideoStage } from "./VideoStage";
import { ScheduleSheet } from "./ScheduleSheet";
import { RestartSheet } from "./RestartSheet";
import "./training.css";
import "@/components/selfguided/selfguided.css";

type TrainMode = "immersion" | "self_guided";

const MODE_COPY: Record<TrainMode, { title: string; line: string }> = {
  immersion: { title: "Immersion", line: "Follow the program day by day. Each day opens the next." },
  self_guided: { title: "Self-Guided", line: "Every phase and day open. Train what suits your body today." },
};

const HOW = [
  { icon: "lock" as const, title: "Nothing is locked", body: "Every phase and day is open from the start. Train what suits your body today." },
  { icon: "down" as const, title: "Plans to download", body: "Each phase ships with a printable PDF plan you can take to the gym." },
  { icon: "calendar" as const, title: "Your own calendar", body: "Drop days onto a schedule, set reminders and choose what happens if you miss one." },
];

/**
 * Program page in the original layouts: the Immersion home / level page (L4 + L5) and the
 * Self-Guided level page (L8) share one structure — context bar, level switch, split hero with
 * the intro video, then the curriculum (phase tabs, search, day rows) beside the sidebar, then
 * progress, past runs and "About this level". Self-Guided adds its board (Continue, Up next,
 * Quick session) under the hero; Immersion keeps the plan, pace and phase-guide sidebar.
 */
export function ProgramView({ data, board, offer, initialMode }: { data: ProgramPageData; board?: BoardData | null; offer?: ReactNode; initialMode?: TrainMode | null }) {
  const { program, path, paths, sections, lessons, progress, enrollment, resources, locked, certificateId } = data;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const trainModes = program.modes.filter((m): m is TrainMode => m === "immersion" || m === "self_guided");
  const [mode, setMode] = useState<TrainMode>(
    initialMode && trainModes.includes(initialMode)
      ? initialMode
      : enrollment?.mode === "self_guided" || enrollment?.mode === "immersion"
        ? enrollment.mode
        : trainModes[0] ?? "self_guided",
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [intro, setIntro] = useState(false);

  const sg = mode === "self_guided";
  const current = currentFrom(lessons, progress);
  const doneIds = useMemo(() => new Set(progress.filter((p) => p.complete).map((p) => p.lessonId)), [progress]);
  const totalDays = lessons.filter((l) => l.dayNumber != null).length;
  const doneDays = lessons.filter((l) => l.dayNumber != null && doneIds.has(l.id)).length;
  const pathDone = lessons.length > 0 && doneIds.size >= lessons.length;
  const started = progress.some((p) => p.doneSteps > 0);
  const pct = lessons.length ? Math.round((doneIds.size / lessons.length) * 100) : 0;
  const word = program.lessonLabel || "Day";
  const sectionWord = program.sectionLabel || "Phase";
  const levelPaths = paths.length > 1;
  const image = path?.image ?? program.media[0]?.url ?? null;
  const streak = board?.stats?.streak.current ?? 0;
  const currentSection = sections.find((s) => s.id === current?.sectionId) ?? null;
  const lockedProgram = locked || program.access === "locked";
  const orderLocked = !sg && enrollment?.mode === "immersion";
  const pathQ = path?.key ? `path=${encodeURIComponent(path.key)}` : "";

  const openHref = (lessonId: string, key: string | null) => `/programs/${program.slug}/session/open?lesson=${lessonId}&key=${encodeURIComponent(key ?? lessonId)}`;
  const dayHref = (l: LessonLite) => (sg ? openHref(l.id, l.key) : lessonHref(program.slug, l.key, l.id, orderLocked && !progress.find((p) => p.lessonId === l.id)?.unlocked ? "self_guided" : "immersion"));
  const currentHref = current ? (sg ? openHref(current.id, current.key) : lessonHref(program.slug, current.key, current.id, "immersion")) : null;
  const levelHref = (key: string | null, id: string) => `/programs/${program.slug}?path=${encodeURIComponent(key ?? id)}${sg ? "&mode=self-guided" : ""}`;

  function begin() {
    if (!current || !currentHref) return;
    if (sg || (enrollment && enrollment.mode === mode)) return router.push(currentHref);
    start(async () => {
      const r = await enrollAction(program.id, path?.id ?? null, mode as LearningMode, program.slug);
      if (!r.ok && r.code !== "offline") return toast(r.message);
      router.push(currentHref);
    });
  }

  function chooseMode(m: TrainMode) {
    if (m === mode) return;
    setMode(m);
    window.history.replaceState(null, "", `/programs/${program.slug}?${[pathQ, m === "self_guided" ? "mode=self-guided" : "mode=immersion"].filter(Boolean).join("&")}`);
    if (!enrollment) return;
    start(async () => {
      const r = await enrollAction(program.id, path?.id ?? null, m, program.slug);
      if (r.ok) toast(m === "immersion" ? "Switched to Immersion" : "Switched to Self-Guided", { tone: "success" });
      else if (r.code !== "offline") {
        setMode(mode);
        toast(r.message);
      }
    });
  }

  /* ---------------------------------------------------------------- primary action */
  const resumeLabel = current ? `${started && (enrollment || sg) ? "Resume" : "Start"} ${lessonLabel(current, word)}${current.dayType && current.dayNumber != null ? ` · ${dayTypeShort(current.dayType)}` : ""}` : "";
  let cta: ReactNode = null;
  if (lockedProgram) {
    cta = (
      <Button icon="lock" href={`/explore/${program.slug}`}>
        Unlock {program.name}
      </Button>
    );
  } else if (pathDone) {
    cta = certificateId ? (
      <Button icon="sparkle" href={`/you/certificates/${certificateId}`}>
        Get your certificate
      </Button>
    ) : (
      <Button icon="repeat" onClick={() => setRestartOpen(true)}>
        Run {path?.shortName ?? "it"} again
      </Button>
    );
  } else if (current) {
    cta = (
      <Button icon="play" onClick={begin} aria-busy={pending || undefined}>
        {resumeLabel}
      </Button>
    );
  }

  const meta = [
    `${sections.length} ${sectionWord.toLowerCase()}${sections.length === 1 ? "" : "s"}`,
    `${totalDays} ${word.toLowerCase()}s`,
    path?.shortName,
    streak > 0 ? `${streak} day streak` : null,
  ].filter(Boolean) as string[];

  const phaseStats = sections.map((s) => {
    const ls = lessons.filter((l) => l.sectionId === s.id);
    return { title: s.title, done: ls.filter((l) => doneIds.has(l.id)).length, total: ls.length };
  });
  const ex = board?.extras;

  return (
    <div className="sg-page">
      {image && <AmbientBackdrop src={image} fixed position="50% 40%" />}

      {/* ---------------------------------------------------------- context bar */}
      <Glass radius="panel" className="sg-ctx">
        <div className="sg-ctx-row">
          <IconButton icon="back" label="All programs" href="/programs" variant="fill" size="sm" iconSize="sm" />
          <div className="sg-ctx-t">
            <p className="lq-t15 sg-ellipsis" style={{ fontWeight: 650 }}>
              {program.name}
            </p>
            <p className="lq-t12 lq-c2 sg-ellipsis">
              {sg
                ? `${sections.length} ${sectionWord.toLowerCase()}s · ${totalDays} training ${word.toLowerCase()}s · overviews and preparation included`
                : `${path?.shortName ?? program.name} · ${pct}% complete`}
            </p>
            {!sg && !lockedProgram && (
              <span className="sg-ctx-bar" aria-hidden>
                <i style={{ transform: `scaleX(${pct / 100})` }} />
              </span>
            )}
          </div>
          <div className="sg-ctx-a">
            {sg && levelPaths ? (
              <nav className="sg-levels" aria-label="Level">
                {paths.map((p) => (
                  <Link key={p.id} href={levelHref(p.key, p.id)} scroll={false} replace className="sg-level" aria-current={p.id === path?.id ? "page" : undefined}>
                    {(p.shortName ?? p.name).replace(/^level\s*/i, "L")}
                  </Link>
                ))}
              </nav>
            ) : (
              current &&
              !lockedProgram &&
              !pathDone && (
                <Button size="sm" icon="play" onClick={begin} className="sg-hide-phone">
                  {started ? "Resume" : "Start"}
                </Button>
              )
            )}
          </div>
        </div>
      </Glass>

      {/* ---------------------------------------------------------- level tabs (Immersion) */}
      {!sg && levelPaths && (
        <div className="sg-levels-row">
          <Glass radius="pill" className="sg-levels" as="nav" aria-label="Level">
            {paths.map((p) => (
              <Link key={p.id} href={levelHref(p.key, p.id)} scroll={false} replace className="sg-level" aria-current={p.id === path?.id ? "page" : undefined}>
                {p.name.replace("·", "·")}
              </Link>
            ))}
          </Glass>
        </div>
      )}

      {/* ---------------------------------------------------------- hero split */}
      <header className="sg-hero">
        <div className="sg-hero-t">
          <p className="sg-eyebrow">
            {sg ? `${path?.shortName ? `${path.shortName} · ` : ""}Self-guided` : `${path?.shortName ? `${path.shortName} · ` : ""}${sections.length} ${sectionWord.toLowerCase()}s · ${totalDays} training ${word.toLowerCase()}s`}
          </p>
          <h1 className="lq-t34">{program.name}</h1>
          {(path?.tagline || program.tagline) && <p className="lq-t17 lq-c2">{path?.tagline ?? program.tagline}</p>}
          <p className="sg-hero-meta lq-t12 lq-c2">
            {meta.map((m, i) => (
              <span key={m} className="sg-num">
                {i === meta.length - 1 && streak > 0 ? <Icon name="flame" /> : null}
                {m}
              </span>
            ))}
          </p>
          <div className="sg-hero-actions">
            {cta}
            {sg && !lockedProgram && (
              <Button variant="glass" size="md" icon="calendar" href={`/programs/${program.slug}/session/plan`}>
                Schedule this level
              </Button>
            )}
            {ex?.heroVideo && (
              <Button variant="glass" size="md" icon={intro ? "close" : "play"} onClick={() => setIntro((v) => !v)} aria-expanded={intro}>
                {intro ? "Close intro" : "Watch intro"}
              </Button>
            )}
          </div>
          {!lockedProgram && (
            <div className="sg-hero-prog">
              <div className="sg-row" style={{ justifyContent: "space-between" }}>
                <span className="lq-t13 lq-c2 sg-num">
                  {doneIds.size} of {lessons.length} lessons complete
                </span>
                <b className="lq-t13 sg-num">{pct}%</b>
              </div>
              <span className="lq-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% complete`}>
                <i style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 3 }} />
              </span>
            </div>
          )}
        </div>
        {image && (
          <div className="sg-hero-img">
            <Image src={image} alt={`${program.name} ${path?.shortName ?? ""}`.trim()} fill sizes="(min-width: 900px) 45vw, 100vw" priority />
          </div>
        )}
      </header>
      {intro && ex?.heroVideo && (
        <div className="sg-hero-video sg-in">
          <VideoStage video={ex.heroVideo} poster={image} title={`${program.name} introduction`} autoStart />
        </div>
      )}

      {/* ---------------------------------------------------------- Self-Guided board */}
      {sg && board && !lockedProgram && (
        <SelfGuidedBoard
          board={board}
          programId={program.id}
          pathId={path?.id ?? null}
          slug={program.slug}
          lessonWord={word}
          openHref={openHref}
          startHref={current ? openHref(current.id, current.key) : null}
          startLabel={resumeLabel || "Start"}
        />
      )}

      {/* ---------------------------------------------------------- curriculum + sidebar */}
      <div className="sg-body">
        <div className="sg-main">
          <Curriculum
            slug={program.slug}
            mode={sg ? "self_guided" : "immersion"}
            sections={sections}
            lessons={lessons}
            progress={progress}
            resources={resources}
            board={board ?? null}
            currentId={current?.id ?? null}
            nextId={sg ? board?.next?.lessonId ?? null : null}
            lessonWord={word}
            sectionWord={sectionWord}
            lockedProgram={lockedProgram}
            orderLocked={orderLocked}
            dayHref={dayHref}
          />
        </div>

        <aside className="sg-side" aria-label="Plan and options">
          {!lockedProgram && current && !sg && (
            <Link href={currentHref ?? "#"} className="sg-today sg-press" style={{ textDecoration: "none" }}>
              <p className="sg-eyebrow">{enrollment?.pace === "scheduled" ? "On the plan today" : "Next on your plan"}</p>
              <p className="lq-t13" style={{ opacity: 0.75 }}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long" })}
              </p>
              <p className="lq-t17" style={{ fontWeight: 650 }}>
                {lessonLabel(current, word)} · {[path?.shortName, currentSection?.title].filter(Boolean).join(" · ")}
              </p>
            </Link>
          )}

          {trainModes.length > 0 && !lockedProgram && (
            <section className="sg-stack" style={{ gap: 8 }} aria-labelledby="sg-mode-h">
              <h2 id="sg-mode-h" className="lq-t17" style={{ margin: 0 }}>
                How you train
              </h2>
              <Glass radius="card" role="radiogroup" aria-label="Training mode" style={{ padding: 4 }}>
                {trainModes.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={m === mode} className="sg-mode" onClick={() => chooseMode(m)}>
                    <span className="sg-mode-ic" aria-hidden>
                      <Icon name={m === "immersion" ? "steps" : "compass"} />
                    </span>
                    <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                      <b className="lq-t15">{MODE_COPY[m].title}</b>
                      <span className="lq-t12 lq-c2">{MODE_COPY[m].line}</span>
                    </span>
                    <span className="sg-radio" aria-hidden>
                      {m === mode && <Icon name="check" size="xs" />}
                    </span>
                  </button>
                ))}
              </Glass>
            </section>
          )}

          {!sg && enrollment?.mode === "immersion" && (
            <Glass radius="card" className="sg-card">
              <p className="lq-t15" style={{ fontWeight: 650 }}>
                Pace
              </p>
              <p className="lq-t13 lq-c2">
                {enrollment.pace === "scheduled" ? "Your training days land on your calendar for the next 4 weeks." : "Train the next day whenever you're ready — no dates."}
              </p>
              <Segmented
                label="Immersion pace"
                variant="fill"
                size="sm"
                options={[
                  { value: "free", label: "Free schedule" },
                  { value: "scheduled", label: "Create schedule" },
                ]}
                value={enrollment.pace === "scheduled" ? "scheduled" : "free"}
                onChange={(v) => (v === "scheduled" ? setScheduleOpen(true) : router.push("/plan"))}
              />
              {enrollment.pace === "scheduled" && (
                <div className="sg-row" style={{ justifyContent: "space-between" }}>
                  <span className="sg-weekdays" aria-label="Training days">
                    {WEEKDAYS.map((d, i) => (
                      <span key={d} data-on={enrollment.trainingDays.includes(i) ? "" : undefined}>
                        {d.slice(0, 1)}
                      </span>
                    ))}
                  </span>
                  <Link href="/plan" className="sg-link lq-t13">
                    View schedule <Icon name="chevron" size="xs" />
                  </Link>
                </div>
              )}
            </Glass>
          )}

          {sg && board && (board.favourites.length > 0 || board.history.some((h) => h.items > 0)) && (
            <section className="sg-stack" style={{ gap: 8 }} aria-labelledby="sg-rep-h">
              <h2 id="sg-rep-h" className="lq-t17" style={{ margin: 0 }}>
                Repeat a favourite
              </h2>
              <RepeatList
                rows={[...board.favourites, ...board.history.filter((h) => !h.favourite && (h.items > 0 || h.source === "repeat"))].slice(0, 4)}
                slug={program.slug}
                openHref={openHref}
                lessonWord={word}
              />
            </section>
          )}

          {offer && <div className="sg-offer">{offer}</div>}

          {resources.length > 0 && (
            <section className="sg-stack" style={{ gap: 8 }} aria-labelledby="sg-res-h">
              <h2 id="sg-res-h" className="lq-t17" style={{ margin: 0 }}>
                {sectionWord} guides
              </h2>
              <Glass radius="card" className="sg-list">
                {resources.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="sg-li">
                    <span className="sg-li-ic" aria-hidden>
                      <Icon name="down" />
                    </span>
                    <span className="sg-li-t">
                      <span className="lq-t15 sg-ellipsis" style={{ fontWeight: 600 }}>
                        {r.title}
                      </span>
                      <span className="lq-t12 lq-c2">
                        {r.kind.toUpperCase()} · {sections.find((s) => s.id === r.sectionId)?.subtitle ?? "Printable"}
                      </span>
                    </span>
                    <Icon name="chevron" />
                  </a>
                ))}
              </Glass>
            </section>
          )}

          <Glass radius="card" className="sg-list" as="nav" aria-label="Quick links">
            {(sg
              ? [
                  { href: `/programs/${program.slug}/session/home${pathQ ? `?${pathQ}` : ""}`, icon: "compass" as const, t: "Self-Guided home", s: "Levels, every program, how it works" },
                  ...(program.slug === "kettlebell-lifestyle" ? [{ href: `/programs/${program.slug}/session/average-day`, icon: "sun" as const, t: "An average day", s: "One full day, start to finish" }] : []),
                  { href: `/programs/${program.slug}/session/plan`, icon: "sparkle" as const, t: "Create my plan", s: "A multi-week path from real lessons" },
                  { href: "/library", icon: "library" as const, t: "Video library", s: "Every movement, searchable" },
                ]
              : [
                  { href: `/programs/${program.slug}?${[pathQ, "mode=self-guided"].filter(Boolean).join("&")}`, icon: "compass" as const, t: "Self-Guided mode", s: "Every day open, any order" },
                  ...(program.slug === "kettlebell-lifestyle" ? [{ href: `/programs/${program.slug}/session/average-day`, icon: "sun" as const, t: "An average day", s: "See how a full day runs" }] : []),
                  { href: "/library", icon: "library" as const, t: "Video library", s: "Every movement, searchable" },
                  { href: "/tools", icon: "kettlebell" as const, t: "Tools", s: "Kettlebell selector, stretch test" },
                ]
            ).map((q) => (
              <Link key={q.href} href={q.href} className="sg-li">
                <span className="sg-li-ic" aria-hidden>
                  <Icon name={q.icon} />
                </span>
                <span className="sg-li-t">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>
                    {q.t}
                  </span>
                  <span className="lq-t12 lq-c2">{q.s}</span>
                </span>
                <Icon name="chevron" />
              </Link>
            ))}
          </Glass>
        </aside>
      </div>

      {/* ---------------------------------------------------------- progress */}
      {board?.stats && !lockedProgram && (
        <>
          <hr className="sg-rule" />
          <TrainingPanel stats={board.stats} history={board.history.slice(0, 10)} slug={program.slug} lessonWord={word} phases={phaseStats} />
        </>
      )}

      {/* ---------------------------------------------------------- past runs + restart */}
      {(ex?.pastRuns.length || (enrollment && started)) && !lockedProgram ? (
        <section className="sg-stack" style={{ marginTop: "var(--s-6)" }} aria-labelledby="sg-runs-h">
          <div className="sg-sec-h">
            <h2 id="sg-runs-h" className="lq-t17">
              Past runs
            </h2>
            {enrollment && started && (
              <Button variant="plain" size="sm" icon="repeat" onClick={() => setRestartOpen(true)}>
                Restart {path?.shortName ?? "from the beginning"}
              </Button>
            )}
          </div>
          {ex?.pastRuns.length ? (
            <Glass radius="card" className="sg-list">
              {ex.pastRuns.map((r) => (
                <div key={r.runNumber} className="sg-li">
                  <span className="sg-li-ic" aria-hidden>
                    <Icon name={r.completed ? "check" : "repeat"} />
                  </span>
                  <span className="sg-li-t">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>
                      Run {r.runNumber}
                      {r.completed ? " · completed" : ""}
                    </span>
                    <span className="lq-t12 lq-c2 sg-num">
                      {r.lessonsCompleted} lessons · archived {new Date(r.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </span>
                  <span />
                </div>
              ))}
            </Glass>
          ) : (
            <p className="lq-t13 lq-c2" style={{ margin: 0 }}>
              This is your first run of {path?.shortName ?? program.name}. Restarting archives it here and keeps certificates, badges and saves.
            </p>
          )}
        </section>
      ) : null}

      {/* ---------------------------------------------------------- about this level */}
      {path && (path.outcomes.length > 0 || path.format.length > 0 || path.whatsNeeded.length > 0 || (ex?.contributors.length ?? 0) > 0) && (
        <>
          <hr className="sg-rule" />
          <section className="sg-stack sg-measure" style={{ maxWidth: "52rem" }} aria-labelledby="sg-about-h">
            <h2 id="sg-about-h" className="lq-t22" style={{ margin: 0 }}>
              About this {path.kind === "level" ? "level" : "course"}
            </h2>
            <Glass radius="card" className="sg-disc">
              {[
                { t: "What you'll be able to do", items: path.outcomes, open: true },
                { t: "How it's delivered", items: path.format },
                { t: "What you need", items: path.whatsNeeded },
                { t: "Expert contributors", items: (ex?.contributors ?? []).map((c) => (c.credential ? `${c.name} — ${c.credential}` : c.name)) },
              ]
                .filter((d) => d.items.length)
                .map((d) => (
                  <details key={d.t} open={d.open}>
                    <summary>
                      {d.t}
                      <Icon name="chevron" />
                    </summary>
                    <ul>
                      {d.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </details>
                ))}
            </Glass>
            {path.description && <p className="lq-t15 lq-c2" style={{ margin: 0 }}>{path.description}</p>}
          </section>
        </>
      )}

      {sg && (
        <>
          <hr className="sg-rule" />
          <section className="sg-stack" aria-labelledby="sg-how-h">
            <h2 id="sg-how-h" className="lq-t22" style={{ margin: 0 }}>
              How self-guided works
            </h2>
            <div className="sg-how">
              {HOW.map((h) => (
                <Glass key={h.title} radius="card">
                  <Icon name={h.icon} />
                  <h3 className="lq-t15" style={{ fontWeight: 650 }}>
                    {h.title}
                  </h3>
                  <p className="lq-t13 lq-c2">{h.body}</p>
                </Glass>
              ))}
            </div>
          </section>
        </>
      )}

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
