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
import { kblUnits, unitOf } from "./units";
import "./journeys.css";

/**
 * Kettlebell Lifestyle main page (spec 11 §2, §5, §13): cover + one action, a clear Level I / Level II
 * choice (both open any time, "Recommended for you" from the intake), the Immersion weeks navigator
 * and a calm way into Self-Guided. The full Self-Guided board lives at `?mode=self-guided`.
 */
export function KblHome({ data, board, recommendedKey, offer, levelSwitch }: { data: ProgramPageData; board: BoardData | null; recommendedKey: string | null; offer?: ReactNode; levelSwitch?: ReactNode }) {
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
  const units = kblUnits({ slug, sections, lessons, progress, extras: board?.lessons, resources, currentId: current?.id ?? null, orderLocked, locked, href });
  const here = unitOf(units, current?.id ?? null);
  const levelName = path?.shortName ?? "Level I";
  const started = progress.some((p) => p.doneSteps > 0);

  let cta: ReactNode;
  if (locked) cta = <Button href={`/explore/${slug}`} icon="lock" size="lg">See access options</Button>;
  else if (!enrollment) cta = <JoinButton programId={program.id} pathId={path?.id ?? null} name={`${program.name} ${levelName}`} variant="filled" size="lg" label={`Start ${levelName}`} />;
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
        image={{ src: "/media/summit/mike-windmill.jpg", alt: "Mike Salemi holding a kettlebell overhead in the gym", focal: "62% 8%", focalPhone: "62% 10%" }}
        cta={cta}
        progress={!locked && dayLessons.length ? { value: doneDays / dayLessons.length, label: `${levelName} · ${doneDays} of ${dayLessons.length} days` } : null}
      />

      {paths.length > 1 && (levelSwitch ?? <LevelChoice data={data} recommendedKey={recommendedKey} />)}

      <Navigator
        key={path?.id ?? "p"}
        units={units}
        initialId={here?.id ?? null}
        currentId={here?.id ?? null}
        label={`${levelName} · Immersion weeks`}
      />

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
