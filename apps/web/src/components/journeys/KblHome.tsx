import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Icon } from "@/components/ui";
import { JoinButton } from "@/components/today/JoinButton";
import { currentFrom, lessonHref } from "@/components/training/model";
import type { ProgramPageData } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { Navigator } from "./Navigator";
import { ProgramCover } from "./ProgramCover";
import { kblUnits, openFirst, progressBadges, unitOf } from "./units";
import { BadgeRow, CoverActions, FinishLine, MoreMenu, WhatYouGet } from "./PageExtras";
import { programCover, PHOTO } from "@/lib/photos";
import "./journeys.css";

/**
 * Kettlebell Lifestyle main page (spec 11 §2, §5, §13): cover + one action, a clear Level I / Level II
 * choice (both open any time, "Recommended for you" from the intake), the Immersion weeks navigator
 * and a calm way into Self-Guided. The full Self-Guided board lives at `?mode=self-guided`.
 */
export function KblHome({ data, board, recommendedKey, offer, levelSwitch, badges, notice }: { data: ProgramPageData; board: BoardData | null; recommendedKey: string | null; offer?: ReactNode; levelSwitch?: ReactNode; badges?: ReactNode; /** A quiet note above the level choice (e.g. a retaken intake suggests the other level). */ notice?: ReactNode }) {
  const { program, path, paths, sections, lessons, progress, enrollment, resources } = data;
  const locked = data.locked || program.access === "locked";
  const slug = program.slug;
  const current = currentFrom(lessons, progress);
  const doneIds = new Set(progress.filter((p) => p.complete).map((p) => p.lessonId));
  const dayLessons = lessons.filter((l) => l.dayNumber != null && !l.pageType);
  const doneDays = dayLessons.filter((l) => doneIds.has(l.id)).length;
  const orderLocked = enrollment?.mode === "immersion";
  const href = (l: (typeof lessons)[number]) => {
    const p = progress.find((x) => x.lessonId === l.id);
    return lessonHref(slug, l.key, l.id, orderLocked && p && !p.unlocked ? "self_guided" : "immersion");
  };
  const built = kblUnits({ slug, sections, lessons, progress, extras: board?.lessons, resources, currentId: current?.id ?? null, orderLocked, locked, href });
  const units = locked ? openFirst(built) : built;
  const here = unitOf(units, current?.id ?? null);
  const pathDone = lessons.length > 0 && doneIds.size >= lessons.length;
  const phaseCleared = sections.some((s) => {
    const ds = dayLessons.filter((l) => l.sectionId === s.id);
    return ds.length > 0 && ds.every((l) => doneIds.has(l.id));
  });
  const pathIndex = paths.findIndex((p) => p.id === path?.id);
  const other = paths[pathIndex === 0 ? 1 : 0] ?? null;
  const q = path?.key ? `path=${encodeURIComponent(path.key)}&` : "";
  const heroPhoto = programCover(slug) ?? PHOTO.windmill;
  const levelName = path?.shortName ?? "Level I";
  const started = progress.some((p) => p.doneSteps > 0);

  let cta: ReactNode;
  if (locked || !enrollment) cta = <JoinButton programId={program.id} pathId={path?.id ?? null} name={program.name} slug={slug} variant="filled" size="lg" label={`Start ${levelName}`} />;
  else if (current) cta = (
    <Button href={href(current)} icon="play" size="lg" variant={started ? "warm" : "filled"}>
      {started ? "Continue" : "Start"} · {here?.label ?? ""}{current.dayNumber != null ? ` · Day ${current.dayNumber}` : ""}
    </Button>
  );
  else cta = data.certificateId ? <Button href={`/you/certificates/${data.certificateId}`} icon="sparkle" size="lg">Get your certificate</Button> : <Button href={`/programs/${slug}?mode=self-guided`} icon="repeat" size="lg">Train any day</Button>;

  return (
    <div className="jh" data-program="kbl">
      <ProgramCover
        eyebrow="Flagship program · with Mike Salemi"
        title={program.name}
        promise={path?.tagline ?? program.tagline ?? "Nine weeks to a kettlebell you can trust."}
        image={heroPhoto}
        cta={
          <CoverActions
            primary={cta}
            more={
              <MoreMenu
                introVideo={board?.extras.heroVideo ?? null}
                introPoster={heroPhoto.src}
                introTitle={`${program.name} · a word from Mike`}
                introKey={slug}
                items={[
                  ...(locked ? [] : [{ label: "Self-Guided board", href: `/programs/${slug}?${q}mode=self-guided`, icon: "filter" as const }]),
                  { label: "Schedule", href: `/plan?program=${slug}`, icon: "calendar" as const },
                  { label: "Level intake", href: `/intake/${slug}`, icon: "clipboard" as const },
                ]}
              />
            }
          />
        }
        progress={!locked && dayLessons.length ? { value: doneDays / dayLessons.length, label: `${levelName} · ${doneDays} of ${dayLessons.length} days` } : null}
      />

      {notice}
      {paths.length > 1 && (levelSwitch ?? <LevelChoice data={data} recommendedKey={recommendedKey} />)}

      <Navigator
        key={path?.id ?? "p"}
        units={units}
        initialId={here?.id ?? null}
        currentId={here?.id ?? null}
        label={`${levelName} · Immersion weeks`}
      />

      {pathDone && !locked && (
        <FinishLine
          certificateHref={data.certificateId ? `/you/certificates/${data.certificateId}` : null}
          next={[
            ...(other && pathIndex === 0 ? [{ title: other.shortName ?? other.name, reason: "Heavier bells, longer chains, real capacity.", href: `/programs/${slug}?path=${encodeURIComponent(other.key ?? other.id)}`, image: { src: PHOTO.press.src, focal: PHOTO.press.focal } }] : []),
            { title: "Mastering the Kettlebell", reason: "Every lift as a skill: pre-check, technique, errors, variations.", href: "/programs/mastering-the-kettlebell/course", image: { src: PHOTO.squat.src, focal: PHOTO.squat.focal } },
            { title: "Athleticism 4 Life", reason: "A 30-day strength block with the Bulgarian bag.", href: "/programs/athleticism-4-life/course", image: { src: PHOTO.bag.src, focal: PHOTO.bag.focal } },
          ]}
        />
      )}

      <WhatYouGet points={path?.outcomes.length ? path.outcomes : program.highlights ?? []} more={path?.description ?? program.description} />

      {badges ?? (!locked && <BadgeRow badges={progressBadges(dayLessons.length ? doneDays / dayLessons.length : 0, doneDays > 0, { label: "Phase cleared", sub: "Finish every day of a phase", earned: phaseCleared })} />)}

      {!locked && (
        <Link href={`/programs/${slug}?${path?.key ? `path=${encodeURIComponent(path.key)}&` : ""}mode=self-guided`} className="jh-sg lq-press">
          <span className="jh-sg-ic" aria-hidden><Icon name="filter" size="sm" /></span>
          <span className="jh-sg-c">
            <b>Prefer your own order? Self-Guided</b>
            <small>Every day open, quick 10–45 minute sessions and a plan built around your week.</small>
          </span>
          <Icon name="chevron" size="xs" />
        </Link>
      )}

      {offer && <div className="jh-offer">{offer}</div>}
    </div>
  );
}

