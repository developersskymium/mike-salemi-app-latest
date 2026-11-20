import type { Metadata } from "next";
import Image from "next/image";
import { AppShell } from "@/components/shell/AppShell";
import { SidebarGroup } from "@/components/shell/Sidebar";
import { UserButton } from "@/components/shell/ShellUser";
import { Button, Glass, ProgressBar, StatTile } from "@/components/ui";
import { LightPill, PhotoGrade, SnowContours, StarTrails, StretchNumber, SwingRibbon, TraceLine, WeekTrace } from "@/components/signature";
import { BELL_PATHS, IMG } from "../_parts/images";
import { WEEK } from "../_parts/Week";

export const metadata: Metadata = { title: "Shell", robots: { index: false, follow: false } };

const PHASES = [
  { label: "On Ramp", from: 1, to: 7 },
  { label: "Phase 1", from: 8, to: 20 },
  { label: "Phase 2", from: 21, to: 40 },
  { label: "Phase 3", from: 41, to: 61 },
];

const MTN = "M0 410 C40 404 80 396 110 388 C130 382 142 372 152 366 C158 362 164 362 170 364 C178 354 190 336 202 322 C210 312 216 308 222 310 C230 314 244 332 260 350 C280 372 310 388 350 396 C370 400 384 402 390 404";

/** The training resume card for the rail (legacy L0 slot). */
function Resume() {
  return (
    <Glass radius="inner" leak interactive className="sg-resume">
      <div className="lq-t12 lq-c3">Continue training</div>
      <div className="lq-t15" style={{ fontWeight: 600, marginTop: 2 }}>Kettlebell Lifestyle I</div>
      <div className="lq-t12 lq-c2" style={{ fontWeight: 500 }}>Phase 2 · Day 24</div>
      <div style={{ marginTop: 10 }}><ProgressBar value={23 / 61} label="23 of 61 days" /></div>
    </Glass>
  );
}

