import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Icon } from "@/components/ui";
import { JoinButton } from "@/components/today/JoinButton";
import { allLessons, progressOf } from "@/lib/journey";
import type { CourseData } from "@/lib/loaders/course";
import { Navigator } from "./Navigator";
import { ProgramCover } from "./ProgramCover";
import { a4lUnits, mtkUnits, unitOf } from "./units";
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
  const units = isMtk ? mtkUnits(data, href, nextId, planIds) : a4lUnits(data, href, nextId);
  const here = unitOf(units, nextId);
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

  const cover = isMtk
    ? { src: "/media/covers/mastering-the-kettlebell.jpg", alt: "Mike Salemi in a racked kettlebell squat", focal: "42% 8%", focalPhone: "44% 10%" }
    : { src: program.cover.src, alt: program.cover.alt, focal: "60% 12%", focalPhone: "62% 16%" };
  const art = program.journey.artwork;

  return (
    <div className="jh" data-program={isMtk ? "mtk" : "a4l"} data-jy-theme={program.journey.theme}>
      <ProgramCover
        eyebrow={isMtk ? "Movement mastery · with Mike Salemi" : "Suples approved · Bulgarian bag + kettlebell"}
        title={program.name}
        promise={isMtk ? "Every kettlebell lift as a skill: pre-check, technique, common errors, variations." : "Thirty days, two training blocks: build the foundations, then turn them into performance."}
        image={cover}
        cta={cta}
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

      {offer && <div className="jh-offer">{offer}</div>}
    </div>
  );
}
