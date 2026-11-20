import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@ms/tokens/css";
import { cls } from "@/components/graphics/util";
import {
  Aurora,
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
  StreakFlame,
} from "@/components/graphics";
import { MOVES } from "@/components/graphics/figures/moves";
import { Replay } from "@/components/graphics/preview/Replay";
import "@/components/graphics/preview/preview.css";

const s = cls("gfx-pv");

export const metadata: Metadata = {
  title: "Graphics",
  robots: { index: false, follow: false },
};

const PHASES = [
  { startDay: 1, label: "On Ramp", name: "Days 1–7" },
  { startDay: 8, label: "Phase 1", name: "Foundation" },
  { startDay: 25, label: "Phase 2", name: "Build" },
  { startDay: 46, label: "Phase 3", name: "Peak" },
];

const SCENE_COPY: Record<(typeof EMPTY_SCENES)[number], string> = {
  "no-programs": "No programs yet",
  "nothing-saved": "Nothing saved",
  "plan-empty": "Plan is empty",
  offline: "You're offline",
  "caught-up": "All caught up",
};

function Section({ title, note, single, children }: { title: string; note?: string; single?: boolean; children: (motion: boolean) => ReactNode }) {
  return (
    <section className={`${s.section} ${single ? s.single : ""}`}>
      {(["light", "dark"] as const).map((theme) => (
        <div key={theme} data-theme={theme} className={s.panel}>
          <h2 className={s.title}>{title}</h2>
          <p className={s.note}>
            {note ? `${note}. ` : ""}
            {theme === "light" ? "Light" : "Dark"}
          </p>
          {children(true)}
        </div>
      ))}
    </section>
  );
}

