import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { NextStepCard } from "@/components/signature";
import { Button, Icon } from "@/components/ui";
import { coverFor } from "@/lib/covers";
import { allLessons, progressOf } from "@/lib/journey";
import type { CourseData } from "@/lib/loaders/course";
import { PacePlanner, type PaceSession } from "./PacePlanner";
import { Meter } from "./parts";
import { BlockPlan, PhaseRoute, Pillars, SeriesReel, Shelves, SkillTree, StepLadder, WeekTrail, pathLessons, type ViewProps } from "./views";
import "./journey.css";

export type JourneyData = CourseData & { resumeId: string };

/**
 * Journey home for a course-type program (`/programs/[slug]/course`): the program's signature way
 * through it. Same skeleton for every program (hero → signature view + side rail), different
 * categorisation, progress view, theme and planned self-guided path per `program.journey`.
 */
export function JourneyHome({ data }: { data: JourneyData }) {
  const { program } = data;
  const cfg = program.journey;
  const slug = program.slug;
  const locked = data.locked;
  const href = (id: string) => `/programs/${slug}/course/${id}`;
  const lessons = allLessons(data.groups);
  const done = new Set(lessons.filter((l) => l.done).map((l) => l.id));
  const p = progressOf(lessons, done);
  const started = p.done > 0 || Boolean(data.lastLessonId);
  // Resume where they left off; if that lesson is finished, the next unfinished one after it.
  const lastIdx = lessons.findIndex((l) => l.id === data.resumeId);
  const resume = lastIdx >= 0 && !done.has(lessons[lastIdx]!.id) ? lessons[lastIdx]! : lessons.slice(Math.max(0, lastIdx + 1)).find((l) => !done.has(l.id)) ?? p.next;
  const nextId = started ? resume?.id ?? null : p.next?.id ?? null;
  const vp: ViewProps = { data, cfg, done, href, nextId };

  // The one obvious next step.
  const mtk = data.mtk;
  const primary = locked
    ? { label: "See access options", href: `/explore/${slug}`, icon: "lock" as const }
    : mtk?.plan
      ? { label: "Resume My Plan", href: "/mtk", icon: "play" as const }
      : !started && data.intro
        ? { label: "Start here", href: `/programs/${slug}/course/start`, icon: "play" as const }
        : p.pct >= 1
          ? { label: "Review the course", href: `/programs/${slug}/course/start`, icon: "repeat" as const }
          : { label: started ? `Resume · ${resume?.title ?? "next lesson"}` : `Begin · ${p.next?.title ?? "first lesson"}`, href: href((started ? resume : p.next)?.id ?? "start"), icon: "play" as const };

  const path = pathLessons(data, cfg);
  const sessions: PaceSession[] = mtk?.plan
    ? mtk.plan.days.map((d) => ({ id: `d${d.day}`, title: `Day ${d.day} · ${d.title}`, href: `${href(d.lessonIds.find((id) => !done.has(id)) ?? d.lessonIds[0] ?? "start")}?mode=plan`, done: d.lessonIds.every((id) => done.has(id)) }))
    : cfg.kind === "weeks"
      ? data.groups.flatMap((g) => g.sections).map((s) => {
          const pr = progressOf(s.lessons, done);
          return { id: s.id, title: s.title, href: href((pr.next ?? s.lessons[0])?.id ?? "start"), done: pr.pct >= 1 };
        })
      : path.map((l) => ({ id: l.id, title: l.title, href: mtk?.plan ? `${href(l.id)}?mode=plan` : href(l.id), done: done.has(l.id) }));
  const pathP = progressOf(path, done);
  const unitCount = cfg.kind === "weeks" ? sessions.length : path.length;

  const heroPct = mtk?.plan ? pathP.pct : p.pct;
  const nextCover = cfg.next ? coverFor(cfg.next.slug) : null;
  const intakeHref = data.intake ? (mtk ? (data.intake.done ? "/mtk/results" : `/intake/${slug}`) : `/intake/${slug}`) : null;

  return (
    <div className="jy" data-theme={cfg.theme} data-kind={cfg.kind}>
      <nav className="jy-crumbs" aria-label="Breadcrumb">
        <Link href="/programs"><Icon name="back" size="xs" /> Programs</Link>
      </nav>

      <header className="jy-hero">
        <div className="jy-hero-panel">
          <span className="jy-hero-tag">{cfg.eyebrow}</span>
          <h1 className="jy-hero-t">{program.name}</h1>
          <p className="jy-hero-p">{cfg.promise}</p>
          {cfg.facts && (
            <div className="jy-hero-facts">
              {cfg.facts.map((f) => <span key={f}>{f}</span>)}
            </div>
          )}
          <div className="jy-hero-acts">
            <Button href={primary.href} variant={started && !locked ? "warm" : "filled"} size="lg" icon={primary.icon} className="jy-hero-cta">
              <span className="jy-ellipsis">{primary.label}</span>
            </Button>
            {slug === "kettlebell-roadmap" && (
              <Button href="/tools/roadmap" variant="onphoto" size="lg" icon="map">Find my phase</Button>
            )}
            {!locked && (
              <Button href={`/programs/${slug}/course/${data.resumeId}${mtk ? "?mode=full" : ""}`} variant="onphoto" size="lg" icon="steps">
                {cfg.kind === "skills" ? "Full curriculum" : "All lessons"}
              </Button>
            )}
          </div>
          {!locked && p.total > 0 && (
            <div className="jy-hero-prog">
              <Meter value={heroPct} size={50} stroke={5} onPhoto label={<span className="lq-num">{Math.round(heroPct * 100)}%</span>} />
              <span>
                <b>{mtk?.plan ? "My Plan" : started ? "Your progress" : "Not started yet"}</b>
                <small className="lq-num">{mtk?.plan ? `${pathP.done} of ${pathP.total} recommended lessons` : `${p.done} of ${p.total} lessons`}</small>
              </span>
            </div>
          )}
        </div>
        <figure className="jy-hero-photo" style={{ "--focal": program.cover.focal, "--focal-phone": program.cover.focalPhone } as CSSProperties}>
          <Image src={program.cover.src} alt={program.cover.alt} fill priority sizes="(min-width: 1024px) 480px, 100vw" />
          {cfg.artwork && (
            <span className="jy-brand">
              <Image src={cfg.artwork.src} alt={cfg.artwork.alt} width={cfg.artwork.width} height={cfg.artwork.height} sizes="240px" />
            </span>
          )}
        </figure>
      </header>

      <div className="jy-cols">
        <div className="jy-main">
          {mtk && <MtkPathCard data={data} />}
          {cfg.kind === "skills" && <SkillTree {...vp} />}
          {cfg.kind === "skills" && <Shelves {...vp} title="Bonus library" eyebrow="Beyond the lifts" />}
          {cfg.kind === "blocks" && <BlockPlan {...vp} />}
          {cfg.kind === "blocks" && <Shelves {...vp} />}
          {cfg.kind === "series" && <SeriesReel {...vp} />}
          {cfg.kind === "weeks" && <WeekTrail {...vp} />}
          {cfg.kind === "pillars" && <Pillars {...vp} />}
          {cfg.kind === "steps" && <StepLadder {...vp} />}
          {cfg.kind === "route" && <PhaseRoute {...vp} />}
          {cfg.next && nextCover && (
            <section className="jy-block" aria-labelledby="jy-next-h">
              <p className="jy-eyebrow">{p.pct >= 1 ? "You finished. Here's the next step" : "When you're ready for more"}</p>
              <h2 id="jy-next-h" className="lq-sr">Next step</h2>
              <NextStepCard
                className="jy-nextcard"
                tag={{ label: p.pct >= 1 ? "Best next step" : "Next step", tone: "accent" }}
                title={cfg.next.label}
                meta={cfg.next.reason}
                href={cfg.next.href}
                cta={cfg.next.cta}
                image={{ src: nextCover.src, alt: nextCover.alt, position: nextCover.focal }}
              />
            </section>
          )}
        </div>

        <aside className="jy-side" aria-label="Your path">
          {cfg.pace && !locked && sessions.length > 0 && (
            <PacePlanner slug={slug} sessions={sessions} perWeek={cfg.pace.perWeek} options={cfg.pace.options} minutes={cfg.pace.minutes} note={cfg.pace.note} unit={cfg.kind === "weeks" ? { one: "week", many: "weeks" } : mtk?.plan ? { one: "learning day", many: "learning days" } : cfg.kind === "skills" ? { one: "lesson", many: "lessons" } : cfg.unit} />
          )}
          <div className="jy-card jy-facts">
            <p className="jy-eyebrow">At a glance</p>
            <dl>
              <div><dt>{cfg.kind === "pillars" ? "Pillars" : cfg.unit.many[0]!.toUpperCase() + cfg.unit.many.slice(1)}</dt><dd className="lq-num">{cfg.kind === "skills" ? (cfg.tiers ?? []).reduce((n, t) => n + t.families.length, 0) : cfg.kind === "pillars" ? cfg.pillars?.length ?? 0 : unitCount}</dd></div>
              <div><dt>Lessons</dt><dd className="lq-num">{p.total}</dd></div>
              <div><dt>Done</dt><dd className="lq-num">{p.done}</dd></div>
            </dl>
            {program.highlights.length > 0 && (
              <ul className="jy-ticks">
                {program.highlights.map((h) => <li key={h}><Icon name="check" size="xs" />{h}</li>)}
              </ul>
            )}
          </div>
          {intakeHref && !mtk && (
            <Link href={intakeHref} className="jy-card jy-intake lq-press">
              <span className="jy-intake-ic" aria-hidden><Icon name="clipboard" size="sm" /></span>
              <span>
                <b>{data.intake?.done ? "Your program approach" : "Tailor it to you"}</b>
                <small>{data.intake?.done ? "Review the priorities from your intake." : "A few questions so Mike's guidance fits where you are."}</small>
              </span>
              <Icon name="chevron" size="xs" className="jy-row-go" />
            </Link>
          )}
          <div className="jy-card jy-mike">
            <Image src="/media/summit/mike-face.png" alt="" width={44} height={44} className="jy-mike-face" />
            <span>
              <b>{program.instructor}</b>
              <small>{slug === "working-in" ? "with Paul Chek" : "Your coach"}</small>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** MTK: assessment → results → My Plan → mastery, with the one next action. */
function MtkPathCard({ data }: { data: JourneyData }) {
  const m = data.mtk!;
  const lessons = allLessons(data.groups);
  const doneIds = new Set(lessons.filter((l) => l.done).map((l) => l.id));
  const planDays = m.plan?.days ?? [];
  const day = planDays.find((d) => d.lessonIds.some((id) => !doneIds.has(id))) ?? planDays[planDays.length - 1];
  const steps = [
    { label: "Assessment", sub: m.assessmentDone ? "Done" : "2 minutes", state: m.assessmentDone ? "done" : "now" },
    { label: "Your results", sub: m.assessmentDone ? "Level, strengths, gaps" : "After the assessment", state: m.assessmentDone ? (m.plan ? "done" : "now") : "ahead" },
    { label: "My Plan", sub: m.plan && day ? `Day ${day.day} of ${planDays.length}` : "Your schedule", state: m.plan ? "now" : "ahead" },
    { label: "Mastery", sub: "Every movement", state: "ahead" },
  ];
  const cta = !m.assessmentDone
    ? { label: "Take the assessment", href: `/intake/${data.program.slug}`, note: "Tell Mike who you are, what you lift and how much time you have. He'll recommend where to start." }
    : !m.plan
      ? { label: "Finish my plan", href: "/mtk/results", note: "Your results are ready. Choose weeks, days and minutes and your plan builds itself." }
      : { label: "Open My Plan", href: "/mtk", note: day ? `Today: Day ${day.day} · ${day.title}. ${m.plan.lessonIds.length} lessons picked for you.` : "Every recommended lesson is done." };
  return (
    <section className="jy-card jy-mtkpath" aria-labelledby="jy-mtkpath-h">
      <div className="jy-mtkpath-top">
        <div>
          <p className="jy-eyebrow">Your path through MTK</p>
          <h2 id="jy-mtkpath-h" className="jy-h3">{m.plan ? "Your plan is running" : m.assessmentDone ? "One step to your plan" : "Start with a 2-minute assessment"}</h2>
          <p className="jy-note">{cta.note}</p>
        </div>
        <Button href={cta.href} variant={m.plan ? "warm" : "filled"} size="md" iconAfter="arrowRight">{cta.label}</Button>
      </div>
      <ol className="jy-ladder4">
        {steps.map((s, i) => (
          <Fragment key={s.label}>
            <li data-state={s.state}>
              <span className="jy-ladder4-dot" aria-hidden>{s.state === "done" ? <Icon name="check" size="xs" /> : <b className="lq-num">{i + 1}</b>}</span>
              <b>{s.label}</b>
              <small>{s.sub}</small>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
