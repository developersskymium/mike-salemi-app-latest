import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Icon } from "@/components/ui";
import { JoinButton } from "@/components/today/JoinButton";
import { allLessons, progressOf } from "@/lib/journey";
import type { CourseData } from "@/lib/loaders/course";
import { Navigator } from "./Navigator";
import { ProgramCover } from "./ProgramCover";
import { a4lUnits, mtkUnits, openFirst, progressBadges, unitOf } from "./units";
import { BadgeRow, CoverActions, FinishLine, MoreMenu, WhatYouGet } from "./PageExtras";
import { PHOTO, programCover } from "@/lib/photos";
import "./journeys.css";

export const A4L_SLUG = "athleticism-4-life";

/**
 * Main page for MTK (skill tree condensed into a movement strip + My Plan entry) and Athleticism 4
 * Life (training blocks strip with session cards): cover + one action, then the navigator.
 */
export function CourseHome({ data, offer }: { data: CourseData & { resumeId: string }; offer?: ReactNode }) {
  const { program } = data;
  const slug = program.slug;
  const isMtk = Boolean(data.mtk) || slug === "mastering-the-kettlebell";
  const href = (id: string) => `/programs/${slug}/course/${id}`;
  const lessons = allLessons(data.groups);
  const done = new Set(lessons.filter((l) => l.done).map((l) => l.id));
  const p = progressOf(lessons, done);
  const started = p.done > 0 || Boolean(data.lastLessonId);
  const lastIdx = lessons.findIndex((l) => l.id === data.resumeId);
  const resume = lastIdx >= 0 && !done.has(lessons[lastIdx]!.id) ? lessons[lastIdx]! : lessons.slice(Math.max(0, lastIdx + 1)).find((l) => !done.has(l.id)) ?? p.next;
  const nextId = started ? resume?.id ?? null : p.next?.id ?? null;
  const plan = data.mtk?.plan ?? null;
  const planIds = new Set(plan?.lessonIds ?? []);
  const built = isMtk ? mtkUnits(data, href, nextId, planIds) : a4lUnits(data, href, nextId);
  const units = data.locked ? openFirst(built) : built;
  const here = unitOf(units, nextId);
  const special = isMtk
    ? { label: "First movement", sub: "Finish every lesson of one movement", earned: built.some((u) => u.total > 0 && u.done >= u.total) }
    : { label: "Block 1 done", sub: "Finish Weeks 1 and 2", earned: built.filter((u) => /^Week [12]$/.test(u.label)).every((u) => u.total > 0 && u.done >= u.total) };
  const items = isMtk
    ? [
        { label: "Full curriculum", href: `${href(data.resumeId)}?mode=full`, icon: "steps" as const },
        ...(data.mtk?.assessmentDone ? [{ label: "My results", href: "/mtk/results", icon: "trophy" as const }] : []),
        { label: data.mtk?.assessmentDone ? "Retake the assessment" : "Take the assessment", href: `/intake/${slug}`, icon: "clipboard" as const },
      ]
    : [
        ...(data.intro ? [{ label: "Start here: the introduction", href: href("start"), icon: "play" as const }] : []),
        { label: "Your schedule", href: "/plan", icon: "calendar" as const },
        ...(data.intake ? [{ label: data.intake.done ? "Your program approach" : "Tailor it to you", href: `/intake/${slug}`, icon: "clipboard" as const }] : []),
      ];
  const planDay = plan?.days.find((d) => d.lessonIds.some((id) => !done.has(id))) ?? null;
  const nextNode = lessons.find((l) => l.id === nextId);
  const nextLabel = nextNode ? (/^day\s*\d+$/i.test(nextNode.title) ? nextNode.title : nextNode.title) : null;

  let cta: ReactNode;
  if (data.locked) cta = <Button href={`/explore/${slug}`} icon="lock" size="lg">See access options</Button>;
  else if (!data.enrolled && !started) cta = <JoinButton programId={program.id} pathId={null} name={program.name} variant="filled" size="lg" label={`Start ${isMtk ? "MTK" : program.name}`} />;
  else if (plan && planDay) cta = <Button href="/mtk" icon="play" variant="warm" size="lg">Continue My Plan · Day {planDay.day}</Button>;
  else if (p.pct >= 1) cta = <Button href={href("start")} icon="repeat" size="lg">Review the course</Button>;
  else if (!started && data.intro) cta = <Button href={href("start")} icon="play" size="lg">Start here</Button>;
  else cta = (
    <Button href={href(nextId ?? "start")} icon="play" size="lg" variant={started ? "warm" : "filled"}>
      <span className="jh-ellipsis">{started ? "Continue" : "Start"} · {here && !isMtk ? `${here.label} · ` : ""}{nextLabel ?? "next lesson"}</span>
    </Button>
  );

  const cover = programCover(slug) ?? program.cover;
  const art = program.journey.artwork;

  return (
    <div className="jh" data-program={isMtk ? "mtk" : "a4l"} data-jy-theme={program.journey.theme}>
      <ProgramCover
        eyebrow={isMtk ? "Movement mastery · with Mike Salemi" : "Suples approved · Bulgarian bag + kettlebell"}
        title={program.name}
        promise={isMtk ? "Every kettlebell lift as a skill: pre-check, technique, common errors, variations." : "Thirty days, two training blocks: build the foundations, then turn them into performance."}
        image={cover}
        cta={<CoverActions primary={cta} more={<MoreMenu items={items} />} />}
        progress={!data.locked && lessons.length ? (plan ? { value: progressOf(lessons.filter((l) => planIds.has(l.id)), done).pct, label: `My Plan · ${lessons.filter((l) => planIds.has(l.id) && done.has(l.id)).length} of ${planIds.size} lessons` } : { value: p.pct, label: `${p.done} of ${p.total} lessons` }) : null}
        badge={!isMtk && art ? <Image src={art.src} alt={art.alt} width={art.width} height={art.height} sizes="200px" className="jc-wordmark" /> : null}
      />

      {isMtk && data.mtk && !data.locked && (
        <Link href={plan ? "/mtk" : data.mtk.assessmentDone ? "/mtk/results" : `/intake/${slug}`} className="jh-sg lq-press" data-tone="plan">
          <span className="jh-sg-ic" aria-hidden><Icon name="calendar" size="sm" /></span>
          <span className="jh-sg-c">
            <b>{plan ? `My Plan${planDay ? ` · Day ${planDay.day} of ${plan.days.length}` : " · complete"}` : data.mtk.assessmentDone ? "Your results are ready: finish My Plan" : "Get My Plan: a 2-minute assessment"}</b>
            <small>{plan ? (planDay ? `Today: ${planDay.title}. ${plan.lessonIds.length} lessons picked for your strengths and gaps.` : "Every recommended lesson is done.") : "Mike recommends where to start and builds your schedule."}</small>
          </span>
          <Icon name="chevron" size="xs" />
        </Link>
      )}

      <Navigator
        units={units}
        initialId={here?.id ?? null}
        currentId={here?.id ?? null}
        label={isMtk ? "Movements" : "Your 30 days"}
      />

      {p.pct >= 1 && !data.locked && (
        <FinishLine
          certificateHref="/you/certificates"
          next={
            isMtk
              ? [
                  { title: "Kettlebell Lifestyle · Level II", reason: "Put every lift to work in a guided nine-week program.", href: "/programs/kettlebell-lifestyle?path=intermediate", image: { src: PHOTO.press.src, focal: PHOTO.press.focal } },
                  { title: "Athleticism 4 Life", reason: "A 30-day strength block with the Bulgarian bag.", href: "/programs/athleticism-4-life/course", image: { src: PHOTO.bag.src, focal: PHOTO.bag.focal } },
                ]
              : [
                  { title: "Mastering the Kettlebell", reason: "Refine every lift: pre-check, technique, errors, variations.", href: "/programs/mastering-the-kettlebell/course", image: { src: PHOTO.squat.src, focal: PHOTO.squat.focal } },
                  { title: "1:1 with Mike", reason: "Review your 30 days and plan the next block.", href: "/coaching", image: { src: PHOTO.coaching.src, focal: PHOTO.coaching.focal } },
                ]
          }
        />
      )}

      <WhatYouGet points={program.highlights} more={program.description ?? program.summary} />

      {!data.locked && <BadgeRow badges={progressBadges(p.pct, p.done > 0, special)} />}

      {offer && <div className="jh-offer">{offer}</div>}
    </div>
  );
}
