import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "@ms/tokens/css";
import { cls } from "@/components/graphics/util";
import {
  Aurora,
  ChalkBurst,
  Flare,
  Completion,
  DAY_TYPE_LABEL,
  DAY_TYPES,
  DayGlyph,
  EMPTY_SCENES,
  EmptyScene,
  Grain,
  Kettlebell,
  LevelEmblem,
  MEDAL_TIERS,
  Medal,
  MOVE_NAMES,
  MovementFigure,
  PhaseLandscape,
  ReadinessDial,
  Rings,
  ShastaSky,
  SKY_TIMES,
  StreakFlame,
  SwingArc,
  TrainingHeatmap,
  type HeatLevel,
} from "@/components/graphics";
import { MOVES } from "@/components/graphics/figures/moves";
import { Replay } from "@/components/graphics/preview/Replay";
import "@/components/graphics/preview/preview.css";
import "@/components/graphics/preview/specimen.css";

const s = cls("gfx-sp");

export const metadata: Metadata = {
  title: "Signature graphics",
  robots: { index: false, follow: false },
};

const PHASES = [
  { startDay: 1, label: "On Ramp", name: "Days 1–7" },
  { startDay: 8, label: "Phase 1", name: "Foundation" },
  { startDay: 25, label: "Phase 2", name: "Build" },
  { startDay: 46, label: "Phase 3", name: "Peak" },
];

const SCENE_COPY: Record<(typeof EMPTY_SCENES)[number], [string, string]> = {
  "no-programs": ["No programs yet", "Programs you start will show up here."],
  "nothing-saved": ["Nothing saved", "Bookmark a workout to keep it close."],
  "plan-empty": ["Plan is empty", "A clear day ahead. Add a session."],
  offline: ["You're offline", "Saved workouts still play. We'll sync later."],
  "caught-up": ["All caught up", "Today's training is done. Rest well."],
};

/* 12 weeks of training for the heatmap specimen. */
const HEAT: HeatLevel[] = Array.from({ length: 84 }, (_, i) => {
  const d = i % 7;
  if (d === 6 || d === 3) return (i % 5 === 0 ? 1 : 0) as HeatLevel;
  return (((i * 7 + d * 3) % 5) as HeatLevel) || 1;
});

const RESKIN = {
  "--gfx-bell-hi": "#E7C58A",
  "--gfx-bell": "#B88A3E",
  "--gfx-bell-lo": "#7A5520",
  "--gfx-trace": "#B88A3E",
  "--gfx-trace-dark": "#E7C58A",
  "--gfx-trace-hot": "#7A5520",
  "--gfx-trace-hot-dark": "#FFF4DE",
  "--gfx-glyph-accent": "#B88A3E",
} as CSSProperties;

