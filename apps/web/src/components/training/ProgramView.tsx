"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import type { LearningMode } from "@ms/core";
import { Button, Glass, Icon, ProgressBar, Segmented, Sheet, Tag, useToast } from "@/components/ui";
import { Climb, PhotoHero, type ClimbPhase } from "@/components/signature";
import type { LessonLite, ProgramPageData } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { enrollAction } from "@/lib/actions/training";
import { programPhoto } from "@/lib/program-photos";
import { Curriculum } from "@/components/selfguided/Curriculum";
import { RepeatList, SelfGuidedBoard } from "@/components/selfguided/Board";
import { TrainingPanel } from "@/components/selfguided/TrainingPanel";
import { PlanWizard } from "@/components/selfguided/PlanWizard";
import { currentFrom, dayTypeShort, lessonHref, lessonLabel, lessonName, WEEKDAYS } from "./model";
import { VideoStage } from "./VideoStage";
import { ScheduleSheet } from "./ScheduleSheet";
import { RestartSheet } from "./RestartSheet";
import "./training.css";
import "@/components/selfguided/selfguided.css";
import "./program-summit.css";

type TrainMode = "immersion" | "self_guided";

const HOW = [
  { icon: "lock" as const, title: "Nothing is locked", body: "Every phase and day is open from the start. Train what suits your body today." },
  { icon: "down" as const, title: "Plans to download", body: "Each phase ships with a printable PDF plan you can take to the gym." },
  { icon: "calendar" as const, title: "Your own calendar", body: "Drop days onto a schedule, set reminders and choose what happens if you miss one." },
];

const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const words = (n: number) => NUM_WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortSection = (t: string) => t.replace(/\s+phase$/i, "");
const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${String(m % 60).padStart(2, "0")}m` : ""}`.trim() : `${m}m`);

/** One-line route headline per camp ("Phase 2 is where it clicks."). */
function routeHeadline(phase: string, index: number, total: number, finished: boolean) {
  if (finished) return "You reached the summit.";
  if (index === 0) return `The ${phase} sets your foundation.`;
  if (index === total - 1) return `${phase} is the push to the summit.`;
  if (index === 1) return `${phase} builds the base.`;
  return `${phase} is where it clicks.`;
}

