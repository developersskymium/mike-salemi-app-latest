import type { Metadata } from "next";
import type { ReactNode } from "react";
import { themes, type } from "@ms/tokens";
import {
  AmbientBackdrop, Avatar, Button, Card, Chip, EmptyState, ExerciseRow, Glass, Icon, ICON_NAMES, IconButton, Poster,
  ProgressBar, RestRow, Rings, Skeleton, SkeletonText, StatTile, StepSegments, WorkoutTable,
} from "@/components/ui";
import { ToastProvider } from "@/components/ui/Toast";
import { FxLayer } from "@/components/ui/FxLayer";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { IMG } from "./_parts/images";
import { ControlsDemo, SheetDemo, ToastDemo } from "./_parts/Interactive";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

function Block({ title, note, children, span, photo }: { title: string; note?: string; children: ReactNode; span?: boolean; photo?: boolean }) {
  return (
    <Glass as="section" radius="card" className="g-block" data-span={span ? "" : undefined} level={photo ? "clear" : "regular"} style={{ padding: 20 }}>
      <h3 className="lq-t17">{title}</h3>
      {note && <p className="lq-t13 lq-c2" style={{ marginTop: 2 }}>{note}</p>}
      <div style={{ marginTop: 16 }}>{children}</div>
    </Glass>
  );
}

const SWATCHES: [string, string][] = [
  ["accent", "Glacier: the one primary action, “now”"],
  ["accent-ink", "Accent text"],
  ["accent-soft", "Ice tint"],
  ["label", "Primary text"],
  ["label-2", "Secondary"],
  ["label-3", "Tertiary"],
  ["bg", "Background"],
  ["bg-elev", "Elevated"],
];