function Block({ title, note, children, wide }: { title: string; note?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`${s.block} ${wide ? s.wide : ""}`}>
      <header className={s.blockHead}>
        <h2>{title}</h2>
        {note ? <p>{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Band({ theme, motion }: { theme: "light" | "dark"; motion: boolean }) {
  return (
    <div data-theme={theme} className={s.band} data-shot={`band-${theme}`}>
      <p className={s.bandTag}>{theme === "light" ? "Light" : "Dark"}</p>

      <Block title="Mount Shasta, through the day" note="Today header art: dawn, day, dusk, night. skyTimeFor(hour) picks the time" wide>
        <div className={s.skies} data-shot={`sky-${theme}`}>
          {SKY_TIMES.map((t) => (
            <figure key={t} className={s.sky}>
              <ShastaSky time={t} height={150} animated={motion} />
              <figcaption>
                <strong>Good {t === "dawn" ? "morning" : t === "day" ? "afternoon" : t === "dusk" ? "evening" : "night"}, Ahmed</strong>
                <span>{t[0].toUpperCase() + t.slice(1)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block title="Movement figures" note="A real rig: true limb lengths, planted feet, hands on the handle. Each bell leaves its Trace: glacier light with a hot head and a cooling tail" wide>
        <div className={s.figs} data-shot={`figures-${theme}`}>
          {MOVE_NAMES.map((m) => (
            <figure key={m} className={s.fig}>
              <MovementFigure move={m} size={176} animated={motion} />
              <figcaption>{MOVES[m].label}</figcaption>
            </figure>
          ))}
        </div>
        <div className={s.ramp}>
          {[24, 32, 48, 72, 120].map((z) => (
            <figure key={z} className={s.rampCell}>
              <MovementFigure move="swing" size={z} />
              <figcaption>{z}</figcaption>
            </figure>
          ))}
          {[32, 48, 72].map((z) => (
            <figure key={`g${z}`} className={s.rampCell}>
              <MovementFigure move="getup" size={z} />
              <figcaption>{z}</figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block title="Day types" note="Trace icons: 1.6 strokes, open shapes, the exposed stretch ending in a light point">
        <div className={s.glyphs} data-shot={`glyphs-${theme}`}>
          {DAY_TYPES.map((t) => (
            <figure key={t} className={s.glyphCell}>
              <span className={s.chip}>
                <DayGlyph type={t} size={28} />
              </span>
              <figcaption>{DAY_TYPE_LABEL[t]}</figcaption>
            </figure>
          ))}
        </div>
        <div className={s.row}>
          {DAY_TYPES.map((t) => (
            <DayGlyph key={t} type={t} size={20} tone="mono" />
          ))}
          {DAY_TYPES.map((t) => (
            <DayGlyph key={`${t}16`} type={t} size={16} />
          ))}
        </div>
      </Block>

      <Block title="Awards" note="Struck rims around a night exposure, the award drawn in light; locked is unlit">
        <div className={s.row} data-shot={`awards-${theme}`}>
          {MEDAL_TIERS.map((t, i) => (
            <Medal key={t} tier={t} size={104} glyph={(["workout-1", "recovery", "challenge", undefined] as const)[i]} animated={motion} />
          ))}
          <Medal tier="gold" size={104} glyph="skill" locked />
        </div>
        <div className={s.row}>
          <LevelEmblem level={1} size={104} />
          <LevelEmblem level={2} size={104} tier="silver" />
          <LevelEmblem level={3} size={104} tier="gold" />
          <Medal tier="platinum" size={44} />
          <Medal tier="gold" size={28} />
        </div>
      </Block>

      <Block title="Empty states" note="Night exposure in dark, snow contours in light; matte objects from Mike's world, one mark of light" wide>
        <div className={s.scenes} data-shot={`scenes-${theme}`}>
          {EMPTY_SCENES.map((sc) => (
            <figure key={sc} className={s.scene}>
              <EmptyScene scene={sc} size={260} animated={motion} />
              <figcaption>
                <strong>{SCENE_COPY[sc][0]}</strong>
                <span>{SCENE_COPY[sc][1]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block title="Moments" note="One-shot, never looping: the check traced into a Flare, the day ending in a Flare under the night sky, the chalk burst; the streak as a light pill">
        <div className={s.row} data-shot={`moments-${theme}`}>
          <Replay>
            <Completion animated={motion} size={120} />
          </Replay>
          <Replay>
            <Completion variant="milestone" animated={motion} size={260} />
          </Replay>
          <Replay>
            <Flare size={120} animated={motion} />
          </Replay>
          <Replay>
            <ChalkBurst size={120} animated={motion} />
          </Replay>
        </div>
        <div className={s.row}>
          {[16, 22, 32, 48, 72].map((z) => (
            <StreakFlame key={z} size={z} animated={motion} />
          ))}
          <StreakFlame size={48} lit={false} />
          <span className={s.streak}>
            <StreakFlame size={22} animated={false} /> <b>12</b> day streak
          </span>
        </div>
      </Block>

      <Block title="Progress" note="The swing arc as a Trace (loader and progress); heatmap cells in glacier light">
        <div className={s.row} data-shot={`progress-${theme}`}>
          <SwingArc size={96} />
          <SwingArc size={96} progress={0.15} />
          <SwingArc size={96} progress={0.6} />
          <SwingArc size={96} progress={1} />
          <SwingArc size={40} />
        </div>
        <div className={s.row}>
          <TrainingHeatmap days={HEAT} todayIndex={78} size={13} gap={3.5} />
        </div>
      </Block>

      <Block title="Phase landscape" note="The program as a climb: the route exposed to today, phases as nodes, the rest dotted ahead" wide>
        <div className={s.heroGrid} data-shot={`landscape-${theme}`}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <small>Kettlebell Lifestyle</small>
              <strong>Day 24 of 61</strong>
            </div>
            <PhaseLandscape totalDays={61} completedDays={23} currentDay={24} phases={PHASES} animated={motion} />
          </div>
          <div className={s.card}>
            <div className={s.cardHead}>
              <small>Phone width</small>
              <strong>Day 52</strong>
            </div>
            <PhaseLandscape totalDays={61} completedDays={51} currentDay={52} phases={PHASES} animated={motion} />
          </div>
        </div>
      </Block>

      <Block title="Readiness and rings">
        <div className={s.row} data-shot={`dials-${theme}`}>
          <ReadinessDial score={52} band="green" size={150} animated={motion} />
          <ReadinessDial score={31} band="amber" size={150} animated={motion} />
          <Rings values={[23 / 61, 2 / 7, 12 / 30]} size={130} animated={motion} />
          <Rings values={[0.64, 0.3]} size={72} animated={motion} />
        </div>
      </Block>

      <Block title="Kettlebell marks" note="One bell drawing everywhere: wide round handle, clear window, flat base">
        <div className={s.row} data-shot={`kettlebells-${theme}`}>
          <Kettlebell size={24} />
          <Kettlebell size={40} />
          <Kettlebell size={72} weight={16} />
          {[8, 12, 16, 24, 32].map((w) => (
            <Kettlebell key={w} size={56} weight={w} colorCoded />
          ))}
        </div>
      </Block>

      <Block title="Re-skinned with --gfx-* hooks" note="The same components with a bronze bell and bronze light set on a parent, no code changes">
        <div className={s.row} style={RESKIN} data-shot={`reskin-${theme}`}>
          <MovementFigure move="swing" size={120} at={0} />
          <MovementFigure move="squat" size={120} />
          <Medal tier="gold" size={96} />
          <DayGlyph type="workout-2" size={40} />
          <SwingArc size={80} progress={0.7} />
        </div>
      </Block>

      <Block title="Ambient" note="Glacier aurora and film grain behind an empty screen" wide>
        <div className={s.ambient}>
          <Aurora animated={motion} />
          <Grain animated={motion} />
          <div className={s.ambientText}>
            <EmptyScene scene="caught-up" size={180} animated={motion} />
            <strong>All caught up</strong>
            <span>Today&apos;s training is done. Rest well.</span>
          </div>
        </div>
      </Block>
    </div>
  );
}

export default async function GraphicsPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const motion = q.motion !== "off";
  const themes: Array<"light" | "dark"> = q.theme === "light" || q.theme === "dark" ? [q.theme] : ["light", "dark"];
  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1>Signature graphics</h1>
        <p>
          Every custom graphic in the app, in light and dark. Motion respects reduced motion; add <a href="?motion=off">?motion=off</a> for
          stills, <a href="?theme=dark">?theme=dark</a> for one theme. Colours and materials are custom properties (<code>--gfx-*</code>).
        </p>
      </header>
      {themes.map((t) => (
        <Band key={t} theme={t} motion={motion} />
      ))}
    </main>
  );
}
