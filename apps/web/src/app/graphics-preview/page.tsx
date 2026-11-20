import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "@ms/tokens/css";
import { cls } from "@/components/graphics/util";
import {
  Climb,
  Completion,
  DAY_TYPE_LABEL,
  DAY_TYPES,
  DayGlyph,
  EMPTY_SCENES,
  EmptyScene,
  Kettlebell,
  LevelEmblem,
  MEDAL_TIERS,
  Medal,
  MOMENT_KINDS,
  MOVE_NAMES,
  MomentScene,
  MovementFigure,
  ReadinessDial,
  Rings,
  SPOTS,
  ShastaSky,
  SKY_TIMES,
  Spot,
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
  title: "Summit illustrations",
  robots: { index: false, follow: false },
};

const SCENE_COPY: Record<(typeof EMPTY_SCENES)[number], [string, string]> = {
  "no-programs": ["No programs yet", "Start one and your trail begins here."],
  "nothing-saved": ["Nothing saved", "Bookmark a lesson to keep it in your pack."],
  "plan-empty": ["Plan is empty", "A clear map. Add your first session."],
  offline: ["You're offline", "Saved workouts still play. We'll sync at camp."],
  "caught-up": ["All caught up", "Today's training is done. Rest well."],
  "no-results": ["No results", "Nothing on that ridge. Try another word."],
};

const MOMENT_COPY: Record<(typeof MOMENT_KINDS)[number], [string, string]> = {
  day: ["Day complete", 'MomentScene kind="day" · the day-complete screen and Completion variant="milestone"'],
  phase: ["Phase complete", 'MomentScene kind="phase" mark="2" · reaching a camp'],
  summit: ["Summit", 'MomentScene kind="summit" · level done, certificate header'],
  streak: ["Streak milestone", 'MomentScene kind="streak" mark="14" · 7, 14, 30, 60 days'],
};

const SPOT_COPY: Record<(typeof SPOTS)[number], [string, string]> = {
  "campfire-circle": ["Campfire circle", "Retreats: Men of Movement, storywork. Dusk in light mode, night in dark."],
  breathwork: ["Breathwork", "Retreats and Working-In: first light, the breath as the one accent."],
  "coaching-call": ["Coaching call", "Coaching: 1:1 and Executive Edge, a call at a window onto Shasta."],
};

const HEAT: HeatLevel[] = Array.from({ length: 84 }, (_, i) => {
  const d = i % 7;
  if (d === 6 || d === 3) return (i % 5 === 0 ? 1 : 0) as HeatLevel;
  return (((i * 7 + d * 3) % 5) as HeatLevel) || 1;
});

const RESKIN = {
  "--gfx-bell-hi": "#FFC59A",
  "--gfx-bell": "#F2632A",
  "--gfx-bell-lo": "#A93C12",
  "--gfx-day-accent": "#F2632A",
  "--gfx-day-accent-dark": "#FF8A4C",
} as CSSProperties;

function Block({ title, note, use, children, shot }: { title: string; note?: string; use?: string; children: ReactNode; shot?: string }) {
  return (
    <section className={s.block} data-shot={shot}>
      <header className={s.blockHead}>
        <h2>{title}</h2>
        {note ? <p>{note}</p> : null}
        {use ? <code className={s.use}>{use}</code> : null}
      </header>
      {children}
    </section>
  );
}

