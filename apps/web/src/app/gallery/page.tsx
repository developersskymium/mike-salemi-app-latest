import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { palette, type } from "@ms/tokens";
import {
  Avatar, Button, Card, Chip, EmptyState, ExerciseRow, Glass, Icon, ICON_NAMES, IconButton, Poster, ProgressBar, RestRow, Rings,
  Skeleton, SkeletonText, StatTile, StepSegments, WorkoutTable,
} from "@/components/ui";
import { ToastProvider } from "@/components/ui/Toast";
import { FxLayer } from "@/components/ui/FxLayer";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import {
  Flare, LightPill, MovementTrace, MOVEMENTS, MOVEMENT_LABEL, OrbitLoader, PhotoGrade, SnowContours, StarTrails, StretchNumber, SwingRibbon,
  TraceDash, TraceLine, TraceRule, WeekTrace,
} from "@/components/signature";
import { BELL_PATHS, IMG } from "./_parts/images";
import { ControlsDemo, Replay, SheetDemo, StretchDemo, ToastDemo } from "./_parts/Interactive";
import { Lazy } from "./_parts/Lazy";
import { WEEK } from "./_parts/Week";

export const metadata: Metadata = { title: "Trace design system", robots: { index: false, follow: false } };

const PHASES = [
  { label: "On Ramp", from: 1, to: 7 },
  { label: "Phase 1", from: 8, to: 20 },
  { label: "Phase 2", from: 21, to: 40 },
  { label: "Phase 3", from: 41, to: 61 },
];

const MOVE_NOTE: Record<string, string> = {
  swing: "Pendulum arc", press: "Straight up", halo: "Loop round the head", getup: "Rising S",
  clean: "Hook to the rack", squat: "Down and up", deadlift: "Floor to hip", rest: "A rest wave",
};

function Sec({ title, note, children, id, lazy = 0 }: { title: string; note: string; children: ReactNode; id?: string; lazy?: number }) {
  return (
    <section className="g-sec" id={id}>
      <h2 className="g-sec-h">
        {title}
        <small>{note}</small>
      </h2>
      <div className="g-sec-b">{lazy ? <Lazy minHeight={lazy}>{children}</Lazy> : children}</div>
    </section>
  );
}

function Tile({ title, note, children, className, leak }: { title?: string; note?: string; children: ReactNode; className?: string; leak?: boolean }) {
  return (
    <Glass as="div" radius="card" leak={leak} interactive className={className ? `g-tile ${className}` : "g-tile"}>
      {title && <h3 className="lq-t17">{title}</h3>}
      {note && <p className="lq-t13 lq-c2" style={{ marginTop: 4 }}>{note}</p>}
      <div style={{ marginTop: title || note ? 16 : 0 }}>{children}</div>
    </Glass>
  );
}

