import type { Metadata } from "next";
import "@ms/tokens/css";
import { cls } from "@/components/graphics/util";
import { RigFigure, type RigMoveName } from "@/components/graphics/figures/RigFigure";
import { STUDY_MOVES } from "@/components/graphics/figures/library";
import { keyPhase } from "@/components/graphics/figures/rig";
import { DayGlyphNext, STUDY_DAY_LABEL, STUDY_DAY_TYPES } from "@/components/graphics/next/DayGlyphNext";
import { MedalNext } from "@/components/graphics/next/MedalNext";
import { EmptySceneNext } from "@/components/graphics/next/EmptySceneNext";
import "@/components/graphics/preview/study.css";

const s = cls("gfx-st");

export const metadata: Metadata = {
  title: "Graphics study",
  robots: { index: false, follow: false },
};

/** Keyframes shown under each movement: [key index, caption]. */
const KEYS: Record<RigMoveName, Array<[number, string]>> = {
  swing: [
    [3, "Hike"],
    [4, "Hip snap"],
    [0, "Float"],
  ],
  getup: [
    [0, "Lying, bell pressed"],
    [3, "High bridge"],
    [6, "Half-kneel"],
    [8, "Stand"],
  ],
  squat: [
    [0, "Stand tall"],
    [1, "Descend"],
    [2, "Bottom"],
  ],
};

const NOTES: Record<RigMoveName, string> = {
  swing: "Hip hinge, not a squat: shins stay near vertical, flat back, the bell hikes high between the thighs, then the hips snap and the bell floats to chest height in line with straight arms.",
  getup: "Lying with the bell pressed, roll to elbow, post to hand, high bridge, sweep to a kneel, half-kneel, stand. The bell arm stays vertical, eyes on the bell; then back down.",
  squat: "Bell held by the horns at the chest, elbows down. Sit between the heels to below parallel, torso tall, knees forward over the toes, heels down.",
};

function Band({ theme, motion }: { theme: "light" | "dark"; motion: boolean }) {
  return (
    <section data-theme={theme} className={s.band}>
      <div className={s.bandHead}>
        <h2>{theme === "light" ? "Light" : "Dark"}</h2>
      </div>

      {(Object.keys(STUDY_MOVES) as RigMoveName[]).map((m) => (
        <article key={m} className={s.move} data-shot={`move-${m}-${theme}`}>
          <div className={s.hero}>
            <RigFigure move={m} size={300} animated={motion} />
          </div>
          <div className={s.moveBody}>
            <h3>{STUDY_MOVES[m].label}</h3>
            <p>{NOTES[m]}</p>
            <div className={s.keys}>
              {KEYS[m].map(([k, cap]) => (
                <figure key={k} className={s.key} data-shot={`key-${m}-${k}-${theme}`}>
                  <RigFigure move={m} size={150} at={keyPhase(STUDY_MOVES[m], k)} animated={false} trace={false} />
                  <figcaption>{cap}</figcaption>
                </figure>
              ))}
            </div>
            <div className={s.ramp}>
              {[32, 48, 72].map((z) => (
                <figure key={z} className={s.rampCell}>
                  <RigFigure move={m} size={z} animated={false} trace={false} weight={z < 40 ? 1.12 : 1} />
                  <figcaption>{z}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </article>
      ))}

      <div className={s.trio}>
        <article className={s.tile} data-shot={`scene-${theme}`}>
          <EmptySceneNext size={360} animated={motion} />
          <h3>No programs yet</h3>
          <p>Programs you start will show up here.</p>
        </article>

        <article className={s.tile} data-shot={`medal-${theme}`}>
          <div className={s.medals}>
            <MedalNext tier="platinum" size={176} />
            <MedalNext tier="platinum" size={64} />
            <MedalNext tier="platinum" size={36} />
          </div>
          <h3>Platinum award</h3>
          <p>Struck rim, engraved legend, glacier enamel under glass.</p>
        </article>

        <article className={s.tile} data-shot={`glyphs-${theme}`}>
          <div className={s.glyphs}>
            {STUDY_DAY_TYPES.map((t) => (
              <figure key={t} className={s.glyphCell}>
                <span className={s.chip}>
                  <DayGlyphNext type={t} size={28} />
                </span>
                <figcaption>{STUDY_DAY_LABEL[t]}</figcaption>
              </figure>
            ))}
          </div>
          <div className={s.glyphRow}>
            {STUDY_DAY_TYPES.map((t) => (
              <DayGlyphNext key={t} type={t} size={56} />
            ))}
          </div>
          <div className={s.glyphRow}>
            {STUDY_DAY_TYPES.map((t) => (
              <DayGlyphNext key={t} type={t} size={20} tone="mono" />
            ))}
            {STUDY_DAY_TYPES.map((t) => (
              <DayGlyphNext key={`${t}-16`} type={t} size={16} />
            ))}
          </div>
          <h3>Day types</h3>
          <p>Filled, palette rendering: ink plus one accent part. 28, 56, 20 mono, 16.</p>
        </article>
      </div>
    </section>
  );
}

export default async function GraphicsStudy({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const motion = q.motion !== "off";
  const only: Array<"light" | "dark"> = q.theme === "light" || q.theme === "dark" ? [q.theme] : ["light", "dark"];
  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1>Signature graphics: style study</h1>
        <p>
          Movement figures on a real rig (true limb lengths, planted feet, hands on the handle), one empty state, one award and four day
          types, in light and dark. Add <a href="?motion=off">?motion=off</a> for stills.
        </p>
      </header>
      {only.map((t) => (
        <Band key={t} theme={t} motion={motion} />
      ))}
    </main>
  );
}
