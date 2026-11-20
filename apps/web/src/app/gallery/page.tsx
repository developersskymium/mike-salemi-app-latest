import type { Metadata } from "next";
import type { ReactNode } from "react";
import { palette } from "@ms/tokens";
import {
  Avatar, Button, Card, Chip, EmptyState, ExerciseRow, Glass, Icon, ICON_NAMES, IconButton, Poster, ProgressBar, RestRow, Rings,
  Skeleton, SkeletonText, StatTile, StepSegments, Tag, WorkoutTable,
} from "@/components/ui";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import {
  BeyondTheSummit, Climb, Flare, LightPill, NextStepCard, OrbitLoader, PhotoHero, StreakChip, SwingRibbon, WeekDots, WeekTrace,
} from "@/components/signature";
import { IMG } from "./_parts/images";
import { ControlsDemo, Replay, SheetDemo, StretchDemo, ToastDemo } from "./_parts/Interactive";
import { WEEK } from "./_parts/Week";
import "./gallery.css";

export const metadata: Metadata = { title: "Summit design system", robots: { index: false, follow: false } };

const PHASES = [
  { label: "On Ramp", from: 1, to: 7 },
  { label: "Phase 1", from: 8, to: 20 },
  { label: "Phase 2", from: 21, to: 40 },
  { label: "Phase 3", from: 41, to: 61 },
];

const PRINCIPLES: [string, string][] = [
  ["Mike leads", "Full-colour, warm photography of Mike on every key surface. Never tinted, never desaturated."],
  ["Daylight surfaces", "Warm chalk ground, crisp white cards, three levels of depth, generous space."],
  ["Calm, premium type", "Instrument Sans for everything — 600 with tight tracking for headlines and numbers — and Instrument Serif italic for Mike's notes."],
  ["Glacier + Ember", "Glacier blue means act. Ember means progress, streaks and achievement. Ink for text."],
  ["The Climb", "Progress is a route up Mount Shasta: phases are camps, levels are summits."],
  ["One next step", "Every screen has one obvious primary action — usually “start” or “resume”."],
  ["Offers as the next camp", "Upgrades appear where they help your progress, with real value. Never as ads."],
];

function Sec({ title, note, children, id }: { title: string; note?: string; children: ReactNode; id?: string }) {
  return (
    <section className="g-sec" id={id}>
      <div className="g-sec-h">
        <h2 className="lq-d-lg">{title}</h2>
        {note && <p className="lq-t13 lq-c2">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ title, note, children, className }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <Glass as="div" radius="card" className={className ? `g-tile ${className}` : "g-tile"}>
      {title && <h3 className="lq-eyebrow">{title}</h3>}
      {note && <p className="lq-t13 lq-c2" style={{ marginTop: 6 }}>{note}</p>}
      <div style={{ marginTop: title || note ? 16 : 0 }}>{children}</div>
    </Glass>
  );
}

const SWATCHES: { name: string; keys: string[] }[] = [
  { name: "Glacier — brand & action", keys: ["glacier-50", "glacier-100", "glacier-200", "glacier-300", "glacier-400", "glacier-500", "glacier-600", "glacier-700", "glacier-900"] },
  { name: "Ember — energy, streaks, achievement", keys: ["ember-50", "ember-100", "ember-200", "ember-300", "ember-400", "ember-500", "ember-600", "ember-700", "gold"] },
  { name: "Ink & chalk — warm neutrals", keys: ["ink-900", "ink-700", "ink-500", "ink-400", "chalk-300", "chalk-200", "chalk-100", "chalk-50", "chalk-0"] },
];

