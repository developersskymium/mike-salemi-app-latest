import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Avatar, Button, Chip, Glass, Icon, ProgressBar, Rings, StepSegments, Tag } from "@/components/ui";
import { BeyondTheSummit, Climb, PhotoHero, StreakChip, WeekDots } from "@/components/signature";
import { programPhoto } from "@/lib/program-photos";
import { IMG } from "../_parts/images";
import "../gallery.css";

export const metadata: Metadata = { title: "Shell", robots: { index: false, follow: false } };

const PHASES = [
  { label: "On Ramp", from: 1, to: 7 },
  { label: "Phase 1", from: 8, to: 20 },
  { label: "Phase 2", from: 21, to: 40 },
  { label: "Phase 3", from: 41, to: 61 },
];

const SHELL = {
  resume: { href: "/today", eyebrow: "Up next · Level I", title: "Recovery Day", meta: "Phase 2 · 5 steps · 34 min", day: "Day 24 of 61", progress: 0.38, photo: programPhoto("working-in") },
  access: [
    { href: "/programs/kettlebell-lifestyle", title: "Kettlebell Lifestyle", sub: "Level I · Immersion", photo: programPhoto("kettlebell-lifestyle"), slug: "kettlebell-lifestyle" },
    { href: "/programs/working-in", title: "Working In", sub: "Mind-body course", photo: programPhoto("working-in"), slug: "working-in" },
  ],
  shop: false,
};

const STEPS = [["Morning Routine", "8 min"], ["Bodyweight Warm Up", "7 min"], ["Working In", "10 min"], ["Stretching", "7 min"], ["Completion", "2 min"]];

/** The Summit shell with the approved Home composition (mockup 01), static data, no auth — for screenshot QA. */
export default function ShellGallery() {
  return (
    <AppShell
      user={{ name: "Daniel Reyes", subtitle: "Member since Sep 2026" }}
      shell={SHELL}
      activeTab={0}
      streak={<StreakChip days={12} />}
      streakPhone={<StreakChip days={12} compact />}
      announcement={
        <p>
          <span className="lq-tag" data-tone="warm">New</span>
          <span className="sm-announce-t">Men of Movement · <strong>The Breakthrough</strong> — applications open for May 13–16, 2027 on Mount Shasta</span>
          <Link href="/experiences" className="sm-announce-a">Apply <Icon name="arrowRight" size="xs" /></Link>
        </p>
      }
    >
      <PhotoHero
        image={{ src: IMG.mtk, alt: "Mike Salemi in the gym", focal: "78% 30%", focalPhone: "60% 22%" }}
        minHeight={420}
        priority
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
        <h1 className="lq-d-xxl" style={{ marginTop: 18 }}>Recovery Day</h1>
        <p className="lq-t15" style={{ color: "rgba(255,255,255,.75)", marginTop: 10 }}>Kettlebell Lifestyle · Level I · Phase 2 · 5 steps · 34 min</p>
        <div className="sg-steps">
          <StepSegments total={5} done={0} current={0} onPhoto />
          <div className="sg-steps-l">
            {STEPS.map(([t, m]) => (
              <span key={t}><b>{t}</b>{m}</span>
            ))}
          </div>
        </div>
        <div className="g-row" style={{ marginTop: 26 }}>
          <Button icon="play" href="/today">Start Day 24</Button>
          <Button variant="onphoto" href="/programs/kettlebell-lifestyle">View the program</Button>
        </div>
        <div className="g-row sg-level">
          <span>Level I</span>
          <ProgressBar value={0.38} tone="white" size="thin" label="Level I" style={{ width: 220 }} />
          <b>23 / 61 days · 38%</b>
        </div>
      </PhotoHero>

      <div className="sg-grid">
        <Glass radius="card" className="sg-climb">
          <div className="g-between" style={{ alignItems: "flex-start", padding: "0 26px" }}>
            <div>
              <div className="lq-eyebrow" data-tone="accent">Your climb · Kettlebell Lifestyle Level I</div>
              <h2 className="lq-d-md" style={{ marginTop: 6 }}>You&apos;re 38% of the way up.</h2>
            </div>
            <div className="g-row" style={{ gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div className="lq-dnum" style={{ fontSize: 26 }}>23<span className="lq-c3" style={{ fontSize: 16 }}>/61</span></div>
                <div className="lq-t12 lq-c3">days complete</div>
              </div>
              <Rings size={58} stroke={6} rings={[{ value: 0.38, tone: 1 }]} label="38%"><span>38%</span></Rings>
            </div>
          </div>
          <Climb id="sg-climb" phases={PHASES} done={23} member={{ name: "Daniel Reyes" }} style={{ marginTop: 12 }} />
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

        <Glass radius="card" className="sg-week">
          <div className="lq-eyebrow" data-tone="warm">This week</div>
          <div className="g-row" style={{ gap: 14, marginTop: 12 }}>
            <span className="g-flame"><Icon name="flame" /></span>
            <div>
              <div className="lq-dnum" style={{ fontSize: 40, lineHeight: 0.9 }}>12 <span style={{ fontSize: 18 }}>days</span></div>
              <div className="lq-t13 lq-c2" style={{ marginTop: 4 }}>Your longest streak yet</div>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <WeekDots days={[{ label: "M", state: "done" }, { label: "T", state: "done" }, { label: "W", state: "done" }, { label: "T", state: "done" }, { label: "F", state: "today", date: 24 }, { label: "S", state: "ahead" }, { label: "S", state: "ahead" }]} />
          </div>
          <hr className="lq-hair" style={{ margin: "20px 0 16px" }} />
          <div className="lq-t13" style={{ fontWeight: 650 }}>2 days to your 14-day badge</div>
          <div className="lq-t12 lq-c3" style={{ marginTop: 4, fontWeight: 500 }}>Finish today and tomorrow to earn <b className="lq-c2">Fortnight Strong</b>.</div>
          <div className="g-between lq-t12 lq-c3" style={{ marginTop: 16 }}><span>Badge progress</span><b className="lq-c2">12 / 14</b></div>
          <ProgressBar value={12 / 14} tone="warm" size="thin" label="Badge progress" style={{ marginTop: 6 }} />
          <hr className="lq-hair" style={{ margin: "20px 0 16px" }} />
          <div className="lq-t12 lq-c3">Trained this week</div>
          <div className="lq-dnum" style={{ fontSize: 24, marginTop: 4 }}>2h 41m</div>
          <div className="lq-t12" style={{ marginTop: 4, color: "var(--ok)", fontWeight: 650 }}>↑ 18% on last week</div>
        </Glass>
      </div>

      <style>{`
        .sg-steps { margin-top: 22px; max-width: 700px; }
        .sg-steps-l { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; margin-top: 8px; font: 500 11.5px/1.25 var(--font); color: rgba(255,255,255,.7); }
        .sg-steps-l b { display: block; color: #fff; font-weight: 650; }
        .sg-level { margin-top: 26px; gap: 14px; font: 500 13px/1 var(--font); color: rgba(255,255,255,.75); }
        .sg-level b { color: #fff; }
        .sg-grid { display: grid; gap: 20px; margin-top: 20px; }
        @media (min-width: 1180px) { .sg-grid { grid-template-columns: minmax(0, 2.15fr) minmax(0, 1fr); } }
        .sg-climb { padding: 24px 0 22px; overflow: hidden; }
        .sg-week { padding: 24px; }
        @media (max-width: 719px) { .sg-steps-l, .sg-level { display: none; } }
      `}</style>
    </AppShell>
  );
}