function Hero() {
  return (
    <div className="g-hero lq-night">
      <StarTrails mountain count={110} />
      <TraceLine
        className="g-hero-trace"
        d="M640 120 C700 380 820 470 960 470 C1100 470 1210 380 1250 150"
        viewBox="0 0 1312 560"
        width={4.5}
        ahead={false}
        segments={50}
        floor={0.02}
        fullTail
        nodes={[0.12, 0.32, 0.5, 0.68, 0.88]}
        nodeR={5}
        animate
        duration={2200}
        delay={300}
        preserveAspectRatio="xMaxYMid slice"
      />
      <div className="g-hero-copy">
        <p className="lq-t13" style={{ color: "#A3B2C0", fontWeight: 600 }}>Mike Salemi · design system</p>
        <div className="g-hero-name">Trace</div>
        <p className="g-hero-lede">
          <b>Every rep leaves a mark.</b> Leave a shutter open while Mike swings and the bell paints an arc of light. Your training is drawn as
          glacier light with a hot head and a fading tail. Dark is a night exposure under Mount Shasta; light is the same mountain in daylight,
          drawn as glacier contour lines on snow.
        </p>
        <div className="g-hero-cta" data-rise="" style={{ ["--i" as string]: 2 }}>
          <LightPill icon="play" href="#motion">See it move</LightPill>
          <Button variant="white" href="/gallery/shell">Open the shell</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ theme }: { theme?: "light" | "dark" }) {
  const dark = theme === "dark";
  return (
    <div data-theme={theme} className="g-theme">
      <div className="g-wrap">
        <header className="g-head">
          <div>
            <p className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Trace · {theme ? (dark ? "Night exposure" : "Snow exposure") : "Night and snow exposures"}</p>
            <h1 className="lq-t34">{theme ? (dark ? "Dark" : "Light") : "Design system"}</h1>
          </div>
          <div style={{ width: 300 }}>
            <ThemeSwitch persist={false} size="sm" />
          </div>
        </header>

        <Hero />

        <Sec title="Colour" note="Glacier is the light source. Everything else is night or snow, so the light has somewhere to glow.">
          <div className="g-swatches">
            <div className="g-sw g-sw-glacier"><b>Glacier light</b>{palette.glacier} · head {palette.glacierHot}</div>
            <div className="g-sw" style={{ background: palette.glacierInk, color: "#fff" }}><b>Glacier ink</b>{palette.glacierInk} · on snow</div>
            <div className="g-sw lq-night"><b>Night</b>{palette.night} · dark ground</div>
            <div className="g-sw" style={{ background: palette.nightFilm, color: "#EEF4F8", boxShadow: "inset 0 0 0 1px rgba(150,200,235,.12)" }}><b>Film</b>{palette.nightFilm} · dark surfaces</div>
            <div className="g-sw" style={{ background: palette.snow, color: "#0B1A28", boxShadow: "inset 0 0 0 1px rgba(20,90,140,.14)" }}><b>Snow</b>{palette.snow} · light ground</div>
            <div className="g-sw" style={{ background: palette.snowFilm, color: "#0B1A28", boxShadow: "inset 0 0 0 1px rgba(20,90,140,.12)" }}><b>Snow film</b>{palette.snowFilm} · light surfaces</div>
          </div>
          <div className="g-roles">
            {(["ground", "film", "film-2", "ink", "ink-2", "ink-3", "trace", "trace-hot", "accent", "accent-ink"] as const).map((k) => (
              <div key={k}><i style={{ background: `var(--${k})` }} /><span className="lq-t12">--{k}</span></div>
            ))}
          </div>
          <p className="g-note">Light only comes from traces, the primary pill and real light in photos (fire, dawn). The night is blue-black because a long exposure of the sky is blue-black. No pink, no decorative gradients. Shadows are glow from a light source, never grey drop shadows.</p>
        </Sec>

        <Sec title="Type" note="Anybody, a variable face with a width axis from 50 to 150. Width is motion: type stretches while it moves and settles wide. Hanken Grotesk for text.">
          <div className="g-type">
            <Glass radius="card" className="g-spec">
              <div className="g-who"><b>Anybody</b><span>Display · width 50–150 · weight 200–700</span></div>
              <div className="g-widths">
                <div style={{ fontStretch: "60%" }}>Swing <small>width 60</small></div>
                <div style={{ fontStretch: "100%" }}>Swing <small>width 100</small></div>
                <div style={{ fontStretch: "150%" }}>Swing <small>width 150</small></div>
              </div>
              <div className="lq-thin-num g-thin">24 · 61</div>
            </Glass>
            <Glass radius="card" className="g-spec">
              <div className="g-who"><b>Hanken Grotesk</b><span>Text · 400–700</span></div>
              <div style={{ font: "500 22px/1.4 var(--font)" }}>Keep every swing crisp: hike, snap, float.</div>
              <p className="lq-t15 lq-c2" style={{ marginTop: 12 }}>A quiet, warm grotesk for instructions, tables and notes. It stays out of the way of the wide display and the light.</p>
              <div className="g-scale">
                {(["display", "t34", "t28", "t22", "t17", "t15", "t13", "t11"] as const).map((k) => (
                  <div key={k}>
                    <span className={k === "display" ? "lq-display" : `lq-${k}`} style={k === "display" ? { fontSize: 30, lineHeight: "32px" } : undefined}>Day 24</span>
                    <span className="lq-t11 lq-c3 lq-num">{k} · {type[k].size}/{type[k].line} · {type[k].weight}{"stretch" in type[k] ? ` · w${type[k].stretch}` : ""}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </div>
        </Sec>

        <Sec title="Surfaces" lazy={220} note="Matte film, not blurred glass. Edges catch light where a trace has passed (move the cursor over any plate).">
          <div className="g-mats">
            <div className="g-mat lq-night">
              <TraceLine d="M20 40 C40 150 160 150 180 40" viewBox="0 0 200 200" width={3} progress={0.8} animate className="g-fill" preserveAspectRatio="xMidYMid meet" />
              <div className="g-cap"><b>Night exposure</b>Heroes, video, completion</div>
            </div>
            <Glass radius="card" leak interactive className="g-mat"><div className="g-cap"><b>Film with light leak</b>Cards and panels</div></Glass>
            <div className="g-mat" data-theme="light" style={{ background: "var(--ground)", color: "var(--ink)", boxShadow: "inset 0 0 0 1px var(--edge)" }}>
              <SnowContours live={false} />
              <div className="g-cap"><b>Snow contours</b>Light ground, living</div>
            </div>
            <Glass radius="card" interactive className="g-mat g-center"><LightPill>Continue</LightPill><div className="g-cap"><b>Light pill</b>The one primary action</div></Glass>
            <Glass radius="card" interactive className="g-mat g-center"><span className="lq-thin-num" style={{ fontSize: 96 }}>25</span><div className="g-cap"><b>Thin wide numerals</b>Days, counts, time</div></Glass>
          </div>
        </Sec>

        <Sec title="Signature: the Trace" lazy={340} note="One drawing rule for progress, loaders, dividers, heroes and icons. Each movement has its own shape.">
          <div className="g-anat">
            <div className="g-anat-a lq-night">
              <TraceLine d="M40 70 C80 250 300 280 420 200 C480 160 500 120 520 80" viewBox="0 0 640 300" width={5} progress={0.78} segments={40} nodes={[0, 0.5, 1]} nodeR={6} animate>
                {([[60, 250, "Tail: cools to 8% opacity"], [330, 268, "Glow: 3× width, blurred"], [512, 150, "Head: white-hot"], [520, 60, "Ahead: dotted"], [430, 230, "Node: a step"]] as const).map(([x, y, t]) => (
                  <text key={t} x={x} y={y} fill="#A3B2C0" fontSize={13} fontFamily="var(--font)">{t}</text>
                ))}
              </TraceLine>
            </div>
            <div className="g-glyphs">
              {MOVEMENTS.map((m, i) => (
                <Glass key={m} radius="inner" className="g-gl">
                  <MovementTrace move={m} size={64} animate delay={200 + i * 90} label="" />
                  <b>{MOVEMENT_LABEL[m]}</b>
                  <span>{MOVE_NOTE[m]}</span>
                </Glass>
              ))}
            </div>
          </div>
        </Sec>

        <Sec title="The program, as light" lazy={360} note="SwingRibbon: one swing per day, deeper each phase. Done days are lit, today is the head, the days ahead are dotted. WeekTrace draws each day as its movement.">
          <div className="g-stack">
            <Glass radius="hero" className="g-ribbon" leak>
              <div className="g-ribbon-row"><span className="lq-t13 lq-c3"><b style={{ color: "var(--label)" }}>23 of 61</b> days complete · each day is one swing, deeper each phase</span><b className="lq-dnum">38%</b></div>
              <SwingRibbon total={61} done={23} phases={PHASES} />
            </Glass>
            <div className="g-two">
              <Glass radius="card" style={{ padding: "16px 10px 12px" }}>
                <div className="g-row-h"><h3 className="lq-t17">This week</h3><span className="lq-t13" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Week 4 of 9</span></div>
                <WeekTrace days={WEEK} />
              </Glass>
              <Glass radius="card" style={{ padding: 18 }}>
                <div className="g-row-h"><h3 className="lq-t17">On a card</h3><span className="lq-t13 lq-c3">compact</span></div>
                <div className="lq-t15" style={{ fontWeight: 600 }}>Kettlebell Lifestyle · Level I</div>
                <div style={{ marginTop: 10 }}><SwingRibbon total={61} done={23} phases={PHASES} size="compact" /></div>
              </Glass>
            </div>
          </div>
        </Sec>

        <Sec title="Iconography" lazy={560} note="1.6 stroke, open shapes ending in a light point. The point is the only coloured part; active tabs light the stroke too.">
          <div className="g-icons">
            {ICON_NAMES.map((n) => (
              <div key={n} className={n === "today" ? "g-ic g-ic-on" : "g-ic"}>
                <Icon name={n} />
                <span className="lq-t11 lq-c3" style={{ fontWeight: 500 }}>{n}</span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="Photography" lazy={290} note="Exposure grade: monochrome under night blue, highlights lifted, with a trace along the real path of the bell. Fire stays warm. Daylight grade for light screens.">
          <div className="g-photo">
            <figure className="g-fig"><Image src={IMG.press} alt="Mike pressing a kettlebell overhead" fill sizes="(min-width: 1024px) 320px, 50vw" /><figcaption><b>Original</b>As shot</figcaption></figure>
            <PhotoGrade as="figure" className="g-fig" grade="night" trace={{ ...BELL_PATHS.press, width: 6 }}>
              <Image src={IMG.press} alt="The same press, graded, the bell's path drawn as light" fill sizes="(min-width: 1024px) 320px, 50vw" />
              <figcaption><b>Exposure grade + trace</b>The press, drawn as light</figcaption>
            </PhotoGrade>
            <PhotoGrade as="figure" className="g-fig" grade="warm">
              <Image src={IMG.fire} alt="Men around a fire at a retreat" fill sizes="(min-width: 1024px) 320px, 50vw" style={{ objectPosition: "50% 60%" }} />
              <figcaption><b>Fire stays warm</b>Retreats and brotherhood</figcaption>
            </PhotoGrade>
            <PhotoGrade as="figure" className="g-fig" grade="day">
              <Image src={IMG.summit} alt="Men of Movement on a ridge facing Mount Shasta" fill sizes="(min-width: 1024px) 320px, 50vw" />
              <figcaption><b>Daylight grade</b>High key, cool</figcaption>
            </PhotoGrade>
          </div>
        </Sec>

        <Sec id="motion" title="Motion" lazy={260} note="Light is exposed, never faded. Every animation is a path being drawn, a shutter closing, or type stretching with speed. Tap ↻ to replay.">
          <div className="g-motion">
            <Glass radius="card" className="g-mt">
              <Replay><TraceLine d="M10 20 C30 110 170 110 190 20" viewBox="0 0 200 120" width={3} progress={0.7} segments={26} animate className="g-demo" /></Replay>
              <div><b>Expose</b><p>Progress draws along its path, the head leading and the tail cooling behind it.</p><code>1.4s · ease-out cubic</code></div>
            </Glass>
            <Glass radius="card" className="g-mt">
              <div className="g-demo g-center"><StretchDemo /></div>
              <div><b>Stretch</b><p>Numbers squeeze narrow while counting and spring back wide when they land.</p><code>font-stretch 150 → 55 → 150</code></div>
            </Glass>
            <Glass radius="card" className="g-mt">
              <div className="g-demo g-center"><OrbitLoader size={96} /></div>
              <div><b>Orbit</b><p>The loader is a halo: a short trace circling, the same shape as the halo move.</p><code>1.6s · linear · infinite</code></div>
            </Glass>
            <Glass radius="card" className="g-mt">
              <div className="g-demo g-center"><LightPill style={{ width: 168 }}>Complete</LightPill></div>
              <div><b>Streak</b><p>Primary pills carry a passing streak of light; presses scale to 96%.</p><code>4.5s streak · 80ms press</code></div>
            </Glass>
            <div className="g-mt lq-night">
              <Replay>
                <div className="g-demo" style={{ position: "relative" }}>
                  <TraceLine d="M10 20 C30 110 170 110 186 30" viewBox="0 0 200 120" width={3} segments={26} floor={0.02} fullTail ahead={false} animate duration={1100} />
                  <Flare size={64} delay={1000} style={{ left: "93%", top: "25%" }} />
                </div>
              </Replay>
              <div><b>Flare</b><p>Completing a day ends the swing in a starburst: the shutter closes on it.</p><code>spring 1.4 · 1.2s</code></div>
            </div>
          </div>
        </Sec>

        <Sec title="Completion" lazy={640} note="Seven steps, one exposure: the day's swing drawn across the screen, a Flare at its end, the day number stretching from 24 to 25.">
          <Replay label="Replay completion">
            <div className="g-complete lq-night">
              <StarTrails mountain count={100} seed={5} live={false} />
              <TraceLine
                className="g-complete-swing"
                d="M-20 170 C10 340 90 440 195 440 C300 440 372 340 368 176"
                viewBox="0 0 390 640"
                width={4}
                nodes={[0.07, 0.2, 0.34, 0.5, 0.66, 0.8, 0.93]}
                nodeR={4.5}
                animate
                duration={1700}
                delay={200}
                segments={50}
                floor={0.02}
                fullTail
                ahead={false}
              />
              <Flare size={120} delay={1750} style={{ left: `${(368 / 390) * 100}%`, top: `${(176 / 640) * 100}%` }} />
              <div className="g-complete-day">
                <div className="lq-t13" style={{ color: "#A3B2C0" }}>Day</div>
                <StretchNumber value={25} from={24} delay={1900} duration={500} size={128} />
              </div>
              <div className="g-complete-words" data-rise="" style={{ ["--i" as string]: 20 }}>
                <div className="lq-t28">Day 25, complete</div>
                <p className="lq-t15" style={{ color: "#A3B2C0", marginTop: 8 }}>Seven steps, one exposure. Phase 2 is a quarter done.</p>
              </div>
            </div>
          </Replay>
        </Sec>

        <Sec title="Primitives" lazy={2400} note="Every component in @/components/ui, restyled to Trace with its API unchanged.">
          <div className="g-grid">
            <Tile title="Buttons" note="The light pill is the one primary action per screen. Ghost and fill are secondary; white sits on photos.">
              <div className="g-row">
                <Button icon="play">Resume Day 24</Button>
                <Button variant="ghost" icon="play">Watch intro</Button>
              </div>
              <div className="g-row" style={{ marginTop: 12 }}>
                <Button size="md" variant="fill">Switch level</Button>
                <Button size="sm" variant="tint" icon="play">Follow along</Button>
                <Button size="sm" variant="plain">See all</Button>
                <Button size="sm" disabled>Locked</Button>
              </div>
              <div className="g-row" style={{ marginTop: 14 }}>
                <IconButton icon="back" label="Back" />
                <IconButton icon="search" label="Search" />
                <IconButton icon="bell" label="Notifications" />
                <IconButton icon="close" label="Close" variant="fill" size="sm" iconSize="sm" />
                <ToastDemo />
                <SheetDemo />
              </div>
            </Tile>

            <Tile title="Controls" note="Segmented on a light track; toggles with a light head; Complete draws its check and flares.">
              <ControlsDemo />
            </Tile>

            <Tile title="Trace arcs" note="Rings, redrawn as light: each arc exposes from the top, staggered. Numbers count with Stretch." leak>
              <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
                <Rings size={124} stroke={12} label="23 of 61 days, 2 of 5 steps, 12 day streak" rings={[{ value: 23 / 61, tone: 1 }, { value: 2 / 5, tone: 2 }, { value: 12 / 14, tone: 3 }]} />
                <div className="lq-legend">
                  <StatTile swatch={1} value={23} unit="/61" label="program days" />
                  <StatTile swatch={2} value={2} unit="/5" label="steps today" />
                  <StatTile swatch={3} value={12} label="day streak" />
                </div>
              </div>
            </Tile>

            <Tile title="Progress" note="Straight traces and steps on one line.">
              <div style={{ display: "grid", gap: 14 }}>
                <div className="g-meter"><ProgressBar value={0.38} label="Program progress" /><b className="lq-dnum">38%</b></div>
                <div className="g-meter"><ProgressBar value={1} label="Mini-series" /><b className="lq-dnum">100%</b></div>
                <StepSegments total={7} done={2} current={4} currentProgress={0} />
                <TraceRule />
                <ul className="g-list">
                  <li><TraceDash /> One bell you can press 8 times with good form</li>
                  <li><TraceDash /> A heavier bell for swings and deadlifts</li>
                </ul>
              </div>
            </Tile>

            <Tile title="Stats" note="Display numerals in Anybody; captions in Hanken.">
              <div className="g-stats">
                <StatTile value={23} unit="/61" label="program days" size="lg" />
                <StatTile value={2} unit="/5" label="steps today" size="lg" />
                <StatTile value={12} label="day streak" size="lg" />
              </div>
              <div style={{ marginTop: 14 }}><ProgressBar value={23 / 61} label="23 of 61 days" /></div>
            </Tile>

            <Tile title="Chips and avatars">
              <div className="g-row">
                <Chip>Level I</Chip>
                <Chip variant="fill" icon="clock">34 min</Chip>
                <Chip variant="tint" dot>Live now</Chip>
                <Chip variant="outline">Phase 3 · 0%</Chip>
                <Chip variant="fill" selected>Phase 2 · 15%</Chip>
                <Chip score={14}>Chart 2</Chip>
              </div>
              <div className="g-row" style={{ marginTop: 14 }}>
                <Avatar name="Daniel Reyes" size="sm" />
                <Avatar name="Daniel Reyes" size="md" variant="solid" />
                <Avatar name="Daniel Reyes" />
                <Avatar name="Mike Salemi" src={IMG.wideStance.src} />
                <Avatar name="Daniel Reyes" size="xl" />
              </div>
            </Tile>

            <Card
              className="g-span2"
              height={300}
              grade="night"
              image={{ src: IMG.summit, alt: "Men of Movement on a ridge facing Mount Shasta", position: "50% 40%" }}
              footer={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="lq-t13" style={{ color: "#B9D8EA" }}>Retreat · Spring</div>
                    <div className="lq-t22">The Breakthrough</div>
                    <div className="lq-t13" style={{ opacity: 0.9 }}>Mount Shasta · May 13–16, 2027</div>
                  </div>
                  <Button variant="white" size="sm" href="/explore">Apply</Button>
                </div>
              }
            />

            <Tile title="Poster" note="Video poster, graded, with the bell's path and a halo play button.">
              <Poster image={{ src: IMG.redgym, alt: "Mike in a windmill at the gym", position: "60% 40%" }} aspect="16 / 10" glyph={<span className="g-play"><OrbitLoader size={112} label="" /><IconButton icon="play" label="Play main video" variant="clear" size="lg" iconSize="lg" /></span>}>
                <Chip variant="clear" style={{ position: "absolute", left: 12, top: 12, height: 28 }}>Main video</Chip>
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 12, color: "#fff" }}>
                  <ProgressBar value={0.31} tone="white" label="Video position" />
                  <div className="lq-t11 lq-num" style={{ display: "flex", justifyContent: "space-between", marginTop: 4, opacity: 0.9 }}><span>5:36</span><span>18:02</span></div>
                </div>
              </Poster>
            </Tile>

            <Glass as="section" radius="card" className="g-tile g-span2" leak>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <div><h3 className="lq-t22">Circuit 1</h3><div className="lq-t13 lq-c3">3 rounds · about 14 min</div></div>
                <Button variant="tint" size="sm" icon="play">Follow along</Button>
              </div>
              <WorkoutTable label="Circuit 1">
                <ExerciseRow name="Two Hand (Russian) Swing" load="moderate" loadLabel="Moderate" reps={15} sets={3} tempo="Explosive" />
                <RestRow>Straight into the next</RestRow>
                <ExerciseRow name="Half Kneeling Overhead Press" load="moderate" loadLabel="Moderate" reps={8} repsNote="each side" sets={3} tempo="2-1-2" />
                <RestRow>Straight into the next</RestRow>
                <ExerciseRow name="Romanian Deadlift" load="heavy" loadLabel="Heavy" reps={10} sets={3} tempo="3-1-1" />
                <RestRow end>Rest 45 sec, then repeat</RestRow>
              </WorkoutTable>
            </Glass>

            <Tile title="Loading" note="Orbit for waits; light passes over unexposed plates.">
              <div aria-busy="true" style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <OrbitLoader size={40} />
                  <div style={{ flex: 1 }}><SkeletonText lines={2} /></div>
                </div>
                <Skeleton shape="card" height={96} glass />
                <Skeleton shape="title" width="60%" />
              </div>
            </Tile>

            <Tile title="Empty state" note="One action fixes the emptiness.">
              <EmptyState
                illustration={<MovementTrace move="rest" size={120} weight={2.4} progress={0.6} animate label="" />}
                title="Nothing saved yet"
                body="Save a video or a tool result and it lands here."
                action={<Button size="md" variant="ghost" href="/library">Browse the library</Button>}
              />
            </Tile>
          </div>
        </Sec>
      </div>
    </div>
  );
}

/**
 * Hidden reference page: the whole Trace system (screenshot QA, other agents).
 * Default: one copy that follows the theme (switch it in the header). `?only=light|dark` forces one,
 * `?both=1` renders both side by side in the page.
 */
export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ only?: string; both?: string }> }) {
  const { only, both } = await searchParams;
  const forced = only === "light" || only === "dark" ? only : undefined;
  return (
    <ToastProvider>
      <FxLayer />
      <style>{GALLERY_CSS}</style>
      {both ? (
        <>
          <Section theme="light" />
          <Section theme="dark" />
        </>
      ) : (
        <Section theme={forced} />
      )}
    </ToastProvider>
  );
}

const GALLERY_CSS = `
.g-theme { position: relative; isolation: isolate; background: var(--ground); color: var(--ink); }
.g-wrap { position: relative; z-index: 1; max-width: 1312px; margin: 0 auto; padding: 40px 16px 72px; }
.g-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }

.g-hero { position: relative; height: 560px; border-radius: 34px; overflow: hidden; }
.g-hero > .tr-sky { border-radius: inherit; }
.g-hero-trace { position: absolute; inset: 0; width: 100%; height: 100%; }
@media (max-width: 700px) { .g-hero { height: 620px; } .g-hero-trace { opacity: .5; } }
.g-hero-copy { position: absolute; left: 24px; right: 24px; top: 36px; max-width: 560px; color: #EEF4F8; }
.g-hero-name { font-family: var(--font-display); font-stretch: 150%; font-weight: 200; font-size: clamp(70px, 18vw, 168px); line-height: .8; letter-spacing: -.06em; margin-top: 10px; }
.g-hero-lede { margin-top: 22px; font-size: 16px; line-height: 1.55; color: #A9BBCB; max-width: 46ch; }
.g-hero-lede b { color: #fff; font-weight: 600; }
.g-hero-cta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }

.g-sec { margin-top: 48px; display: grid; gap: 18px; }
.g-sec-h { font: 700 22px/1.05 var(--font-display); font-stretch: 135%; letter-spacing: -.03em; }
.g-sec-h small { display: block; font: 400 13.5px/1.5 var(--font); letter-spacing: 0; color: var(--ink-2); margin-top: 8px; max-width: 46ch; }
@media (min-width: 1024px) {
  .g-wrap { padding: 56px 64px 80px; }
  .g-hero-copy { left: 60px; top: 56px; }
  .g-hero-lede { font-size: 18px; }
  .g-sec { grid-template-columns: 260px minmax(0, 1fr); gap: 40px; margin-top: 56px; }
  .g-sec-h { font-size: 24px; }
  .g-sec-h small { max-width: 30ch; }
}
.g-note { margin-top: 14px; font-size: 13.5px; color: var(--ink-2); max-width: 92ch; }

.g-swatches { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 900px) { .g-swatches { grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 1fr; gap: 14px; } }
.g-sw { height: 170px; border-radius: 20px; padding: 16px; display: flex; flex-direction: column; justify-content: flex-end; font-size: 12.5px; position: relative; overflow: hidden; }
.g-sw b { font: 650 18px/1.05 var(--font-display); font-stretch: 130%; letter-spacing: -.02em; display: block; margin-bottom: 4px; }
.g-sw-glacier { background: radial-gradient(circle at 70% 30%, #E6F8FF 0, #5CC8F5 30%, #1478BC 80%); color: #04182A; box-shadow: 0 18px 40px -20px rgba(92,200,245,.8); }
.g-roles { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 16px; }
.g-roles > div { display: flex; align-items: center; gap: 8px; color: var(--ink-2); }
.g-roles i { width: 18px; height: 18px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--edge); }

.g-type { display: grid; gap: 16px; }
@media (min-width: 1024px) { .g-type { grid-template-columns: 1.4fr 1fr; } }
.g-spec { padding: 26px 28px; overflow: hidden; }
.g-who { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--ink-3); margin-bottom: 18px; }
.g-who b { color: var(--ink); font-weight: 600; }
.g-widths { display: grid; gap: 2px; }
.g-widths div { font: 600 46px/1 var(--font-display); letter-spacing: -.03em; white-space: nowrap; display: flex; align-items: baseline; gap: 16px; }
.g-widths small { font: 400 12px/1 var(--font); color: var(--ink-3); letter-spacing: 0; }
.g-thin { font-size: clamp(56px, 6.2vw, 96px); margin-top: 18px; white-space: nowrap; }
.g-scale { display: grid; gap: 6px; margin-top: 18px; }
.g-scale > div > span:first-child { white-space: nowrap; }
.g-scale > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; border-bottom: 1px solid var(--rule); padding-bottom: 6px; }

.g-mats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 900px) { .g-mats { grid-template-columns: repeat(5, 1fr); gap: 14px; } }
.g-mat { height: 210px; border-radius: 22px; position: relative; overflow: hidden; }
.g-center { display: grid; place-items: center; }
.g-fill { position: absolute; inset: 0; width: 100%; height: 100%; }
.g-cap { position: absolute; left: 16px; bottom: 14px; right: 16px; font-size: 12.5px; color: var(--ink-2); z-index: 5; }
.g-cap b { display: block; color: var(--ink); font-weight: 600; font-size: 14px; }

.g-anat { display: grid; gap: 14px; }
@media (min-width: 1024px) { .g-anat { grid-template-columns: 1.3fr 1fr; } }
.g-anat-a { border-radius: 22px; padding: 22px; display: grid; align-items: center; }
.g-anat-a .tr-svg { width: 100%; height: auto; }
.g-glyphs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.g-gl { padding: 12px 8px 12px; display: grid; justify-items: center; gap: 4px; font-size: 12px; color: var(--ink-2); text-align: center; }
.g-gl b { color: var(--ink); font-weight: 600; font-size: 13px; }

.g-stack { display: grid; gap: 14px; }
.g-two { display: grid; gap: 14px; }
@media (min-width: 900px) { .g-two { grid-template-columns: 1.2fr 1fr; } }
.g-ribbon { padding: 24px 22px 18px; }
@media (min-width: 1024px) { .g-ribbon { padding: 30px 40px 22px; } }
.g-ribbon-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
.g-row-h { display: flex; justify-content: space-between; align-items: baseline; padding: 0 6px 12px; }

.g-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; }
.g-ic { aspect-ratio: 1; border-radius: 18px; display: grid; place-items: center; align-content: center; gap: 8px; background: var(--film); box-shadow: inset 0 0 0 1px var(--edge); }
.g-ic-on { --icon-lit: var(--trace); }

.g-photo { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 1024px) { .g-photo { grid-template-columns: repeat(4, 1fr); gap: 14px; } }
.g-fig { margin: 0; border-radius: 22px; overflow: hidden; height: 280px; position: relative; }
.g-fig img { object-fit: cover; }
.g-fig figcaption { position: absolute; left: 16px; bottom: 12px; color: #fff; font-size: 12.5px; z-index: 6; }
.g-fig figcaption b { display: block; font-size: 14px; }

.g-motion { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 1100px) { .g-motion { grid-template-columns: repeat(5, 1fr); gap: 14px; } }
.g-mt { border-radius: 22px; padding: 18px; min-height: 250px; display: grid; grid-template-rows: 120px auto; gap: 14px; }
.g-mt b { font: 650 18px/1.1 var(--font-display); font-stretch: 130%; letter-spacing: -.02em; display: block; }
.g-mt p { font-size: 13px; color: var(--ink-2); margin-top: 4px; }
.g-mt code { font-family: var(--font); font-size: 11.5px; color: var(--ink-3); display: block; margin-top: 8px; }
.g-demo { width: 100%; height: 120px; }
.g-replay { position: relative; height: 100%; }
.g-replay-stage { height: 100%; }
.g-replay-btn { position: absolute; right: -6px; top: -6px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--ink-3); background: none; border: 0; cursor: pointer; z-index: 8; }
.g-replay-btn:hover { color: var(--trace); }
.g-stretch { background: none; border: 0; color: inherit; cursor: pointer; }

.g-complete { position: relative; height: 640px; max-width: 390px; margin: 0 auto 0 0; border-radius: 34px; overflow: hidden; }
.g-replay:has(> .g-replay-stage > .g-complete) { max-width: 390px; }
.g-complete-swing { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; }
.g-complete-day { position: absolute; z-index: 3; left: 0; right: 0; top: 60px; text-align: center; color: #EEF4F8; }
.g-complete-day .tr-num { text-shadow: 0 0 50px rgba(92, 200, 245, .35); margin-top: 4px; }
.g-complete-words { position: absolute; z-index: 3; left: 20px; right: 20px; top: 488px; text-align: center; color: #EEF4F8; }
.g-complete .tr-flare { z-index: 3; }

.g-grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .g-grid { grid-template-columns: 1fr 1fr; } .g-span2 { grid-column: 1 / -1; } }
.g-tile { padding: 20px; }
.g-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.g-meter { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.g-meter b { font-size: 13px; }
.g-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: 14px; color: var(--ink-2); }
.g-list li { display: flex; gap: 10px; align-items: center; }
.g-stats { display: grid; grid-template-columns: repeat(3, 1fr); }
.g-play { position: relative; display: grid; place-items: center; }
.g-play > .tr-orbit { position: absolute; }
`;
