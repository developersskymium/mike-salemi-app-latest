import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MovementFigure } from "@/components/graphics";
import { Climb } from "@/components/signature";
import { Icon, type IconName } from "@/components/ui";
import {
  allLessons, dayNumber, masteryLabel, progressOf, sectionsMatching, stageOf, type JourneyConfig,
} from "@/lib/journey";
import type { CourseData, CourseLessonNode, CourseSectionNode } from "@/lib/loaders/course";
import { Bar, LessonRow, Meter, SectionHead } from "./parts";

export type ViewProps = {
  data: CourseData;
  cfg: JourneyConfig;
  done: Set<string>;
  href: (id: string) => string;
  /** The lesson the member would resume (null on a first visit). */
  nextId: string | null;
};

const STAGE_ORDER = ["precheck", "technique", "errors", "variations"];

/* ============================================================ MTK: movement skill tree */

export function SkillTree({ data, cfg, done, href }: ViewProps) {
  const stages = [...(cfg.stages ?? [])].sort((a, b) => (STAGE_ORDER.indexOf(a.key) + 99) % 99 - (STAGE_ORDER.indexOf(b.key) + 99) % 99);
  const plan = new Set(data.mtk?.plan?.lessonIds ?? []);
  const groups = data.groups;
  const tiers = (cfg.tiers ?? []).map((t) => ({
    ...t,
    families: t.families
      .map((f) => {
        const g = groups.find((x) => x.name.trim().toLowerCase() === f.group.toLowerCase());
        if (!g) return null;
        const lessons = g.sections.flatMap((s) => s.lessons);
        const byStage: Record<string, CourseLessonNode[]> = {};
        for (const s of g.sections) {
          const k = stageOf(cfg.stages ?? [], s.title);
          (byStage[k] ??= []).push(...s.lessons);
        }
        const stagePct = Object.fromEntries(Object.entries(byStage).map(([k, ls]) => [k, progressOf(ls, done).pct]));
        const p = progressOf(lessons, done);
        const firstStage = stages.find((st) => (byStage[st.key] ?? []).some((l) => !done.has(l.id)));
        const nextL = firstStage ? byStage[firstStage.key]!.find((l) => !done.has(l.id)) ?? null : null;
        return { f, g, lessons, byStage, stagePct, p, nextL: nextL ?? lessons[0] ?? null, inPlan: lessons.filter((l) => plan.has(l.id)).length, mastery: masteryLabel(stagePct, p.pct) };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x)),
  }));
  const fams = tiers.flatMap((t) => t.families);
  const mastered = fams.filter((x) => x.mastery.level === 4).length;
  const started = fams.filter((x) => x.p.done > 0).length;

  return (
    <section aria-labelledby="jy-tree-h" className="jy-block">
      <SectionHead
        id="jy-tree-h"
        eyebrow="The skill tree"
        title="Master one movement at a time"
        note="Each movement unlocks in four stages. Start at the roots; the snatch sits at the top because it uses everything below it."
        aside={
          <div className="jy-tree-stats">
            <span><b className="lq-num">{started}</b> started</span>
            <span><b className="lq-num">{mastered}</b>/{fams.length} mastered</span>
          </div>
        }
      />
      <ol className="jy-stage-key" aria-label="Stages of every movement">
        {stages.map((s, i) => (
          <li key={s.key}><span className="lq-num">{i + 1}</span>{s.label}</li>
        ))}
      </ol>
      <div className="jy-tree">
        {[...tiers].reverse().map((t, ti) => (
          <div key={t.label} className="jy-tier" data-tier={tiers.length - ti}>
            <div className="jy-tier-head">
              <span className="jy-tier-n lq-num">{String(tiers.length - ti).padStart(2, "0")}</span>
              <span>
                <b>{t.label}</b>
                {t.blurb && <small>{t.blurb}</small>}
              </span>
            </div>
            <ul className="jy-tier-row" style={{ "--n": t.families.length } as CSSProperties}>
              {t.families.map(({ f, g, byStage, p, nextL, inPlan, mastery }) => (
                <li key={g.name}>
                  <Link href={nextL ? href(nextL.id) : "#"} className="jy-skill lq-press" data-level={mastery.level} prefetch={false} aria-label={`${f.label}: ${mastery.label}, ${p.done} of ${p.total} lessons`}>
                    <span className="jy-skill-top">
                      <span className="jy-skill-fig" aria-hidden>{f.move && <MovementFigure move={f.move} size={64} animated={false} bare />}</span>
                      <Meter value={p.pct} size={42} label={<span className="lq-num">{Math.round(p.pct * 100)}</span>} />
                    </span>
                    <b className="jy-skill-t">{f.label}</b>
                    <span className="jy-skill-m">{mastery.label}</span>
                    <span className="jy-skill-stages" aria-hidden>
                      {stages.map((st) => {
                        const ls = byStage[st.key] ?? [];
                        const v = ls.length ? ls.filter((l) => done.has(l.id)).length / ls.length : -1;
                        return <i key={st.key} title={`${st.label}: ${ls.filter((l) => done.has(l.id)).length}/${ls.length}`} data-empty={v < 0 ? "" : undefined} style={{ "--v": Math.max(0, v) } as CSSProperties} />;
                      })}
                    </span>
                    <span className="jy-skill-foot lq-num">
                      {p.done}/{p.total} lessons
                      {inPlan > 0 && <span className="jy-plan-dot" title="In your plan">{inPlan} in plan</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================ A4L: training blocks */

export function BlockPlan({ data, cfg, done, href }: ViewProps) {
  const blocks = (cfg.blocks ?? []).map((b) => {
    const secs = sectionsMatching(data.groups, b);
    const lessons = secs.flatMap((s) => s.lessons);
    return { b, secs, lessons, p: progressOf(lessons, done) };
  });
  const dayLessons = blocks.flatMap((x) => x.lessons).filter((l) => dayNumber(l.title) !== null);
  const today = dayLessons.find((l) => !done.has(l.id)) ?? null;
  const training = blocks.filter((x) => x.lessons.some((l) => dayNumber(l.title) !== null)).length;
  const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
  const title = `${WORDS[training] ?? training} ${training === 1 ? "block" : "blocks"}. ${dayLessons.length} days.`;
  return (
    <section aria-labelledby="jy-blocks-h" className="jy-block">
      <SectionHead id="jy-blocks-h" eyebrow={cfg.path?.label ?? "The program"} title={title} note={cfg.path?.blurb} />
      <div className="jy-blocks">
        {blocks.map(({ b, secs, p }, bi) => (
          <article key={b.label} className="jy-blk" data-first={bi === 0 ? "" : undefined}>
            <header className="jy-blk-head">
              <span className="jy-blk-n lq-num">{bi === 0 ? "00" : String(bi).padStart(2, "0")}</span>
              <span className="jy-blk-titles">
                {b.kicker && <small>{b.kicker}</small>}
                <b>{b.label}</b>
              </span>
              <span className="jy-blk-p lq-num">{p.done}/{p.total}</span>
            </header>
            {b.blurb && <p className="jy-note">{b.blurb}</p>}
            <Bar value={p.pct} label={`${b.label} progress`} />
            {secs.map((s) => {
              const days = s.lessons.filter((l) => dayNumber(l.title) !== null);
              const rest = s.lessons.filter((l) => dayNumber(l.title) === null);
              if (!days.length) {
                return (
                  <ul key={s.id} className="jy-prep">
                    {rest.map((l) => (
                      <li key={l.id}>
                        <Link href={href(l.id)} className="jy-chip lq-press" data-done={done.has(l.id) ? "" : undefined} prefetch={false}>
                          <Icon name={done.has(l.id) ? "check" : l.video ? "play" : "file"} size="xs" />
                          {l.title.replace(/^\*/, "")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              }
              const finish = rest.filter((l) => /congrat|finish|complete/i.test(l.title));
              const extras = rest.filter((l) => !finish.includes(l));
              return (
                <div key={s.id} className="jy-week">
                  <div className="jy-week-head">
                    <b>{s.title.replace(/:.*$/, "")}</b>
                    <span>{s.title.includes(":") ? s.title.split(":")[1]!.trim() : ""}</span>
                    <span className="jy-week-extras">
                      {extras.map((l) => (
                        <Link key={l.id} href={href(l.id)} className="jy-brief" data-done={done.has(l.id) ? "" : undefined} prefetch={false}>
                          <Icon name={done.has(l.id) ? "check" : /overview/i.test(l.title) ? "file" : "clipboard"} size="xs" /> {/overview/i.test(l.title) ? "Week brief" : /check ?in/i.test(l.title) ? "Check-in" : l.title}
                        </Link>
                      ))}
                    </span>
                  </div>
                  <ol className="jy-days">
                    {days.map((l) => {
                      const n = dayNumber(l.title)!;
                      const isDone = done.has(l.id);
                      const isToday = today?.id === l.id;
                      return (
                        <li key={l.id}>
                          <Link href={href(l.id)} className="jy-day lq-press" data-done={isDone ? "" : undefined} data-today={isToday ? "" : undefined} prefetch={false} aria-label={`Day ${n}${isDone ? ", done" : isToday ? ", up next" : ""}`}>
                            <small>Day</small>
                            <b className="lq-num">{n}</b>
                            {isDone && <Icon name="check" size="xs" className="jy-day-ok" />}
                            {isToday && <span className="jy-day-tag">Today</span>}
                          </Link>
                        </li>
                      );
                    })}
                    {finish.map((l) => (
                      <li key={l.id}>
                        <Link href={href(l.id)} className="jy-day jy-day-flag lq-press" data-done={done.has(l.id) ? "" : undefined} prefetch={false} aria-label={l.title}>
                          <Icon name="flag" size="sm" />
                          <small>Finish</small>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ============================================================ Shelves (toolkits, bonus libraries) */

const SHELF_ICON: [RegExp, IconName][] = [[/workout/i, "dumbbell"], [/exercise/i, "kettlebell"], [/recover|prepar/i, "leaf"], [/next/i, "compass"], [/archive|q&a/i, "video"], [/bonus/i, "star"]];

export function Shelves({ data, cfg, done, href, title = "Your toolkit", eyebrow = "Open any time" }: ViewProps & { title?: string; eyebrow?: string }) {
  const shelves = (cfg.shelves ?? []).map((s) => {
    const secs = sectionsMatching(data.groups, s);
    const lessons = secs.flatMap((x) => x.lessons);
    return { s, secs, lessons, p: progressOf(lessons, done) };
  }).filter((x) => x.lessons.length);
  if (!shelves.length) return null;
  return (
    <section aria-labelledby="jy-shelf-h" className="jy-block">
      <SectionHead id="jy-shelf-h" eyebrow={eyebrow} title={title} />
      <ul className="jy-shelves">
        {shelves.map(({ s, secs, lessons, p }) => (
          <li key={s.label}>
            <Link href={href((p.next ?? lessons[0]!).id)} className="jy-shelf lq-press" prefetch={false}>
              <span className="jy-shelf-ic" aria-hidden><Icon name={SHELF_ICON.find(([r]) => r.test(s.label))?.[1] ?? "library"} size="sm" /></span>
              <span className="jy-shelf-main">
                <b>{s.label}</b>
                {s.blurb && <small>{s.blurb}</small>}
                <span className="jy-shelf-meta lq-num">{secs.length > 1 ? `${secs.length} sections · ` : ""}{lessons.length} lessons{p.done ? ` · ${p.done} done` : ""}</span>
              </span>
              <Icon name="chevron" size="xs" className="jy-row-go" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================================================ Working-In: calm video series */

export function SeriesReel({ data, cfg, done, href }: ViewProps) {
  const eps = allLessons(data.groups);
  const sectionOf = new Map(data.groups.flatMap((g) => g.sections).flatMap((s) => s.lessons.map((l) => [l.id, s] as [string, CourseSectionNode])));
  const next = eps.find((l) => !done.has(l.id)) ?? null;
  const cover = data.program.cover;
  return (
    <section aria-labelledby="jy-eps-h" className="jy-block">
      <SectionHead id="jy-eps-h" eyebrow={`${eps.length} ${eps.length === 1 ? cfg.unit.one : cfg.unit.many}`} title="Watch, then practise" note={cfg.pace?.note} />
      <ol className="jy-eps">
        {eps.map((l, i) => {
          const isDone = done.has(l.id);
          const isNext = next?.id === l.id;
          const sec = sectionOf.get(l.id);
          return (
            <li key={l.id}>
              <Link href={href(l.id)} className="jy-ep lq-press" data-feature={isNext ? "" : undefined} data-done={isDone ? "" : undefined} data-next={isNext ? "" : undefined} prefetch={false}>
                <span className="jy-ep-art" aria-hidden data-photo={isNext ? "" : undefined}>
                  {isNext ? (
                    <Image src={cover.src} alt="" fill sizes="(min-width: 1024px) 420px, 92vw" style={{ objectPosition: cover.focal }} />
                  ) : (
                    <>
                      <span className="jy-ep-num lq-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="jy-ep-fig"><MovementFigure move={(["breathing", "halo", "walking"] as const)[i % 3]!} size={70} animated={false} bare /></span>
                    </>
                  )}
                  <span className="jy-ep-play">{isDone ? <Icon name="check" size="sm" /> : <Icon name="play" size="sm" />}</span>
                </span>
                <span className="jy-ep-main">
                  <small className="lq-num">Episode {i + 1}{isNext ? " · Up next" : isDone ? " · Watched" : ""}</small>
                  <b>{l.title}</b>
                  {sec && sec.title !== l.title && <span>{sec.title}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ============================================================ The Path: ten-week trail */

const WEEK_ITEM: [RegExp, IconName, string][] = [
  [/call|recording/i, "video", "Call"],
  [/playwork/i, "clipboard", "Playwork"],
  [/breath|chi generator/i, "wind", "Practice"],
  [/presentation|values|drc|gails|4f|negations|integrity|letter|designing|mindset|guest|pre-course/i, "file", "Teaching"],
];

export function WeekTrail({ data, done, href, nextId }: ViewProps) {
  const weeks = data.groups.flatMap((g) => g.sections);
  const cur = weeks.find((s) => s.lessons.some((l) => !done.has(l.id))) ?? null;
  return (
    <section aria-labelledby="jy-trail-h" className="jy-block">
      <SectionHead id="jy-trail-h" eyebrow={`${weeks.length} weeks`} title="One week at a time" note="Each week: listen to the call, do the playwork, keep the practice going until next week." />
      <ol className="jy-trail">
        {weeks.map((s, i) => {
          const p = progressOf(s.lessons, done);
          const state = p.pct >= 1 ? "done" : s.id === cur?.id ? "now" : "ahead";
          return (
            <li key={s.id} className="jy-trail-wk" data-state={state}>
              <span className="jy-trail-node lq-num" aria-hidden>{state === "done" ? <Icon name="check" size="xs" /> : i + 1}</span>
              <div className="jy-trail-card">
                <div className="jy-trail-head">
                  <b>{s.title}</b>
                  <span className="lq-num">{p.done}/{p.total}</span>
                </div>
                <ul className="jy-trail-items">
                  {s.lessons.map((l) => {
                    const k = WEEK_ITEM.find(([r]) => r.test(l.title));
                    return (
                      <li key={l.id}>
                        <Link href={href(l.id)} className="jy-chip lq-press" data-done={done.has(l.id) ? "" : undefined} data-now={nextId === l.id ? "" : undefined} prefetch={false}>
                          <Icon name={done.has(l.id) ? "check" : k?.[1] ?? "play"} size="xs" />
                          {l.title.replace(/^Week \d+\s*/i, "") || l.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ============================================================ Men of Movement prep: five pillars */

export function Pillars({ data, cfg, done, href }: ViewProps) {
  const lessons = allLessons(data.groups);
  const used = new Set<string>();
  const pillars = (cfg.pillars ?? []).map((p) => {
    const r = p.lessons ? new RegExp(p.lessons, "i") : null;
    const ls = r ? lessons.filter((l) => r.test(l.title)) : [];
    for (const l of ls) used.add(l.id);
    return { p, ls };
  });
  const more = lessons.filter((l) => !used.has(l.id));
  return (
    <section aria-labelledby="jy-pil-h" className="jy-block">
      <SectionHead id="jy-pil-h" eyebrow="Five pillars" title="Arrive grounded" note="The retreat stands on five pillars. Each practice below prepares one of them." />
      <ol className="jy-pillars">
        {pillars.map(({ p, ls }, i) => {
          const pr = progressOf(ls, done);
          return (
            <li key={p.key} className="jy-pillar" data-empty={ls.length ? undefined : ""}>
              <span className="jy-pillar-n lq-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="jy-pillar-fig" aria-hidden>{p.move && <MovementFigure move={p.move} size={64} animated={false} bare />}</span>
              <b>{p.label}</b>
              <small>{p.blurb}</small>
              {ls.length ? (
                <>
                  <Bar value={pr.pct} label={`${p.label} progress`} />
                  <ul className="jy-pillar-list">
                    {ls.map((l) => (
                      <li key={l.id}>
                        <Link href={href(l.id)} data-done={done.has(l.id) ? "" : undefined} prefetch={false}>
                          <Icon name={done.has(l.id) ? "check" : l.video ? "play" : "file"} size="xs" />{l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <span className="jy-soon">Opening soon</span>
              )}
            </li>
          );
        })}
      </ol>
      {more.length > 0 && (
        <ul className="jy-rows jy-rows-tight">
          {more.map((l) => <LessonRow key={l.id} href={href(l.id)} title={l.title} sub="Also in your preparation" done={done.has(l.id)} />)}
        </ul>
      )}
      <div className="jy-after">
        <span className="jy-after-ic" aria-hidden><Icon name="lock" size="sm" /></span>
        <span>
          <b>Post-retreat integration</b>
          <small>Unlocks after your retreat. Content in development; your access stays open with no expiry for now.</small>
        </span>
      </div>
    </section>
  );
}

/* ============================================================ Free series: the step ladder */

export function StepLadder({ data, cfg, done, href }: ViewProps) {
  const secs = data.groups.flatMap((g) => g.sections);
  const main = [...secs].sort((a, b) => b.lessons.length - a.lessons.length)[0];
  if (!main) return null;
  const more = /learn more|next/i;
  const steps = main.lessons.filter((l) => !more.test(l.title));
  const extra = secs.filter((s) => s !== main);
  const next = steps.find((l) => !done.has(l.id));
  return (
    <section aria-labelledby="jy-steps-h" className="jy-block">
      <SectionHead id="jy-steps-h" eyebrow={`${steps.length} ${steps.length === 1 ? cfg.unit.one : cfg.unit.many}`} title={main.title} note={cfg.pace?.note} />
      <ol className="jy-ladder">
        {steps.map((l, i) => {
          const isDone = done.has(l.id);
          const label = l.title.replace(/^(#\d+|step \d+)\s*[-–:]?\s*/i, "");
          return (
            <li key={l.id}>
              <Link href={href(l.id)} className="jy-rung lq-press" data-done={isDone ? "" : undefined} data-now={next?.id === l.id ? "" : undefined} prefetch={false}>
                <span className="jy-rung-n lq-num">{isDone ? <Icon name="check" size="sm" /> : i + 1}</span>
                <span className="jy-rung-main">
                  <small>{cfg.unit.one} {i + 1}</small>
                  <b>{label}</b>
                </span>
                {next?.id === l.id && <span className="jy-pill">Up next</span>}
              </Link>
            </li>
          );
        })}
      </ol>
      {extra.length > 0 && (
        <ul className="jy-bonus">
          {extra.map((s) => {
            const p = progressOf(s.lessons, done);
            const l = p.next ?? s.lessons[0];
            if (!l) return null;
            return (
              <li key={s.id}>
                <Link href={href(l.id)} className="jy-bonus-card lq-press" data-done={p.pct >= 1 ? "" : undefined} prefetch={false}>
                  <Icon name={p.pct >= 1 ? "check" : /ebook|pdf/i.test(s.title) ? "download" : "star"} size="sm" />
                  <span><b>{s.title.replace(/^Bonus \d+\s*-\s*/i, "")}</b><small>{/^bonus/i.test(s.title) ? s.title.split("-")[0]!.trim() : `${s.lessons.length} ${s.lessons.length === 1 ? "lesson" : "lessons"}`}</small></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ============================================================ Roadmap: find your phase */

export function PhaseRoute({ data, done, href }: ViewProps) {
  const secs = data.groups.flatMap((g) => g.sections);
  const phases = secs.filter((s) => /^phase/i.test(s.title));
  const rest = secs.filter((s) => !/^phase/i.test(s.title));
  const doneN = phases.filter((s) => s.lessons.every((l) => done.has(l.id))).length;
  return (
    <section aria-labelledby="jy-route-h" className="jy-block">
      <SectionHead id="jy-route-h" eyebrow="Find your phase of training" title="Four camps to mastery" />
      <div className="jy-route-climb">
        <Climb id="jy-roadmap" phases={phases.slice(0, -1).map((s, i) => ({ label: s.title.split("-")[0]!.trim(), from: i + 1, to: i + 1 }))} done={doneN} total={phases.length} youLabel={doneN >= phases.length ? "You · Mastery" : `You · Phase ${doneN + 1}`} summitLabel={`Phase ${phases.length} · Mastery`} height={230} label="The four phases of kettlebell training" />
      </div>
      <ol className="jy-phases">
        {phases.map((s, i) => {
          const l = s.lessons[0];
          if (!l) return null;
          const name = s.title.split("-").slice(1).join("-").trim() || s.title;
          return (
            <li key={s.id}>
              <Link href={href(l.id)} className="jy-phase lq-press" data-done={done.has(l.id) ? "" : undefined} prefetch={false}>
                <small className="lq-num">Phase {i + 1}</small>
                <b>{name}</b>
                <span>{done.has(l.id) ? "Read" : "Open"} <Icon name="arrowRight" size="xs" /></span>
              </Link>
            </li>
          );
        })}
      </ol>
      {rest.length > 0 && (
        <ul className="jy-rows jy-rows-tight">
          {rest.flatMap((s) => s.lessons).map((l) => <LessonRow key={l.id} href={href(l.id)} title={l.title} done={done.has(l.id)} icon="route" />)}
        </ul>
      )}
    </section>
  );
}

/** The lessons that make up the planned self-guided path, in order (for the pace planner). */
export function pathLessons(data: CourseData, cfg: JourneyConfig): CourseLessonNode[] {
  const all = allLessons(data.groups);
  switch (cfg.kind) {
    case "skills": {
      const plan = data.mtk?.plan?.lessonIds;
      if (plan?.length) return plan.map((id) => all.find((l) => l.id === id)).filter((l): l is CourseLessonNode => Boolean(l));
      const order = (cfg.tiers ?? []).flatMap((t) => t.families.map((f) => f.group.toLowerCase()));
      return order.flatMap((g) => data.groups.find((x) => x.name.trim().toLowerCase() === g)?.sections.flatMap((s) => s.lessons) ?? []);
    }
    case "blocks":
      return (cfg.blocks ?? []).flatMap((b) => sectionsMatching(data.groups, b).flatMap((s) => s.lessons)).filter((l) => dayNumber(l.title) !== null);
    case "steps": {
      const main = [...data.groups.flatMap((g) => g.sections)].sort((a, b) => b.lessons.length - a.lessons.length)[0];
      return main?.lessons.filter((l) => !/learn more/i.test(l.title)) ?? all;
    }
    case "route":
      return data.groups.flatMap((g) => g.sections).filter((s) => /^phase/i.test(s.title)).flatMap((s) => s.lessons);
    default:
      return all;
  }
}