/**
 * Program page (Summit, mockup 03) in the original layout (Immersion home L4 + level page L5,
 * Self-Guided level page L8): photo hero with the mode switch, the level switch, Your route
 * (The Climb + stats), then the curriculum (phase tabs, day rows) beside the sidebar (today,
 * pace, phase guides, quick links), progress, past runs, about, and the path after this level.
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const [now] = useState(() => Date.now());

  const sg = mode === "self_guided";
  const current = currentFrom(lessons, progress);
  const doneIds = useMemo(() => new Set(progress.filter((p) => p.complete).map((p) => p.lessonId)), [progress]);
  const dayLessons = lessons.filter((l) => l.dayNumber != null && !l.pageType);
  const totalDays = dayLessons.length;
  const doneDays = dayLessons.filter((l) => doneIds.has(l.id)).length;
  const pathDone = lessons.length > 0 && doneIds.size >= lessons.length;
  const started = progress.some((p) => p.doneSteps > 0);
  const word = program.lessonLabel || "Day";
  const sectionWord = program.sectionLabel || "Phase";
  const levelPaths = paths.length > 1;
  const stats = board?.stats ?? null;
  const streak = stats?.streak.current ?? 0;
  const currentSection = sections.find((s) => s.id === current?.sectionId) ?? null;
  const lockedProgram = locked || program.access === "locked";
  const orderLocked = !sg && enrollment?.mode === "immersion";
  const pathQ = path?.key ? `path=${encodeURIComponent(path.key)}` : "";
  const levelName = path?.shortName ?? program.name;
  const pathIndex = paths.findIndex((p) => p.id === path?.id);
  const nextPath = pathIndex >= 0 ? paths[pathIndex + 1] ?? null : null;
  const kbl = program.slug === "kettlebell-lifestyle";
  const hero = programPhoto(program.slug);
  const heroImage = kbl ? { src: "/media/summit/mike-windmill.jpg", alt: "Mike Salemi holding a kettlebell overhead in the gym", focal: "64% 30%", focalPhone: "58% 20%" } : { src: hero.src, alt: hero.alt, focal: hero.position, focalPhone: hero.position };

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

  /* ---------------------------------------------------------------- the climb */
  const camps: ClimbPhase[] = [];
  for (const s of sections) {
    const ds = dayLessons.filter((l) => l.sectionId === s.id).map((l) => l.dayNumber!);
    if (ds.length) camps.push({ label: shortSection(s.title), from: Math.min(...ds), to: Math.max(...ds) });
  }
  const campIndex = Math.max(0, sections.filter((s) => camps.some((c) => c.label === shortSection(s.title))).findIndex((s) => s.id === currentSection?.id));
  const cleared = sections.filter((s) => {
    const ds = dayLessons.filter((l) => l.sectionId === s.id);
    return ds.length > 0 && ds.every((l) => doneIds.has(l.id));
  });
  const leftInPhase = currentSection ? dayLessons.filter((l) => l.sectionId === currentSection.id && !doneIds.has(l.id)).length : 0;
  const workoutsDone = dayLessons.filter((l) => doneIds.has(l.id) && (board?.lessons[l.id]?.intent ?? (/workout|challenge/i.test(l.dayType ?? "") ? "workout" : "")) === "workout").length;
  const pct = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;
  const summitDay = camps.length ? camps[camps.length - 1]!.to : totalDays;

  /* ---------------------------------------------------------------- primary action */
  const resumeLabel = current ? `${started && (enrollment || sg) ? "Resume" : "Start"} ${lessonLabel(current, word)}` : "";
  let cta: ReactNode = null;
  if (lockedProgram) {
    cta = (
      <Button icon="lock" href={`/explore/${program.slug}`} size="lg">
        Unlock {program.name}
      </Button>
    );
  } else if (pathDone) {
    cta = certificateId ? (
      <Button icon="sparkle" href={`/you/certificates/${certificateId}`} size="lg">
        Get your certificate
      </Button>
    ) : (
      <Button icon="repeat" onClick={() => setRestartOpen(true)} size="lg">
        Run {path?.shortName ?? "it"} again
      </Button>
    );
  } else if (current) {
    cta = (
      <Button icon="play" onClick={begin} aria-busy={pending || undefined} size="lg">
        {resumeLabel}
      </Button>
    );
  }

  // Phases count training days, like the hero, the rail, Today and You (lessons only when a phase has no days).
  const phaseStats = sections.map((s) => {
    const days = dayLessons.filter((l) => l.sectionId === s.id);
    const ls = days.length ? days : lessons.filter((l) => l.sectionId === s.id);
    return { title: s.title, done: ls.filter((l) => doneIds.has(l.id)).length, total: ls.length };
  });
  const ex = board?.extras;
  const nextDay = current ? dayLessons.find((l) => (l.dayNumber ?? 0) > (current.dayNumber ?? 0) && /workout/i.test(l.dayType ?? "")) ?? null : null;
  const perWeek = enrollment?.trainingDays.length ?? 0;
  const finishOn = enrollment?.pace === "scheduled" && perWeek > 0 ? new Date(now + Math.ceil((totalDays - doneDays) / perWeek) * 7 * 86400000) : null;
  const curExtra = current ? board?.lessons[current.id] : undefined;
  const todayPhoto = curExtra?.intent === "recovery" || curExtra?.intent === "mobility" ? programPhoto("working-in") : curExtra?.intent === "skill" ? programPhoto("athleticism-4-life") : programPhoto("free-6-video-kettlebell-mini-series");

  return (
    <div className="pv">
      {/* ---------------------------------------------------------- hero */}
      <PhotoHero
        className="pv-hero"
        image={heroImage}
        minHeight={520}
        priority
        overlay={
          trainModes.length > 1 && !lockedProgram ? (
            <div className="pv-modes" role="radiogroup" aria-label="How you train">
              {trainModes.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={m === mode} className="pv-mode lq-press" onClick={() => chooseMode(m)}>
                  <Icon name={m === "immersion" ? "compass" : "filter"} size="sm" />
                  {m === "immersion" ? "Immersion" : "Self-Guided"}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        <Tag tone="light">{kbl ? "Mike Salemi · Flagship program" : program.formatLabel ?? "Program"}</Tag>
        <h1 className="lq-d-xxl pv-title">{program.name}</h1>
        {(path?.tagline || program.summary) && <p className="pv-lede">{kbl && path?.key === "beginner" ? "Sixty-one days that rebuild how you move, train and recover — one guided day at a time." : path?.tagline ?? program.summary}</p>}
        <p className="pv-caps">
          <span>
            <b>{sections.length}</b> {sectionWord.toLowerCase()}s
          </span>
          <span>
            <b>{totalDays}</b> {word.toLowerCase()}s
          </span>
          {path?.shortName && (
            <span>
              <b>{path.shortName}</b>
            </span>
          )}
          {streak > 0 && (
            <span className="pv-caps-streak">
              <Icon name="flame" size="xs" />
              {streak} day streak
            </span>
          )}
          {sg && <span>Self-Guided</span>}
        </p>
        <div className="pv-actions">
          {cta}
          {sg && !lockedProgram && (
            <Button variant="onphoto" size="lg" icon="calendar" onClick={() => setWizardOpen(true)}>
              Plan my weeks
            </Button>
          )}
          {ex?.heroVideo && (
            <Button variant="onphoto" size="lg" icon={intro ? "close" : "play"} onClick={() => setIntro((v) => !v)} aria-expanded={intro} className={sg ? "pv-hide-phone" : undefined}>
              {intro ? "Close intro" : "Watch intro"}
            </Button>
          )}
        </div>
        {!lockedProgram && totalDays > 0 && (
          <div className="pv-prog">
            <ProgressBar value={doneDays / totalDays} tone="white" size="thin" label={`${pct}% of ${levelName}`} />
            <b className="lq-num">
              {doneDays} / {totalDays} {word.toLowerCase()}s · {pct}%
            </b>
          </div>
        )}
      </PhotoHero>
      {intro && ex?.heroVideo && (
        <div className="pv-intro sg-in">
          <VideoStage video={ex.heroVideo} poster={heroImage.src} title={`${program.name} introduction`} autoStart />
        </div>
      )}

      {/* ---------------------------------------------------------- level switch */}
      {levelPaths && (
        <div className="pv-levels">
          <nav className="pv-levels-seg" aria-label="Level">
            {paths.map((p, i) => {
              const ahead = pathIndex >= 0 && i > pathIndex && !pathDone && enrollment?.mode === "immersion";
              return (
                <Link key={p.id} href={levelHref(p.key, p.id)} scroll={false} replace className="pv-level lq-press" aria-current={p.id === path?.id ? "page" : undefined}>
                  {ahead && <Icon name="flag" size="xs" />}
                  {p.name}
                </Link>
              );
            })}
          </nav>
          {nextPath && !lockedProgram && (
            <p className="lq-t13 lq-c3 pv-levels-note">
              {nextPath.shortName ?? nextPath.name} {pathDone ? "is open — your next climb." : `comes after the ${word} ${summitDay} summit — it's included in your plan.`}
            </p>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------- your route */}
      {!lockedProgram && camps.length > 1 && (
        <Glass as="section" radius="card" className="pv-route" aria-labelledby="pv-route-h">
          <div className="pv-route-t">
            <p className="lq-eyebrow" data-tone="accent">
              Your route · {levelName}
            </p>
            <h2 id="pv-route-h" className="lq-d-lg">
              {routeHeadline(camps[campIndex]?.label ?? "This phase", campIndex, camps.length, pathDone)}
            </h2>
            <p className="lq-t15 lq-c2 pv-route-p">
              {pathDone
                ? `Every ${word.toLowerCase()} of ${levelName} is done. ${nextPath ? `${nextPath.shortName ?? nextPath.name} is your next climb.` : "Run it again any time."}`
                : doneDays === 0
                  ? `${cap(words(totalDays))} ${word.toLowerCase()}s, ${words(camps.length)} camps, one summit. Start at the On Ramp and climb one guided ${word.toLowerCase()} at a time.`
                  : `${cleared.length ? `You've cleared ${cleared.map((s) => (s.title.match(/^on ramp/i) ? "the On Ramp" : shortSection(s.title))).join(" and ")}. ` : ""}${cap(words(leftInPhase))} ${word.toLowerCase()}${leftInPhase === 1 ? "" : "s"} of ${shortSection(currentSection?.title ?? "this phase")} left, then the push to the ${word} ${summitDay} summit.`}
            </p>
            <dl className="pv-stats">
              <div>
                <dt>{word}s done</dt>
                <dd className="lq-dnum">{doneDays}</dd>
              </div>
              <div>
                <dt>Workouts</dt>
                <dd className="lq-dnum">{workoutsDone}</dd>
              </div>
              {stats && (
                <div>
                  <dt>Time trained</dt>
                  <dd className="lq-dnum">{hm(stats.minutes)}</dd>
                </div>
              )}
              {stats && (
                <div>
                  <dt>Best streak</dt>
                  <dd className="lq-dnum">{stats.streak.best}</dd>
                </div>
              )}
            </dl>
          </div>
          <Climb id="pv-climb" phases={camps} done={doneDays} total={summitDay} member={{ name: "You" }} height={300} className="pv-climb" />
        </Glass>
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
      <div className="pv-body">
        <div className="pv-main">
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

          {kbl && nextDay && !lockedProgram && (
            <Link href="/explore/mastering-the-kettlebell" className="pv-pair lq-press">
              <span className="pv-pair-ph">
                <Image src="/media/summit/mike-deadlift.jpg" alt="" fill sizes="180px" style={{ objectPosition: "50% 30%" }} />
              </span>
              <span className="pv-pair-t">
                <Tag tone="accent">Pairs with {lessonLabel(nextDay, word)}</Tag>
                <b className="lq-d-sm">Your {dayTypeShort(nextDay.dayType) || lessonName(nextDay)} lifts, frame by frame</b>
                <span className="lq-t13 lq-c2">
                  {lessonLabel(nextDay, word)} brings the next {dayTypeShort(nextDay.dayType).toLowerCase() || "workout"}. Mastering the Kettlebell has Mike&apos;s full breakdown of every lift in {shortSection(currentSection?.title ?? "this phase")}.
                </span>
              </span>
              <span className="pv-pair-a">
                <span className="lq-btn" data-variant="secondary" data-size="sm">
                  <span>Preview a lesson</span>
                </span>
                <span className="lq-t12 lq-c3">Mike&apos;s technique library</span>
              </span>
            </Link>
          )}
        </div>

        <aside className="pv-side" aria-label="Plan and options">
          {!lockedProgram && current && !sg && (
            <Link href={currentHref ?? "#"} className="pv-today lq-press">
              <span className="pv-today-ph">
                <Image src={todayPhoto.src} alt="" fill sizes="320px" style={{ objectPosition: todayPhoto.position }} />
              </span>
              <span className="pv-today-t">
                <span className="lq-eyebrow" data-tone="warm">
                  {enrollment?.pace === "scheduled" ? "On the plan today" : "Next on your plan"} · {new Date().toLocaleDateString("en-US", { weekday: "long" })}
                </span>
                <b className="lq-d-sm">
                  {lessonLabel(current, word)}
                  {current.dayNumber != null ? ` · ${lessonName(current)}${/day$/i.test(current.dayType ?? "") ? " Day" : ""}` : ""}
                </b>
                <span className="lq-t13">
                  {[path?.shortName, currentSection ? shortSection(currentSection.title) : null, curExtra?.minutes ? `${curExtra.minutes} min` : null].filter(Boolean).join(" · ")}
                </span>
                <span className="lq-btn pv-today-go" data-variant="warm" data-size="md">
                  <Icon name="play" size="xs" />
                  <span>{started ? "Start today's session" : "Start"}</span>
                </span>
              </span>
            </Link>
          )}

          {sg && !lockedProgram && (
            <Glass radius="card" className="pv-card">
              <p className="lq-d-xs">Plan your weeks</p>
              <p className="lq-t13 lq-c2">Pick your days and a start date. We lay out {levelName}&apos;s real day order as your schedule.</p>
              <Button size="md" icon="calendar" onClick={() => setWizardOpen(true)}>
                Plan my weeks
              </Button>
            </Glass>
          )}

          {!sg && enrollment?.mode === "immersion" && (
            <Glass radius="card" className="pv-card">
              <div className="pv-card-h">
                <p className="lq-d-xs">Your pace</p>
                <Segmented
                  label="Immersion pace"
                  variant="fill"
                  size="sm"
                  options={[
                    { value: "free", label: "Free" },
                    { value: "scheduled", label: "Scheduled" },
                  ]}
                  value={enrollment.pace === "scheduled" ? "scheduled" : "free"}
                  onChange={(v) => (v === "scheduled" ? setScheduleOpen(true) : router.push("/plan"))}
                />
              </div>
              <span className="pv-weekdays" aria-label="Training days">
                {[1, 2, 3, 4, 5, 6, 0].map((i) => (
                  <span key={i} data-on={enrollment.trainingDays.includes(i) ? "" : undefined}>
                    {WEEKDAYS[i]!.slice(0, 1)}
                  </span>
                ))}
              </span>
              <p className="lq-t13 lq-c2">
                {enrollment.pace === "scheduled" && finishOn
                  ? `${perWeek} days a week · finish ${levelName} on ${finishOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Train the next day whenever you're ready — no dates."}
              </p>
              <div className="pv-card-a">
                <Button size="sm" variant="secondary" icon="calendar" href="/plan/calendar.ics">
                  Sync calendar
                </Button>
                <Link href="/plan" className="lq-link">
                  View schedule
                </Link>
              </div>
            </Glass>
          )}

          {sg && board && (board.favourites.length > 0 || board.history.some((h) => h.items > 0)) && (
            <section className="pv-stack" aria-labelledby="sg-rep-h">
              <h2 id="sg-rep-h" className="lq-d-xs">
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

          {resources.length > 0 && (
            <Glass radius="card" className="pv-card pv-guides" as="section" aria-labelledby="pv-res-h">
              <h2 id="pv-res-h" className="lq-d-xs">
                {sectionWord} guides
              </h2>
              {resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="pv-guide lq-press">
                  <span className="pv-pdf" aria-hidden>
                    {r.kind.toUpperCase().slice(0, 3)}
                  </span>
                  <span className="pv-guide-t">
                    <b>{r.title}</b>
                    <span>{sections.find((s) => s.id === r.sectionId)?.subtitle ?? "Printable"}</span>
                  </span>
                  <Icon name="download" size="sm" className="lq-c3" />
                </a>
              ))}
            </Glass>
          )}

          {offer && <div className="pv-offer">{offer}</div>}

          <Glass radius="card" className="pv-card pv-links" as="nav" aria-label="Quick links">
            {(sg
              ? [
                  { href: `/programs/${program.slug}/session/home${pathQ ? `?${pathQ}` : ""}`, icon: "compass" as const, t: "Self-Guided home", s: "Levels, every program, how it works" },
                  ...(kbl ? [{ href: `/programs/${program.slug}/session/average-day`, icon: "sun" as const, t: "An average day", s: "One full day, start to finish" }] : []),
                  { href: `/programs/${program.slug}/session/wizard${pathQ ? `?${pathQ}` : ""}`, icon: "sparkle" as const, t: "Build a plan", s: "Three questions, then your real week" },
                  { href: `/plan?program=${program.slug}`, icon: "calendar" as const, t: "Schedule", s: "This program on your one schedule" },
                  { href: "/library", icon: "library" as const, t: "Video library", s: "Every movement, searchable" },
                ]
              : [
                  { href: `/programs/${program.slug}?${[pathQ, "mode=self-guided"].filter(Boolean).join("&")}`, icon: "filter" as const, t: "Self-Guided mode", s: "Train any day, in any order" },
                  ...(kbl ? [{ href: `/programs/${program.slug}/session/average-day`, icon: "grid" as const, t: "An average day", s: "See how a full day runs" }] : []),
                  { href: "/library", icon: "library" as const, t: "Video library", s: "Every movement with Mike" },
                  { href: "/tools", icon: "tools" as const, t: "Tools", s: "Kettlebell selector & more" },
                ]
            ).map((q) => (
              <Link key={q.href} href={q.href} className="pv-link lq-press">
                <span className="pv-link-ic" aria-hidden>
                  <Icon name={q.icon} size="sm" />
                </span>
                <span className="pv-link-t">
                  <b>{q.t}</b>
                  <span>{q.s}</span>
                </span>
                <Icon name="chevron" size="sm" className="lq-c3" />
              </Link>
            ))}
          </Glass>
        </aside>
      </div>

      {/* ---------------------------------------------------------- progress */}
      {board?.stats && !lockedProgram && (
        <section className="pv-sec">
          <TrainingPanel stats={board.stats} history={board.history.slice(0, 10)} slug={program.slug} lessonWord={word} phases={phaseStats} />
        </section>
      )}

      {/* ---------------------------------------------------------- past runs + restart */}
      {(ex?.pastRuns.length || (enrollment && started)) && !lockedProgram ? (
        <section className="pv-sec pv-stack" aria-labelledby="sg-runs-h">
          <div className="pv-sec-h">
            <h2 id="sg-runs-h" className="lq-d-xs">
              Past runs
            </h2>
            {enrollment && started && (
              <Button variant="plain" size="sm" icon="repeat" onClick={() => setRestartOpen(true)}>
                Restart {path?.shortName ?? "from the beginning"}
              </Button>
            )}
          </div>
          {ex?.pastRuns.length ? (
            <Glass radius="card" className="pv-card">
              {ex.pastRuns.map((r) => (
                <div key={r.runNumber} className="pv-link">
                  <span className="pv-link-ic" aria-hidden>
                    <Icon name={r.completed ? "check" : "repeat"} size="sm" />
                  </span>
                  <span className="pv-link-t">
                    <b>
                      Run {r.runNumber}
                      {r.completed ? " · completed" : ""}
                    </b>
                    <span className="lq-num">
                      {r.lessonsCompleted} lessons · archived {new Date(r.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </span>
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
        <section className="pv-sec pv-stack pv-about" aria-labelledby="sg-about-h">
          <h2 id="sg-about-h" className="lq-d-sm">
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
      )}

      {sg && (
        <section className="pv-sec pv-stack" aria-labelledby="sg-how-h">
          <h2 id="sg-how-h" className="lq-d-sm">
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
      )}

      {/* ---------------------------------------------------------- the path after this level */}
      {kbl && <PathAfter levelName={levelName} pct={pct} nextPath={nextPath} slug={program.slug} pathDone={pathDone} summitDay={summitDay} word={word} />}

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
      {!lockedProgram && (
        <Sheet open={wizardOpen} onClose={() => setWizardOpen(false)} title="Plan your weeks" description={`${program.name} already has a day-by-day plan. Pick your days and we lay it out on your calendar.`} detents={["large"]}>
          {wizardOpen && <PlanWizard data={data} board={board ?? null} onDone={() => setWizardOpen(false)} />}
        </Sheet>
      )}
    </div>
  );
}

function PathAfter({ levelName, pct, nextPath, slug, pathDone, summitDay, word }: { levelName: string; pct: number; nextPath: ProgramPageData["paths"][number] | null; slug: string; pathDone: boolean; summitDay: number; word: string }) {
  const steps = [
    { t: levelName, s: `You are here · ${pct}%`, now: true },
    ...(nextPath ? [{ t: nextPath.shortName ?? nextPath.name, s: "Intermediate · included", now: false }] : []),
    { t: "Mastering the Kettlebell", s: "Technique, 400+ videos", now: false },
    { t: "Men of Movement", s: "In person, Mount Shasta", now: false },
  ];
  const cards = [
    ...(nextPath
      ? [{ href: `/programs/${slug}?path=${nextPath.key ?? nextPath.id}`, img: "/media/summit/mike-getup.jpg", pos: "50% 25%", tag: pathDone ? "Open now" : `Unlocks at ${word} ${summitDay}`, light: true, t: nextPath.name, s: nextPath.tagline ?? "Four new phases: heavier bells, complexes and flows. Included in your plan.", cta: `Preview ${nextPath.shortName ?? "the next level"}` }]
      : []),
    { href: "/explore/mastering-the-kettlebell", img: "/media/summit/mike-deadlift.jpg", pos: "50% 30%", tag: "Best next step", light: false, t: "Mastering the Kettlebell", s: "Mike's complete technique library — mapped to every lift in Levels I and II.", cta: "See what's inside" },
    { href: "/experiences", img: "/media/summit/fire.jpg", pos: "50% 50%", tag: "Retreats", light: true, t: "Men of Movement retreats", s: "Days with Mike on Mount Shasta. A small group of men, by application.", cta: "Apply" },
  ];
  return (
    <section className="pv-sec pv-path" aria-labelledby="pv-path-h">
      <div className="pv-sec-h">
        <div>
          <p className="lq-eyebrow" data-tone="accent">
            When you&apos;re ready for more
          </p>
          <h2 id="pv-path-h" className="lq-d-lg">
            The path Mike built after {levelName}
          </h2>
        </div>
        <Link href="/programs" className="lq-link">
          All programs <Icon name="arrowRight" size="xs" />
        </Link>
      </div>
      <Glass radius="card" className="pv-path-card">
        <ol className="pv-path-steps">
          {steps.map((s, i) => (
            <li key={s.t} data-now={s.now ? "" : undefined}>
              <span className="pv-path-n" aria-hidden>
                {s.now ? <i /> : i + 1}
              </span>
              <b>{s.t}</b>
              <span>{s.s}</span>
            </li>
          ))}
        </ol>
        <div className="pv-path-cards">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="pv-path-c lq-press">
              <span className="pv-path-ph">
                <Image src={c.img} alt="" fill sizes="(min-width: 900px) 360px, 100vw" style={{ objectPosition: c.pos }} />
                <Tag tone={c.light ? "light" : "accent"} className="pv-path-tag">
                  {c.tag}
                </Tag>
              </span>
              <span className="pv-path-t">
                <b>{c.t}</b>
                <span>{c.s}</span>
                <span className="pv-path-cta">
                  {c.cta} <Icon name="arrowRight" size="xs" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Glass>
    </section>
  );
}