export default async function GraphicsPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const motion = q.motion !== "off";

  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1>Signature graphics</h1>
        <p>
          Every custom graphic in the app, in light and dark. Motion loops respect reduced motion. Add{" "}
          <a href="?motion=off">?motion=off</a> to see the stills.
        </p>
      </header>

      <Section title="Movement figures" note="One line style, the kettlebell as the single accent; each loops its movement">
        {() => (
          <>
            <div className={s.figGrid}>
              {MOVE_NAMES.map((m) => (
                <div key={m} className={s.figCell}>
                  <MovementFigure move={m} size={104} animated={motion} />
                  <span className={s.cap}>{MOVES[m].label}</span>
                </div>
              ))}
            </div>
            <div className={s.row} style={{ marginTop: 20 }}>
              {[32, 48, 72].map((z) => (
                <div key={z} className={s.cell}>
                  <MovementFigure move="swing" size={z} stroke={z < 40 ? 1.4 : 1.75} />
                  <span className={s.cap}>{z}px still</span>
                </div>
              ))}
              <div className={s.cell}>
                <MovementFigure move="snatch" size={168} animated={motion} stroke={2} />
                <span className={s.cap}>168px, 2px stroke</span>
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Day types" note="24px marks; numerals, moon, flag and dots carry the accent">
        {() => (
          <>
            <div className={s.glyphGrid}>
              {DAY_TYPES.map((t) => (
                <div key={t} className={s.glyphCell}>
                  <span className={s.glyphChip}>
                    <DayGlyph type={t} />
                  </span>
                  <span className={s.cap}>{DAY_TYPE_LABEL[t]}</span>
                </div>
              ))}
            </div>
            <div className={s.row} style={{ marginTop: 20 }}>
              {DAY_TYPES.map((t) => (
                <DayGlyph key={t} type={t} size={40} strokeWidth={1.5} />
              ))}
            </div>
            <div className={s.row}>
              {DAY_TYPES.map((t) => (
                <DayGlyph key={t} type={t} size={20} tone="mono" />
              ))}
              <span className={s.cap}>20px mono</span>
            </div>
          </>
        )}
      </Section>

      <Section title="Phase landscape" note="Program hero: day 24 of 61, today pulses, camps mark the phases" single>
        {() => (
          <div className={s.heroGrid}>
            <div className={`${s.card} ${s.heroCard}`}>
              <div className={s.heroHead}>
                <small>Kettlebell Lifestyle</small>
                <strong>Day 24 of 61</strong>
              </div>
              <PhaseLandscape totalDays={61} completedDays={23} currentDay={24} phases={PHASES} animated={motion} />
            </div>
            <div className={`${s.card} ${s.heroCard}`}>
              <div className={s.heroHead}>
                <small>Phone width</small>
                <strong>Day 52</strong>
              </div>
              <PhaseLandscape totalDays={61} completedDays={51} currentDay={52} phases={PHASES} animated={motion} />
            </div>
          </div>
        )}
      </Section>

      <Section title="Readiness and rings" note="Needle springs to the score; rings spring to their values">
        {() => (
          <>
            <div className={s.row}>
              <div className={s.cell}>
                <ReadinessDial score={52} band="green" size={184} animated={motion} />
              </div>
              <div className={s.cell}>
                <ReadinessDial score={31} band="amber" size={184} animated={motion} />
              </div>
              <div className={s.cell}>
                <ReadinessDial score={12} band="red" size={184} animated={motion} />
              </div>
            </div>
            <div className={s.row}>
              <Rings values={[23 / 61, 2 / 7, 12 / 30]} size={150} animated={motion} />
              <Rings values={[0.82, 0.55, 1]} size={110} animated={motion} />
              <Rings values={[0.64, 0.3]} size={72} animated={motion} />
              <Rings values={[0.4]} size={36} thickness={5} animated={motion} />
            </div>
          </>
        )}
      </Section>

      <Section title="Completion moments" note="Step complete, then phase complete over the ridge">
        {() => (
          <div className={s.row} style={{ alignItems: "center" }}>
            <Replay>
              <Completion animated={motion} size={120} />
            </Replay>
            <div className={s.cell}>
              <Completion animated={false} size={56} />
              <span className={s.cap}>Settled, 56px</span>
            </div>
            <Replay>
              <Completion variant="milestone" animated={motion} size={300} />
            </Replay>
          </div>
        )}
      </Section>

      <Section title="Streak flame" note="Blue fire with a white-hot core; unlit when paused">
        {() => (
          <div className={s.row} style={{ alignItems: "flex-end" }}>
            {[16, 22, 32, 48, 72].map((z) => (
              <div key={z} className={s.cell}>
                <StreakFlame size={z} animated={motion} />
                <span className={s.cap}>{z}</span>
              </div>
            ))}
            <div className={s.cell}>
              <StreakFlame size={48} lit={false} />
              <span className={s.cap}>Paused</span>
            </div>
            <div className={s.cell} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <StreakFlame size={22} animated={motion} />
              <span style={{ font: "650 22px/28px var(--font)", letterSpacing: "-.02em" }}>12</span>
              <span className={s.cap}>day streak</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Empty states" note="Calm line scenes with one accent detail each" single>
        {() => (
          <div className={s.row} style={{ justifyContent: "space-between" }}>
            {EMPTY_SCENES.map((sc) => (
              <div key={sc} className={s.cell}>
                <EmptyScene scene={sc} size={184} animated={motion} />
                <span className={s.cap}>
                  <b>{SCENE_COPY[sc]}</b>
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Medals and level" note="Four metals, engraved glyph slot, locked state, level crest">
        {() => (
          <>
            <div className={s.row}>
              {MEDAL_TIERS.map((t, i) => (
                <div key={t} className={s.cell}>
                  <Medal tier={t} glyph={(["workout-1", "recovery", "challenge", "overview"] as const)[i]} size={104} animated={motion} />
                  <span className={s.cap}>{t[0].toUpperCase() + t.slice(1)}</span>
                </div>
              ))}
              <div className={s.cell}>
                <Medal tier="gold" glyph="skill" size={104} locked />
                <span className={s.cap}>Locked</span>
              </div>
            </div>
            <div className={s.row}>
              <LevelEmblem level={1} size={96} />
              <LevelEmblem level={2} size={96} tier="silver" />
              <LevelEmblem level={3} size={96} tier="gold" />
              <Medal tier="platinum" size={48} />
              <Medal tier="bronze" glyph="on-ramp" size={32} />
            </div>
          </>
        )}
      </Section>

      <Section title="Kettlebell" note="Glyph, cast mark and the Selector result">
        {() => (
          <div className={s.row} style={{ alignItems: "flex-end" }}>
            <Kettlebell size={24} />
            <Kettlebell size={48} />
            <Kettlebell size={64} variant="solid" />
            <div className={s.cell}>
              <Kettlebell size={112} weight={16} />
              <span className={s.cap}>Your bell</span>
            </div>
            {[8, 16, 24, 32].map((w) => (
              <div key={w} className={s.cell}>
                <Kettlebell size={72} weight={w} colorCoded />
                <span className={s.cap}>Competition</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Ambient" note="Glacier aurora and film grain behind an empty screen">
        {() => (
          <div className={s.ambient}>
            <Aurora animated={motion} />
            <Grain animated={motion} />
            <div className={s.ambientText}>
              <EmptyScene scene="caught-up" size={160} animated={motion} />
              <strong>All caught up</strong>
              <span>Today's training is done. Rest well.</span>
            </div>
          </div>
        )}
      </Section>
    </main>
  );
}