export default function Gallery() {
  const pal = palette as Record<string, string>;
  return (
    <ToastProvider>
      <main className="g">
        <header className="g-top">
          <div>
            <div className="lq-eyebrow" data-tone="accent">Mike Salemi app · Direction 3</div>
            <h1 className="lq-d-xxl" style={{ marginTop: 10 }}>Summit</h1>
            <p className="lq-lede" style={{ maxWidth: 520, marginTop: 14 }}>
              A daylight, photo-led system for training with Mike. Strong type, real colour, and progress you can see — every member is on a climb.
            </p>
            <div className="g-row" style={{ marginTop: 22 }}>
              <LightPill href="/gallery/shell" icon="play">Open the shell</LightPill>
              <Button variant="glass" href="#climb">The Climb</Button>
            </div>
          </div>
          <div className="g-top-r">
            <ThemeSwitch persist={false} size="sm" />
            <div className="g-top-photos">
              <Poster image={{ src: IMG.mtk, alt: "Mike Salemi with a kettlebell", position: "62% 30%", priority: true, sizes: "(min-width: 900px) 240px, 50vw" }} className="g-ph1" />
              <Poster image={{ src: IMG.summit, alt: "Men of Movement on Mount Shasta", position: "50% 40%", sizes: "(min-width: 900px) 220px, 50vw" }} className="g-ph2" />
              <Poster image={{ src: IMG.coaching, alt: "Mike coaching", position: "50% 30%", sizes: "(min-width: 900px) 220px, 50vw" }} className="g-ph3" />
            </div>
          </div>
        </header>

        <Sec title="Principles">
          <div className="g-principles">
            {PRINCIPLES.map(([t, d], i) => (
              <Glass key={t} radius="card" className="g-principle">
                <span className="lq-warm lq-t12">{String(i + 1).padStart(2, "0")}</span>
                <b className="lq-d-xs">{t}</b>
                <span className="lq-t12 lq-c2" style={{ fontWeight: 500, lineHeight: 1.45 }}>{d}</span>
              </Glass>
            ))}
          </div>
        </Sec>

        <Sec title="Colour" note="Glacier is action (~60% of accent use), ember is progress (~25%), gold is for medals, green for done. Everything else is ink, chalk and photography.">
          <div className="g-colour">
            {SWATCHES.map((g) => (
              <div key={g.name}>
                <div className="lq-eyebrow">{g.name}</div>
                <div className="g-swatches">
                  {g.keys.map((k) => (
                    <div key={k} className="g-sw">
                      <i style={{ background: pal[k] }} />
                      <b>{k.replace(/-(\d+)$/, " $1")}</b>
                      <span>{pal[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="g-share">
              <span style={{ flex: 6, background: "var(--accent)" }}>Act · 60%</span>
              <span style={{ flex: 2.5, background: "var(--warm)" }}>Progress · 25%</span>
              <span style={{ flex: 0.8, background: "var(--gold)", color: "#3A2A00" }}>Win</span>
              <span style={{ flex: 1.2, background: "var(--ok)" }}>Done</span>
            </div>
          </div>
        </Sec>

        <Sec title="Type" note="Instrument Sans 600 for headlines and numbers (−4% tracking on big headlines, tabular numerals); Instrument Sans 420–600 for text; Instrument Serif italic only for Mike's words. Captions and labels 12–13px; eyebrows are 11.5px caps.">
          <Tile>
            <div className="lq-eyebrow">Display · Instrument Sans 600</div>
            <div className="lq-d-xl" style={{ marginTop: 10 }}>Recovery Day</div>
            <div className="lq-d-lg" style={{ marginTop: 6 }}>You&apos;re 38% of the way up.</div>
            <div className="lq-d-md" style={{ marginTop: 6 }}>Phase 2 · Adding Complexity</div>
            <div className="lq-d-sm" style={{ marginTop: 6 }}>Mastering the Kettlebell</div>
            <hr className="lq-hair" style={{ margin: "20px 0" }} />
            <div className="lq-eyebrow">Text · Inter</div>
            <p className="lq-lede" style={{ marginTop: 8 }}>Recovery is where yesterday&apos;s work turns into strength. Breathe slow, move easy — and show up.</p>
            <p className="lq-t13 lq-c3" style={{ marginTop: 6 }}>Captions, meta and labels sit at 12–13px in ink 500.</p>
            <hr className="lq-hair" style={{ margin: "20px 0" }} />
            <div className="g-nums">
              <span><StretchDemo /><small className="lq-t12 lq-c3">Numerals are heroes</small></span>
              <span><b className="lq-dnum lq-warm" style={{ fontSize: 56 }}>12</b><small className="lq-t12 lq-c3">day streak</small></span>
              <span><b className="lq-dnum" style={{ fontSize: 56 }}>2h 41m</b><small className="lq-t12 lq-c3">this week</small></span>
            </div>
          </Tile>
        </Sec>

        <Sec title="Surfaces & depth" note="Radius 12 · 16 · 20 · 26 · 28. Shadows are soft and short; hairlines do most of the work. Glass only for small overlays.">
          <div className="g-depth">
            <div className="lq-sunk g-dp"><b>Sunk</b><span>Inputs, stat wells, tracks</span></div>
            <div className="lq-surface g-dp" data-depth="1"><b>Level 1 · Flat</b><span>Lists, tiles, activity</span></div>
            <div className="lq-surface g-dp"><b>Level 2 · Card</b><span>Program cards, panels</span></div>
            <div className="lq-surface g-dp" data-depth="3"><b>Level 3 · Hero</b><span>Hero banners, players, sheets</span></div>
            <Poster image={{ src: IMG.redgym, alt: "", position: "60% 40%" }} className="g-dp g-dp-photo">
              <Glass level="clear" radius={14} className="g-glass-demo">
                <b>Glass · overlays only</b>
                <span>Tab bar, player controls, photo badges</span>
              </Glass>
            </Poster>
          </div>
        </Sec>

        <Sec title="Buttons" note="Glacier solid is the one primary action. Ember resumes progress. Secondary is white with a hairline; ghost is text.">
          <Tile>
            <div className="g-row">
              <Button icon="play">Start Day 24</Button>
              <Button variant="warm" icon="play">Resume</Button>
              <Button variant="glass">Session plan</Button>
              <Button variant="tint" icon="plus">Join program</Button>
              <Button variant="ink">Apply</Button>
              <Button variant="ghost" iconAfter="arrowRight">See all</Button>
            </div>
            <div className="g-row" style={{ marginTop: 14 }}>
              <Button size="md">Medium</Button>
              <Button size="sm" variant="glass">Small</Button>
              <Button size="xs" variant="fill">Extra small</Button>
              <Button size="md" variant="plain">Plain link</Button>
              <Button size="md" disabled>Disabled</Button>
              <IconButton icon="bell" label="Notifications" />
              <IconButton icon="settings" label="Settings" variant="fill" />
              <IconButton icon="play" label="Play" variant="accent" />
            </div>
            <div className="g-onphoto">
              <Poster image={{ src: IMG.squat, alt: "", position: "50% 30%" }} className="g-onphoto-ph">
                <div className="g-row" style={{ padding: 18 }}>
                  <Button variant="white" size="md">White</Button>
                  <Button variant="onphoto" size="md">View the program</Button>
                  <IconButton icon="close" label="Close" variant="clear" />
                </div>
              </Poster>
              <SheetDemo />
              <ToastDemo />
            </div>
          </Tile>
        </Sec>

        <Sec title="Chips, tags & controls">
          <div className="g-grid2">
            <Tile title="Chips & tags">
              <div className="g-row">
                <Tag>Best next step</Tag>
                <Tag tone="warm">Continue</Tag>
                <Tag tone="gold">New badge</Tag>
                <Tag tone="light">Course</Tag>
                <Chip variant="tint" icon="dumbbell">Strength</Chip>
                <Chip variant="ok" icon="check">Done</Chip>
                <Chip variant="warm" icon="flame">12 days</Chip>
                <Chip icon="clock">34 min</Chip>
                <Chip variant="ink">All programs</Chip>
                <Chip variant="tint" dot>Live</Chip>
                <Chip score={14}>Readiness</Chip>
              </div>
            </Tile>
            <Tile title="Segmented · toggle · complete">
              <ControlsDemo />
            </Tile>
          </div>
        </Sec>

        <Sec title="Progress" note="Glacier for days and programs, ember for streaks and steps, green for done. Bars, rings and routes fill to their value on view (700ms).">
          <div className="g-grid2">
            <Tile title="Rings · bars · step dots">
              <div className="g-row" style={{ gap: 18 }}>
                <Rings size={64} stroke={7} rings={[{ value: 0.38, tone: 1 }]} label="38%"><span>38%</span></Rings>
                <Rings size={64} stroke={7} rings={[{ value: 4 / 7, tone: 2 }]} label="4 of 7"><span>4/7</span></Rings>
                <Rings size={92} stroke={9} rings={[{ value: 0.38, tone: 1 }, { value: 0.57, tone: 2 }, { value: 0.8, tone: 3 }]} label="Days, steps, sessions" />
                <OrbitLoader size={34} />
              </div>
              <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
                <div>
                  <div className="g-between lq-t12 lq-c3"><span>Level I</span><b className="lq-c2">23 / 61</b></div>
                  <ProgressBar value={23 / 61} label="Level I" style={{ marginTop: 6 }} />
                </div>
                <div>
                  <div className="g-between lq-t12 lq-c3"><span>Badge</span><b className="lq-c2">12 / 14</b></div>
                  <ProgressBar value={12 / 14} tone="warm" size="thin" label="Badge" style={{ marginTop: 6 }} />
                </div>
                <div className="g-row" style={{ gap: 12 }}>
                  <StepSegments total={7} done={4} className="g-steps" />
                  <span className="lq-t12 lq-c3">Step dots</span>
                </div>
              </div>
            </Tile>
            <Tile title="This week · streak">
              <div className="g-row" style={{ gap: 14 }}>
                <span className="g-flame"><Icon name="flame" /></span>
                <div>
                  <div className="lq-dnum" style={{ fontSize: 40, lineHeight: 0.9 }}>12 <span style={{ fontSize: 18 }}>days</span></div>
                  <div className="lq-t13 lq-c2" style={{ marginTop: 4 }}>Your longest streak yet</div>
                </div>
                <span style={{ marginLeft: "auto" }}><StreakChip days={12} /></span>
              </div>
              <div style={{ marginTop: 18 }}>
                <WeekDots days={[{ label: "M", state: "done" }, { label: "T", state: "done" }, { label: "W", state: "done" }, { label: "T", state: "done" }, { label: "F", state: "today", date: 24 }, { label: "S", state: "ahead" }, { label: "S", state: "ahead" }]} />
              </div>
              <div style={{ marginTop: 18 }}>
                <WeekTrace days={WEEK} />
              </div>
            </Tile>
          </div>
          <Tile title="Day progress through a program (SwingRibbon)">
            <SwingRibbon total={61} done={23} phases={PHASES} />
          </Tile>
        </Sec>

        <Sec id="climb" title="The Climb" note="The signature progress map: a level drawn as a route up Mount Shasta, phases as camps, the member marked on it. Art layers are swappable (CLIMB_LAYERS / art prop).">
          <Glass radius="card" className="g-climb">
            <div className="g-between" style={{ alignItems: "flex-start", padding: "0 26px" }}>
              <div>
                <div className="lq-eyebrow" data-tone="accent">Your climb · Kettlebell Lifestyle Level I</div>
                <h3 className="lq-d-md" style={{ marginTop: 6 }}>You&apos;re 38% of the way up.</h3>
              </div>
              <div className="g-row" style={{ gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div className="lq-dnum" style={{ fontSize: 26 }}>23<span className="lq-c3" style={{ fontSize: 16 }}>/61</span></div>
                  <div className="lq-t12 lq-c3">days complete</div>
                </div>
                <Rings size={58} stroke={6} rings={[{ value: 0.38, tone: 1 }]} label="38%"><span>38%</span></Rings>
              </div>
            </div>
            <Climb id="g-climb" phases={PHASES} done={23} member={{ name: "Daniel Reyes" }} style={{ marginTop: 12 }} />
            <div style={{ padding: "18px 26px 0" }}>
              <BeyondTheSummit
                sub="Where members go after Level I — picked for your pace and goals."
                more={{ href: "/programs", label: "See your full path" }}
                peaks={[
                  { title: "Level II · Intermediate", sub: "Unlocks when you reach the Day 61 summit.", href: "/programs/kettlebell-lifestyle", cta: "Preview Level II", image: { src: IMG.getup, alt: "", position: "50% 25%" }, badge: { label: "Included", kind: "badge" }, locked: true },
                  { title: "Mastering the Kettlebell", sub: "Technique for every Phase 2 lift · $297", href: "/programs/mastering-the-kettlebell", cta: "See what's inside", image: { src: IMG.deadlift, alt: "", position: "50% 30%" }, badge: { label: "Best next step" } },
                  { title: "The Breakthrough retreat", sub: "Train with Mike on Mount Shasta · May 13–16", href: "/experiences", cta: "Apply", image: { src: IMG.summit, alt: "", position: "50% 40%" }, badge: { label: "Applications open", kind: "badge" } },
                ]}
              />
            </div>
          </Glass>
          <div className="g-grid2">
            <Tile title="Phone (no labels)">
              <Climb id="g-climb-ph" phases={PHASES} done={23} labels={false} height={250} member={{ name: "Daniel Reyes" }} />
            </Tile>
            <Tile title="Summit reached · celebrate">
              <div style={{ position: "relative" }}>
                <Climb id="g-climb-done" phases={PHASES} done={61} member={{ name: "Daniel Reyes" }} labels={false} />
                <Replay>
                  <span style={{ position: "relative", display: "block", height: 110 }}>
                    <Flare size={110} style={{ left: "50%", top: "50%" }} />
                  </span>
                </Replay>
              </div>
            </Tile>
          </div>
        </Sec>

        <Sec title="Photography" note="Full colour, never graded. One ink scrim for legible type. A focal point keeps Mike's face in frame at every width; contain when a crop would cut it.">
          <PhotoHero
            image={{ src: IMG.mtk, alt: "Mike Salemi in the gym", focal: "78% 30%", focalPhone: "62% 20%" }}
            minHeight={400}
            overlay={
              <Glass level="clear" radius={20} className="g-quote">
                <Avatar name="Mike Salemi" src="/media/summit/mike-face.png" size="lg" />
                <p className="lq-t13">“Recovery is where yesterday&apos;s work turns into strength. Breathe slow, move easy — and show up.”<small>MIKE · NOTE FOR DAY 24</small></p>
              </Glass>
            }
          >
            <div className="g-row" style={{ gap: 8 }}>
              <Tag tone="warm" size="lg">Continue training</Tag>
              <Chip variant="clear">Day 24 of 61</Chip>
            </div>
            <h2 className="lq-d-xxl" style={{ marginTop: 18 }}>Recovery Day</h2>
            <p className="lq-t15" style={{ color: "rgba(255,255,255,.75)", marginTop: 10 }}>Kettlebell Lifestyle · Level I · Phase 2 · 5 steps · 34 min</p>
            <StepSegments total={5} done={0} current={0} onPhoto className="g-hero-steps" />
            <div className="g-row" style={{ marginTop: 22 }}>
              <Button icon="play">Start Day 24</Button>
              <Button variant="onphoto">View the program</Button>
            </div>
          </PhotoHero>
          <div className="g-cards">
            <Card image={{ src: IMG.summit, alt: "Men of Movement on Mount Shasta", position: "50% 40%" }} height={300} footer={<><div className="lq-eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>Retreat · May 13–16</div><div className="lq-d-sm" style={{ marginTop: 6 }}>The Breakthrough</div></>} />
            <Poster image={{ src: IMG.press, alt: "Mike pressing a kettlebell", position: "50% 25%" }} aspect="4/5" glyph={<IconButton icon="play" label="Play" variant="clear" size="lg" />}>
              <Chip variant="clear" size="sm" style={{ position: "absolute", left: 12, top: 12 }}>8:12</Chip>
            </Poster>
            <NextStepCard
              tag={{ label: "Best next step" }}
              title="Mastering the Kettlebell"
              meta="Technique for every Phase 2 lift — the 6-min row fix is in Module 3. $297."
              href="/programs/mastering-the-kettlebell"
              cta="See what's inside"
              image={{ src: IMG.deadlift, alt: "", position: "50% 30%" }}
              layout="stack"
            />
          </div>
          <NextStepCard eyebrow="Up next · Level I" title="Day 25 · Workout III Day" meta="Phase 2 · 7 steps · 45 min" href="/today" cta="Resume" tone="ember" progress={0.38} image={{ src: IMG.mtk, alt: "", position: "62% 30%" }} />
        </Sec>

        <Sec title="Lists & tables">
          <div className="g-grid2">
            <Tile title="Workout table">
              <WorkoutTable>
                <ExerciseRow name="Two-hand swing" load="moderate" loadLabel="16 kg" reps={15} repsNote="40s" sets={2} tempo="Fast" />
                <ExerciseRow name="Goblet squat" load="heavy" loadLabel="20 kg" reps={8} sets={2} tempo="3-1-1" />
                <RestRow>Rest 60s</RestRow>
                <RestRow end>Superset complete · 2 rounds</RestRow>
              </WorkoutTable>
            </Tile>
            <Tile title="Stats · avatar · loading · empty">
              <div className="g-row" style={{ gap: 28 }}>
                <StatTile value={23} unit="/61" label="days complete" swatch={1} />
                <StatTile value={12} label="day streak" swatch={2} />
                <Avatar name="Daniel Reyes" />
                <Avatar name="Mike Salemi" src="/media/summit/mike-face.png" />
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
                <Skeleton shape="card" height={70} />
                <SkeletonText lines={2} />
              </div>
              <EmptyState title="No saved videos yet" body="Tap the bookmark on any video to keep it here." icon="bookmark" action={<Button size="md" href="/library">Browse the library</Button>} />
            </Tile>
          </div>
        </Sec>

        <Sec title="Iconography" note="Lucide, 1.85 stroke, rounded caps — the same family as the original app — plus the kettlebell mark.">
          <Tile>
            <div className="g-icons">
              {ICON_NAMES.map((n) => (
                <span key={n} title={n}>
                  <Icon name={n} />
                  <small>{n}</small>
                </span>
              ))}
            </div>
          </Tile>
        </Sec>

        <Sec title="Motion" note="Static for screenshots, live in the browser; everything is off under reduced motion.">
          <div className="g-motion">
            {[
              ["Rise", "600 ms · ease-out (.2,.8,.2,1)", "Content enters 10px up with a fade, staggered 40 ms."],
              ["Fill", "700 ms · ease-out", "Bars, rings and the climb route draw to their value on view."],
              ["Press", "80 ms in · spring back", "Every button, tab and card squeezes to 97% the moment it is touched."],
              ["Celebrate", "1.2 s · spring (.34,1.56,.64,1)", "Confetti, an ember burst, the streak flame grows."],
              ["Breathe", "4 s loop · ease-in-out", "The “you are here” pulse and Recovery Day scenes breathe slowly."],
              ["Page", "220 ms view transition", "The old page fades out fast, the new one rises 6px in; the shell stays put."],
            ].map(([t, m, d]) => (
              <div key={t} className="lq-surface g-mo" data-depth="1">
                <div className="g-between"><b className="lq-d-xs">{t}</b><Chip size="sm">{m}</Chip></div>
                <p className="lq-t13 lq-c2" style={{ marginTop: 6 }}>{d}</p>
              </div>
            ))}
          </div>
        </Sec>
      </main>
    </ToastProvider>
  );
}