/** The app shell with mock data and a Today composition (legacy Home order), for screenshot QA (no auth). */
export default function ShellGallery() {
  return (
    <AppShell
      user={{ name: "Daniel Reyes", subtitle: "Level I · Immersion" }}
      activeTab={0}
      sidebarResume={<Resume />}
      sidebarExtra={
        <SidebarGroup
          title="Unlocked"
          items={[
            { href: "/programs", label: "Mastering the Kettlebell", icon: "programs", meta: "Technique course" },
            { href: "/experiences", label: "The Breakthrough", icon: "mountain", meta: "May 13–16, 2027" },
          ]}
        />
      }
    >
      <div className="sg">
        {/* (1) Hero: continue training, drawn as today's swing */}
        <section className="sg-expo" data-rise="" style={{ ["--i" as string]: 0 }}>
          <div className="sg-sky sg-sky-dark"><StarTrails count={170} /></div>
          <div className="sg-sky sg-sky-light"><SnowContours count={24} /></div>
          <svg className="sg-mtn" viewBox="0 0 390 468" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <path d={`${MTN} L390 468 L0 468Z`} className="sg-mtn-fill" transform="translate(0,36)" />
            <path d={MTN} className="sg-mtn-line" transform="translate(0,36)" />
          </svg>
          <div className="sg-top">
            <div>
              <div className="lq-t13 lq-c2">Friday 20 November</div>
              <div className="sg-hello">Morning, Daniel</div>
            </div>
            <span className="sg-phone"><UserButton /></span>
          </div>
          <TraceLine
            className="sg-gauge"
            d="M34 70 A190 190 0 0 0 356 70"
            viewBox="0 0 390 330"
            width={3.4}
            progress={0.25}
            nodes={[0, 0.25, 0.5, 0.75, 1]}
            nodeR={5}
            animate
            duration={1800}
            delay={400}
            floor={0.04}
            label="2 of 5 steps today"
          />
          <div className="sg-daynum">
            <div className="lq-t13 lq-c2">Day</div>
            <StretchNumber value={24} duration={1300} size={132} className="sg-n" />
          </div>
          <div className="sg-caps"><span>Morning Routine</span><span><b>2 of 5</b> steps today</span><span>Completion</span></div>
        </section>

        <section className="sg-action" data-rise="" style={{ ["--i" as string]: 1 }}>
          <div className="lq-t13 lq-c2">Continue training</div>
          <div className="sg-kind">Recovery</div>
          <div className="lq-t13 lq-c2" style={{ marginTop: 8 }}>Kettlebell Lifestyle Level I · 5 steps · 34 min</div>
          <LightPill block href="/programs" style={{ marginTop: 18 }}>Resume step 3</LightPill>
          <div className="lq-t12 lq-c3" style={{ marginTop: 10, fontWeight: 500 }}>Up next: Bodyweight Warm Up, 10 min</div>
        </section>

        {/* v2 extras inside the legacy order: stats + this week */}
        <div className="sg-row2" data-rise="" style={{ ["--i" as string]: 2 }}>
          <Glass as="section" radius="card" leak className="sg-stats">
            <div className="sg-stats-r">
              <StatTile value={23} unit="/61" label="program days" />
              <StatTile value={2} unit="/5" label="steps today" />
              <StatTile value={12} label="day streak" />
            </div>
            <div style={{ marginTop: 14 }}><SwingRibbon total={61} done={23} phases={PHASES} size="compact" labels={false} /></div>
          </Glass>
          <section>
            <div className="sg-h"><h2 className="lq-t17">This week</h2><a className="sg-link" href="/plan">Week 4 of 9</a></div>
            <Glass radius="card" style={{ padding: "10px 6px" }}><WeekTrace days={WEEK} /></Glass>
          </section>
        </div>

        {/* (3) Your programs */}
        <section data-rise="" style={{ ["--i" as string]: 3 }}>
          <div className="sg-h"><h2 className="lq-t17">Your programs</h2><a className="sg-link" href="/programs">See all</a></div>
          <div className="sg-rail">
            <Glass radius="card" interactive className="sg-pcard">
              <PhotoGrade className="sg-art" grade="night" vignette={false}>
                <Image src={IMG.squat} alt="" fill sizes="280px" style={{ objectPosition: "50% 25%", objectFit: "cover" }} />
              </PhotoGrade>
              <div className="sg-pin">
                <div className="sg-nm">Kettlebell Lifestyle · Level I</div>
                <div className="sg-meter"><ProgressBar value={0.38} label="38%" /><b className="lq-dnum">38%</b></div>
                <div className="lq-t12 lq-c3">23 of 61 days</div>
                <div className="lq-t13 lq-c2">Up next · Day 24, Recovery</div>
                <a className="sg-link" href="/programs">Resume</a>
              </div>
            </Glass>
            <Glass radius="card" interactive className="sg-pcard">
              <PhotoGrade className="sg-art" grade="night" vignette={false}>
                <Image src={IMG.redgym} alt="" fill sizes="280px" style={{ objectPosition: "60% 35%", objectFit: "cover" }} />
                <span className="sg-badge">Completed</span>
              </PhotoGrade>
              <div className="sg-pin">
                <div className="sg-nm">Free 6-video mini-series</div>
                <div className="sg-meter"><ProgressBar value={1} label="100%" /><b className="lq-dnum">100%</b></div>
                <div className="lq-t12 lq-c3">6 of 6 videos</div>
                <div className="lq-t13 lq-c2">Watch again any time</div>
                <a className="sg-link" href="/programs">Review</a>
              </div>
            </Glass>
            <Glass radius="card" interactive className="sg-pcard">
              <PhotoGrade className="sg-art" grade="night" vignette={false} trace={{ ...BELL_PATHS.press, width: 10 }}>
                <Image src={IMG.press} alt="" fill sizes="280px" style={{ objectFit: "cover" }} />
              </PhotoGrade>
              <div className="sg-pin">
                <div className="sg-nm">Mastering the Kettlebell</div>
                <div className="lq-t13 lq-c2">Swing, clean, press and get-up, rep by rep</div>
                <Button size="sm" style={{ marginTop: 8, alignSelf: "start" }}>Join the course</Button>
              </div>
            </Glass>
          </div>
        </section>

        {/* (4) Upcoming activity */}
        <section data-rise="" style={{ ["--i" as string]: 4 }}>
          <div className="sg-h"><h2 className="lq-t17">Upcoming activity</h2></div>
          <div className="sg-upcoming">
            <Glass radius="hero" className="sg-retreat">
              <PhotoGrade className="sg-retreat-img" grade="auto">
                <Image src={IMG.summit} alt="Men of Movement on a ridge facing Mount Shasta" fill sizes="(min-width: 1024px) 600px, 100vw" style={{ objectFit: "cover", objectPosition: "50% 30%" }} />
                <div className="sg-retreat-cap">
                  <div className="lq-t13" style={{ color: "#B9D8EA" }}>Retreat · Spring</div>
                  <div className="sg-retreat-t">The Breakthrough</div>
                </div>
              </PhotoGrade>
              <div className="sg-retreat-b">
                <div className="sg-facts">
                  <div><b>Mount Shasta</b>N. California</div>
                  <div><b>May 13–16</b>2027 · 4 days</div>
                  <div><b>20 men</b>by application</div>
                </div>
                <p className="lq-t13 lq-c2">Four days in Mount Shasta. Breathwork, ceremony, fire and sweat lodge, every meal by Lauren Salemi.</p>
                <Button variant="ghost" block>Apply for May 13–16, 2027</Button>
              </div>
            </Glass>
            <div className="sg-tiles">
              <Glass radius="inner" className="sg-tile"><span className="sg-tag">Live call · Preview</span><b>Monthly Q&amp;A with Mike</b><span className="lq-t12 lq-c3">Date to be announced</span></Glass>
              <Glass radius="inner" className="sg-tile"><span className="sg-tag">Invitation · Preview</span><b>Community workout drop</b><span className="lq-t12 lq-c3">Date to be announced</span></Glass>
            </div>
          </div>
        </section>
      </div>
      <style>{CSS}</style>
    </AppShell>
  );
}