function Section({ theme }: { theme: "light" | "dark" }) {
  const t = themes[theme];
  return (
    <div data-theme={theme} className="g-theme" style={{ background: "var(--bg)", color: "var(--label)" }}>
      <AmbientBackdrop src={IMG.coaching} position="50% 30%" />
      <div className="g-wrap">
        <header className="g-head">
          <div>
            <p className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Liquid design system</p>
            <h1 className="lq-t34">{theme === "light" ? "Light" : "Dark"}</h1>
          </div>
          <div style={{ width: 300 }}>
            <ThemeSwitch persist={false} size="sm" />
          </div>
        </header>

        <div className="g-grid">
          {/* Hero card: clear glass over photography, the one accent action */}
          <Card
            height={452}
            radius="hero"
            image={{ src: IMG.coaching, alt: "Mike coaching a kettlebell press", position: "46% 22%", priority: theme === "light" }}
            className="g-span"
          >
            <Glass level="clear" radius="hero" style={{ position: "absolute", left: 12, right: 12, bottom: 12, maxWidth: 440, padding: "20px 20px 16px", zIndex: 2 }}>
              <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.92 }}>Day 24 of 61, Phase 2</div>
              <h2 className="lq-t34" style={{ marginTop: 2 }}>Workout II</h2>
              <div className="lq-t15" style={{ display: "flex", gap: 14, marginTop: 6, opacity: 0.95 }}>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="timer" size="sm" /><span className="lq-num">52 min</span></span>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="steps" size="sm" />7 steps</span>
                <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="kettlebell" size="sm" />Level I</span>
              </div>
              <Button block icon="play" style={{ marginTop: 18 }}>Continue Day 24</Button>
              <div className="lq-t13" style={{ textAlign: "center", marginTop: 10, opacity: 0.88 }}>Next: Bodyweight Warm Up, step 3 of 7</div>
            </Glass>
          </Card>

          <Block title="Rings" note="One hue family and a neutral. Fill with a spring overshoot; numbers tick up.">
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <Rings size={120} stroke={14} label="23 of 61 days, 2 of 7 steps, 12 day streak" rings={[{ value: 23 / 61, tone: 1 }, { value: 2 / 7, tone: 2 }, { value: 12 / 14, tone: 3 }]} />
              <div className="lq-legend">
                <StatTile swatch={1} value={23} unit="/61 days" label="Program" />
                <StatTile swatch={2} value={2} unit="/7 steps" label="Today" />
                <StatTile swatch={3} value={12} unit=" days" label="Streak" />
              </div>
            </div>
          </Block>

          <Block title="Colour" note="Monochrome glass. Photography brings the colour; Glacier marks what to do now.">
            <div className="g-swatches">
              {SWATCHES.map(([k, d]) => (
                <div key={k}>
                  <div className="g-chip" style={{ background: `var(--${k})` }} />
                  <div className="lq-t13" style={{ fontWeight: 650, marginTop: 6 }}>{k}</div>
                  <div className="lq-t11 lq-c2" style={{ fontWeight: 500 }}>{(t as Record<string, string>)[k]} · {d}</div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Buttons" note="Filled is the single primary action per screen. Press: spring scale and a light sweep.">
            <div className="g-row">
              <Button icon="play">Continue Day 24</Button>
              <Button variant="glass" size="md" icon="share">Share</Button>
              <Button variant="fill" size="md">Switch level</Button>
              <Button variant="tint" size="sm" icon="play">Follow along</Button>
              <Button variant="plain" size="sm">Library</Button>
              <Button size="sm" disabled>Locked</Button>
            </div>
            <div className="g-row" style={{ marginTop: 14 }}>
              <IconButton icon="back" label="Back" />
              <IconButton icon="more" label="More" />
              <IconButton icon="search" label="Search" />
              <IconButton icon="bell" label="Notifications" />
              <IconButton icon="close" label="Close" variant="fill" size="sm" iconSize="sm" />
              <ToastDemo />
              <SheetDemo />
            </div>
          </Block>

          <Block title="Controls" note="The lens slides and stretches; the toggle knob squashes while pressed; Complete draws its check.">
            <ControlsDemo />
          </Block>

          <Card
            height={250}
            image={{ src: IMG.shastaRidge, alt: "Mount Shasta ridge at dusk", position: "40% 50%" }}
            footer={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="lq-t13" style={{ opacity: 0.85, fontWeight: 600 }}>Retreat invitation</div>
                  <div className="lq-t22">The Breakthrough</div>
                  <div className="lq-t13" style={{ opacity: 0.92 }}>Mount Shasta, May 13–16</div>
                </div>
                <Button variant="white" size="sm" href="/explore">Apply</Button>
              </div>
            }
          />

          <Block title="Poster" note="Video poster with a glyph slot (custom graphics go here) and overlay chips.">
            <Poster
              image={{ src: IMG.redgym, alt: "Mike in a windmill at the gym", position: "64% 40%" }}
              height={240}
              glyph={<IconButton icon="play" label="Play main video" variant="clear" size="lg" iconSize="lg" />}
            >
              <Chip variant="clear" style={{ position: "absolute", left: 12, top: 12, height: 28 }}>Main video</Chip>
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "#fff" }}>
                <ProgressBar value={0.29} tone="white" label="Video position" />
                <div className="lq-t11 lq-num" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, opacity: 0.9 }}><span>1:48</span><span>−4:24</span></div>
              </div>
            </Poster>
            <StepSegments total={7} done={4} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
              <div><div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Step 5 of 7</div><h2 className="lq-t28">Workout II</h2></div>
              <Chip score={14}>Chart 2 modification</Chip>
            </div>
          </Block>

          <Glass as="section" level="thick" radius="card" style={{ padding: "18px 18px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div><h3 className="lq-t22">Circuit 1</h3><div className="lq-t13 lq-c2">3 rounds, about 14 min</div></div>
              <Button variant="tint" size="sm" icon="play">Follow along</Button>
            </div>
            <WorkoutTable label="Circuit 1">
              <ExerciseRow name="Romanian Deadlift" load="moderate" loadLabel="Moderate" reps={12} sets={3} tempo="Mod" />
              <RestRow>Rest 30 sec</RestRow>
              <ExerciseRow name="Half Kneeling Halo" load="light" loadLabel="Light" reps={12} repsNote="6/6" sets={3} tempo="Mod" />
              <RestRow>Rest 30 sec</RestRow>
              <ExerciseRow name="Abdominal Roll Ups" load="bodyweight" loadLabel="Body weight" reps={8} sets={3} tempo="Mod" />
              <RestRow end>Rest as needed, then repeat</RestRow>
            </WorkoutTable>
          </Glass>

          <Block title="Chips and avatars">
            <div className="g-row">
              <Chip>Glass</Chip>
              <Chip variant="fill" icon="clock">20 min</Chip>
              <Chip variant="tint" dot>Live now</Chip>
              <Chip variant="outline">Level I</Chip>
              <Chip variant="fill" selected>Selected</Chip>
              <Chip score={14}>Chart 2</Chip>
            </div>
            <div className="g-row" style={{ marginTop: 14 }}>
              <Avatar name="Daniel Reyes" size="sm" />
              <Avatar name="Daniel Reyes" size="md" variant="solid" />
              <Avatar name="Daniel Reyes" />
              <Avatar name="Daniel Reyes" variant="glass" />
              <Avatar name="Daniel Reyes" size="xl" />
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <ProgressBar value={0.38} label="Program progress" />
              <ProgressBar value={0.62} tone="accent" label="Today" />
            </div>
          </Block>

          <Block title="Loading" note="Skeletons shimmer in glass. Wrap the region in aria-busy.">
            <div aria-busy="true" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Skeleton shape="circle" width={44} />
                <div style={{ flex: 1 }}><SkeletonText lines={2} /></div>
              </div>
              <Skeleton shape="card" height={120} glass />
              <Skeleton shape="title" width="60%" />
            </div>
          </Block>

          <Block title="Empty state" note="Illustration slot for the graphics set; one action.">
            <EmptyState
              icon="bookmark"
              title="Nothing saved yet"
              body="Save a video or a tool result and it lands here."
              action={<Button size="md" variant="fill" href="/library">Browse the library</Button>}
            />
          </Block>

          <Block title="Type" note="iOS scale on the Apple system stack, Inter after it.">
            <div style={{ display: "grid", gap: 6 }}>
              {(["t34", "t28", "t22", "t17", "t15", "t13", "t11"] as const).map((k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, borderBottom: "1px solid var(--sep)", paddingBottom: 6 }}>
                  <span className={`lq-${k}`}>Workout II</span>
                  <span className="lq-t11 lq-c2 lq-num">{type[k].size}/{type[k].line} · {type[k].weight}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Glass levels" note="Regular for cards and bars, clear over photos, thick for sheets and tables.">
            <div className="g-glassdemo">
              <Poster image={{ src: IMG.mtk, alt: "", position: "50% 30%" }} height={180}>
                <div style={{ position: "absolute", inset: 16, display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <Glass radius="panel" style={{ flex: 1, padding: 14 }}><div className="lq-t15" style={{ fontWeight: 650 }}>Regular</div><div className="lq-t13 lq-c2">Cards</div></Glass>
                  <Glass level="clear" radius="panel" style={{ flex: 1, padding: 14 }}><div className="lq-t15" style={{ fontWeight: 650 }}>Clear</div><div className="lq-t13" style={{ opacity: 0.85 }}>Over photos</div></Glass>
                  <Glass level="thick" radius="panel" style={{ flex: 1, padding: 14 }}><div className="lq-t15" style={{ fontWeight: 650 }}>Thick</div><div className="lq-t13 lq-c2">Sheets</div></Glass>
                </div>
              </Poster>
            </div>
          </Block>

          <Block title="Icons" span>
            <div className="g-icons">
              {ICON_NAMES.map((n) => (
                <div key={n}><Icon name={n} /><span className="lq-t11 lq-c2" style={{ fontWeight: 500 }}>{n}</span></div>
              ))}
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

/** Hidden reference page: every primitive in both themes (screenshot QA, other agents). */
export default function GalleryPage() {
  return (
    <ToastProvider>
      <FxLayer />
      <style>{GALLERY_CSS}</style>
      <Section theme="light" />
      <Section theme="dark" />
    </ToastProvider>
  );
}

const GALLERY_CSS = `
.g-theme { position: relative; isolation: isolate; overflow: hidden; }
.g-wrap { position: relative; z-index: 1; max-width: 1240px; margin: 0 auto; padding: 48px 16px 64px; }
.g-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.g-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .g-wrap { padding: 56px 40px 72px; } .g-grid { grid-template-columns: 1fr 1fr; gap: 20px; } .g-span, [data-span] { grid-column: 1 / -1; } }
@media (min-width: 1280px) { .g-grid { grid-template-columns: repeat(3, 1fr); } .g-span { grid-column: span 2; } }
.g-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.g-swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.g-chip { height: 48px; border-radius: var(--r-thumb); box-shadow: inset 0 0 0 1px var(--sep); }
.g-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 14px 8px; }
.g-icons > div { display: grid; justify-items: center; gap: 6px; text-align: center; }
.g-block .lq-segs { margin-top: 16px; }
`;