/**
 * Level I / Level II: a choice, not a ladder (client note 5). Both are open any time; the intake
 * recommends one. Swappable with the kbl agent's `<KblLevelSwitch>` via KblHome's `levelSwitch`.
 */
export function LevelChoice({ data, recommendedKey }: { data: ProgramPageData; recommendedKey: string | null }) {
  const { program, paths, path } = data;
  const IMG: Record<string, { src: string; focal: string }> = {
    beginner: { src: "/media/summit/mike-goblet.jpg", focal: "52% 12%" },
    intermediate: { src: "/media/summit/mike-press.jpg", focal: "60% 14%" },
  };
  return (
    <section className="jl" aria-label="Choose your level">
      <div className="jl-head">
        <h2 className="jn-h">Choose your level</h2>
        <p className="jl-note">Both are open. Switch any time.</p>
      </div>
      <div className="jl-grid">
        {paths.map((p, i) => {
          const sel = p.id === path?.id;
          const rec = p.key != null && p.key === recommendedKey;
          const img = IMG[p.key ?? ""] ?? (i ? IMG.intermediate! : IMG.beginner!);
          return (
            <Link key={p.id} href={`/programs/${program.slug}?path=${encodeURIComponent(p.key ?? p.id)}`} scroll={false} replace className="jl-card lq-press" aria-current={sel ? "page" : undefined}>
              <span className="jl-art"><Image src={img.src} alt="" fill sizes="120px" style={{ objectPosition: img.focal }} /></span>
              <span className="jl-c">
                <span className="jl-t">{p.shortName ?? p.name}{rec && <span className="jl-rec">Recommended for you</span>}</span>
                <span className="jl-s">{p.name.split("·")[1]?.trim() ?? ""}{p.tagline ? ` · ${p.tagline}` : ""}</span>
              </span>
              <span className="jl-radio" aria-hidden>{sel && <Icon name="check" size="xs" />}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