function Band({ theme, motion }: { theme: "light" | "dark"; motion: boolean }) {
  const card = s.card;
  return (
    <div data-theme={theme} className={s.band} data-shot={`band-${theme}`}>
      <p className={s.bandTag}>{theme === "light" ? "Light · daylight" : "Dark · dusk"}</p>

      <Block
        shot={`climb-${theme}`}
        title="The Climb"
        note="A level as a route up Mount Shasta: camps for each phase (done, current, ahead), the summit flag, and You · Day N anywhere on the trail. Daylight in light mode, dusk in dark. Markers and labels are HTML, so they stay crisp at any width."
        use={'<Climb totalDays={61} currentDay={24} phases={…} avatar="D" variant="full" | "compact" />'}
      >
        <div className={card}>
          <Climb totalDays={61} currentDay={24} avatar="D" animated={motion} />
        </div>
        <div className={s.climbRow}>
          <figure className={s.fig}>
            <div className={card}>
              <Climb totalDays={61} currentDay={46} variant="compact" animated={motion} />
            </div>
            <figcaption>Compact · Day 46 in Phase 3 · tablet card</figcaption>
          </figure>
          <figure className={s.fig} style={{ maxWidth: 360 }}>
            <div className={card}>
              <Climb totalDays={61} currentDay={12} variant="compact" avatar="D" animated={motion} />
            </div>
            <figcaption>Phone · 360 wide · names only</figcaption>
          </figure>
        </div>
        <div className={s.climbRow}>
          <figure className={s.fig}>
            <div className={card}>
              <Climb totalDays={61} currentDay={1} variant="compact" animated={motion} />
            </div>
            <figcaption>Day 1 · at the trailhead</figcaption>
          </figure>
          <figure className={s.fig}>
            <div className={card}>
              <Climb totalDays={61} currentDay={61} completedDays={61} variant="compact" animated={motion} />
            </div>
            <figcaption>Finished · on the summit</figcaption>
          </figure>
          <figure className={s.fig}>
            <div className={card}>
              <Climb
                totalDays={42}
                currentDay={20}
                variant="compact"
                phases={[
                  { startDay: 1, label: "Base", sub: "Week 1–2" },
                  { startDay: 15, label: "Build", sub: "Week 3–4" },
                  { startDay: 29, label: "Peak", sub: "Week 5–6" },
                ]}
                summitSub="Week 6"
                animated={motion}
              />
            </div>
            <figcaption>Any program: three camps, custom labels</figcaption>
          </figure>
        </div>
      </Block>

      <Block
        shot={`moments-${theme}`}
        title="Moments"
        note="Day complete, phase complete (a camp reached), the summit, and streak milestones, all in the same world. One-shot entrance, then flames and clouds move a little; still under reduced motion."
        use={'<MomentScene kind="day" | "phase" | "summit" | "streak" mark="2" size={320} />'}
      >
        <div className={s.grid2}>
          {MOMENT_KINDS.map((k) => (
            <figure key={k} className={s.fig}>
              <MomentScene kind={k} size="100%" mark={k === "phase" ? "2" : k === "streak" ? "14" : undefined} animated={motion} />
              <figcaption>
                <strong>{MOMENT_COPY[k][0]}</strong>
                <span>{MOMENT_COPY[k][1]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className={s.row}>
          <Replay>
            <Completion size={112} animated={motion} />
          </Replay>
          <Replay>
            <Completion size={64} animated={motion} />
          </Replay>
          <div className={s.streaks}>
            {[16, 22, 32, 48].map((z) => (
              <StreakFlame key={z} size={z} animated={motion} />
            ))}
            <StreakFlame size={32} lit={false} />
            <span className={s.streakChip}>
              <StreakFlame size={20} animated={false} /> <b>12</b> days
            </span>
          </div>
        </div>
      </Block>

      <Block
        shot={`empty-${theme}`}
        title="Empty states"
        note="Small vignettes: an arched window onto Shasta and one object from the trail at its sill, each with a single warm accent."
        use={'<EmptyScene scene="no-programs" size={240} />'}
      >
        <div className={s.grid3}>
          {EMPTY_SCENES.map((sc) => (
            <figure key={sc} className={`${s.fig} ${s.empty}`}>
              <EmptyScene scene={sc} size={240} animated={motion} />
              <figcaption>
                <strong>{SCENE_COPY[sc][0]}</strong>
                <span>{SCENE_COPY[sc][1]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block
        shot={`spots-${theme}`}
        title="Retreats and coaching"
        note="Spot illustrations for the Retreats and Coaching pages. Photos of Mike lead; these fill section headers, empty galleries and the coaching flow."
        use={'<Spot spot="campfire-circle" | "breathwork" | "coaching-call" size="100%" />'}
      >
        <div className={s.grid3}>
          {SPOTS.map((k) => (
            <figure key={k} className={s.fig}>
              <Spot spot={k} size="100%" animated={motion} />
              <figcaption>
                <strong>{SPOT_COPY[k][0]}</strong>
                <span>{SPOT_COPY[k][1]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block
        shot={`figures-${theme}`}
        title="Movement figures"
        note="The coach-checked rig, restyled: warm ink with form shading (lit from the upper right, core shadow, a warm rim), solid far limbs, shoes with chalk soles, a soft contact shadow, the bell in glacier blue with a clear handle. Ember dashes trace the bell's path."
        use={'<MovementFigure move="swing" size={176} animated trace />'}
      >
        <div className={s.figs}>
          {MOVE_NAMES.map((m) => (
            <figure key={m} className={s.figCell}>
              <MovementFigure move={m} size={150} animated={motion} trace />
              <figcaption>{MOVES[m].label}</figcaption>
            </figure>
          ))}
        </div>
        <div className={s.row}>
          {[24, 32, 48, 72, 120].map((z) => (
            <figure key={z} className={s.rampCell}>
              <MovementFigure move="swing" size={z} />
              <figcaption>{z}</figcaption>
            </figure>
          ))}
          <figure className={s.rampCell} style={RESKIN}>
            <MovementFigure move="squat" size={120} />
            <figcaption>ember bell via --gfx-bell</figcaption>
          </figure>
        </div>
      </Block>

      <Block
        shot={`glyphs-${theme}`}
        title="Day types"
        note="1.6 ink strokes, one shape in a soft glacier tint, an ember point. Workouts are the bell with I, II, III struck in it."
        use={'<DayGlyph type="workout-2" size={24} tone="accent" | "mono" />'}
      >
        <div className={s.glyphs}>
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
            <DayGlyph key={t} type={t} size={22} tone="mono" />
          ))}
          <span className={s.sep} />
          {DAY_TYPES.map((t) => (
            <DayGlyph key={`${t}16`} type={t} size={16} />
          ))}
          <span className={s.sep} />
          <span style={RESKIN} className={s.row}>
            <DayGlyph type="challenge" size={28} />
            <DayGlyph type="workout-3" size={28} />
          </span>
        </div>
      </Block>

      <Block
        shot={`medals-${theme}`}
        title="Medals and level crests"
        note="Enamel pins: polished metal, glossy enamel in the tier's colour with Shasta set between raised metal lines, the award struck in relief. Locked pins are unpainted."
        use={'<Medal tier="gold" glyph="challenge" size={104} /> · <LevelEmblem level={1} tier="gold" />'}
      >
        <div className={s.row}>
          {MEDAL_TIERS.map((t, i) => (
            <Medal key={t} tier={t} size={112} glyph={(["workout-1", "recovery", "challenge", undefined] as const)[i]} animated={motion} />
          ))}
          <Medal tier="gold" size={112} glyph="skill" locked />
        </div>
        <div className={s.row}>
          <LevelEmblem level={1} size={112} />
          <LevelEmblem level={2} size={112} tier="gold" />
          <LevelEmblem level={3} size={112} tier="bronze" />
          <LevelEmblem level={1} size={44} tier="gold" />
          <Medal tier="platinum" size={64} glyph="on-ramp" />
          <Medal tier="bronze" size={44} glyph="workout-2" />
          <Medal tier="silver" size={28} />
        </div>
      </Block>

      <Block
        shot={`sky-${theme}`}
        title="Today header · Shasta through the day"
        note="ShastaSky picks its light from the clock (skyTimeFor). Same world, four lights."
        use={'<ShastaSky time={skyTimeFor(new Date().getHours())} height={150} />'}
      >
        <div className={s.skies}>
          {SKY_TIMES.map((t) => (
            <figure key={t} className={s.sky}>
              <ShastaSky time={t} height={150} animated={motion} />
              <figcaption>
                <strong>Good {t === "dawn" ? "morning" : t === "day" ? "afternoon" : t === "dusk" ? "evening" : "night"}, Daniel</strong>
                <span>{t[0].toUpperCase() + t.slice(1)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block shot={`data-${theme}`} title="Data marks" note="Progress in ember, actions in glacier: the swing arc, rings, readiness, the training heatmap and the kettlebell mark.">
        <div className={s.row}>
          <SwingArc size={88} progress={0.6} />
          <SwingArc size={88} progress={1} />
          <Rings values={[23 / 61, 2 / 7, 12 / 30]} size={110} animated={motion} />
          <ReadinessDial score={52} band="green" size={130} animated={motion} />
          <TrainingHeatmap days={HEAT} todayIndex={78} size={12} gap={3} />
        </div>
        <div className={s.row}>
          <Kettlebell size={24} />
          <Kettlebell size={40} />
          {[8, 12, 16, 24, 32].map((w) => (
            <Kettlebell key={w} size={52} weight={w} colorCoded />
          ))}
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
        <p className={s.kicker}>Mike Salemi App · Summit</p>
        <h1>Illustrations</h1>
        <p>
          One world for the whole app: Mount Shasta from the south-west, layered ridges in atmospheric perspective, mixed conifers, warm
          light. Daylight in light mode, dusk in dark. Colours come from <code>--gfx-*</code> custom properties (world palette:{" "}
          <code>--gfx-world-*</code>); geometry is seeded, so server and client draw the same marks. Motion respects reduced motion; add{" "}
          <a href="?motion=off">?motion=off</a> for stills or <a href="?theme=dark">?theme=dark</a> for one theme.
        </p>
      </header>
      {themes.map((t) => (
        <Band key={t} theme={t} motion={motion} />
      ))}
    </main>
  );
}