const CSS = `
.sg { display: grid; gap: 30px; }
.sg > *, .sg-row2 > * { min-width: 0; }
.sg-expo { position: relative; height: 468px; margin: 0 -16px; overflow: hidden; }
.sg-sky { position: absolute; inset: 0; -webkit-mask: radial-gradient(ellipse 150px 95px at 50% 45%, rgba(0,0,0,.12) 40%, #000 100%); mask: radial-gradient(ellipse 150px 95px at 50% 45%, rgba(0,0,0,.12) 40%, #000 100%); }
.sg-sky .tr-sky { background: var(--exposure); }
.sg-sky-dark { display: var(--living-stars); }
.sg-sky-light { display: var(--living-snow); }
.sg-expo::after { content: ""; position: absolute; inset: auto 0 0 0; height: 60px; background: linear-gradient(transparent, var(--ground)); }
.sg-mtn { position: absolute; inset: 0; width: 100%; height: 100%; }
.sg-mtn-fill { fill: var(--night-mountain); display: var(--living-stars); }
.sg-mtn-line { fill: none; stroke: color-mix(in srgb, var(--trace) 45%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
.sg-top { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 18px 22px 0; }
.sg-hello { font: 600 22px/1.15 var(--font-display); font-stretch: 130%; letter-spacing: -.02em; margin-top: 2px; }
.sg-gauge { position: absolute; left: 50%; top: 156px; width: 390px; height: 330px; transform: translateX(-50%); z-index: 1; }
.sg-daynum { position: absolute; left: 0; right: 0; top: 130px; text-align: center; z-index: 2; }
.sg-n { margin-top: 4px; }
[data-theme="dark"] .sg-n { text-shadow: 0 0 40px rgba(92, 200, 245, .25); }
.sg-caps { position: absolute; left: 0; right: 0; top: 410px; z-index: 2; display: flex; justify-content: space-between; padding: 0 30px; font-size: 12px; color: var(--ink-3); max-width: 420px; margin: 0 auto; }
.sg-caps b { color: var(--ink); font-weight: 600; }
.sg-action { position: relative; text-align: center; margin-top: -40px; padding: 0 6px; max-width: 520px; justify-self: center; width: 100%; }
.sg-kind { font: 700 38px/1 var(--font-display); font-stretch: 140%; letter-spacing: -.035em; margin-top: 6px; }
.sg-row2 { display: grid; gap: 22px; }
.sg-stats { padding: 18px; }
.sg-stats-r { display: grid; grid-template-columns: repeat(3, 1fr); }
.sg-h { display: flex; justify-content: space-between; align-items: baseline; padding: 0 6px 12px; }
.sg-link { font: 600 13px/1 var(--font); color: var(--accent-ink); text-decoration: none; }
.sg-rail { display: flex; gap: 12px; overflow-x: auto; margin: 0 -16px; padding: 0 16px 6px; scrollbar-width: none; scroll-snap-type: x mandatory; }
.sg-pcard { flex: none; width: 272px; overflow: hidden; scroll-snap-align: start; display: flex; flex-direction: column; }
.sg-art { aspect-ratio: 16 / 10; }
.sg-pin { padding: 12px 14px 14px; display: grid; gap: 4px; }
.sg-nm { font: 650 15px/1.15 var(--font-display); font-stretch: 106%; letter-spacing: -.02em; }
.sg-meter { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin-top: 4px; }
.sg-meter b { font-size: 13px; }
.sg-badge { position: absolute; left: 10px; top: 10px; z-index: 5; font: 600 11.5px/1 var(--font); padding: 5px 9px; border-radius: 99px; background: var(--trace); color: var(--on-accent); }
.sg-upcoming { display: grid; gap: 10px; }
.sg-retreat { overflow: hidden; }
.sg-retreat-img { height: 250px; }
.sg-retreat-cap { position: absolute; left: 20px; right: 20px; bottom: 18px; color: #fff; }
.sg-retreat-t { font: 700 28px/1 var(--font-display); font-stretch: 128%; letter-spacing: -.03em; margin-top: 6px; }
.sg-retreat-b { padding: 16px 20px 20px; display: grid; gap: 14px; }
.sg-facts { display: flex; gap: 22px; font-size: 12.5px; color: var(--ink-3); }
.sg-facts b { display: block; font: 600 15px/1.3 var(--font-display); font-stretch: 105%; color: var(--ink); letter-spacing: -.01em; }
.sg-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sg-tile { padding: 14px; display: grid; gap: 4px; }
.sg-tile b { font-size: 14px; font-weight: 600; line-height: 1.25; }
.sg-tag { font-size: 11.5px; color: var(--accent-ink); font-weight: 500; }
.sg-resume { padding: 12px 14px; display: block; }
@media (min-width: 1024px) {
  .sg-phone { display: none; }
  .sg-expo { margin: 0; border-radius: 30px; height: 480px; }
  .sg-row2 { grid-template-columns: 1fr 1.1fr; align-items: end; }
  .sg-rail { margin: 0; padding: 0 0 6px; }
  .sg-upcoming { grid-template-columns: 1.4fr 1fr; align-items: start; }
  .sg-tiles { grid-template-columns: 1fr; }
}
`;
