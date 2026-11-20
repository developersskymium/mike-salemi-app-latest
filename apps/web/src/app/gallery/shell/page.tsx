import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { SidebarGroup } from "@/components/shell/Sidebar";
import { UserButton } from "@/components/shell/ShellUser";
import { AmbientBackdrop, Button, Card, Glass, HeroPhoto, Icon, IconButton, LargeTitle, Rings, StatTile } from "@/components/ui";
import { IMG } from "../_parts/images";
import { Week } from "../_parts/Week";

export const metadata: Metadata = { title: "Shell", robots: { index: false, follow: false } };

/** The app shell with mock data and a Today composition, for screenshot QA (no auth). */
export default function ShellGallery() {
  return (
    <AppShell
      user={{ name: "Daniel Reyes", subtitle: "Level I, Self-Guided" }}
      activeTab={0}
      sidebarExtra={
        <SidebarGroup
          title="Coming up"
          items={[
            { href: "/experiences", label: "The Breakthrough", icon: "mountain" },
            { href: "/coaching", label: "Live call, Tue", icon: "people" },
          ]}
        />
      }
    >
      <AmbientBackdrop src={IMG.coaching} fixed />
      <div className="sg-hero">
        <HeroPhoto image={{ src: IMG.coaching, alt: "", position: "46% 22%" }} />
      </div>
      <div className="sg-title">
        <LargeTitle
          title="Today"
          eyebrow="Friday, 20 November"
          onPhoto
          trailing={
            <>
              <span className="sg-desk"><IconButton icon="search" label="Search" /></span>
              <span className="sg-desk"><IconButton icon="bell" label="Notifications" /></span>
              <span className="sg-phone"><UserButton variant="clear" /></span>
            </>
          }
        />
      </div>

      <div className="sg-grid">
        <Card height={452} radius="hero" interactive className="sg-herocard" image={{ src: IMG.coaching, alt: "Mike coaching a kettlebell press", position: "50% 28%", priority: true }}>
          <Glass level="clear" radius="hero" className="sg-now">
            <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.92 }}>Day 24 of 61, Phase 2</div>
            <h2 className="lq-t34" style={{ marginTop: 2 }}>Workout II</h2>
            <div className="lq-t15" style={{ display: "flex", gap: 14, marginTop: 6, opacity: 0.95 }}>
              <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="timer" size="sm" /><span className="lq-num">52 min</span></span>
              <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="steps" size="sm" />7 steps</span>
              <span style={{ display: "flex", gap: 5, alignItems: "center" }}><Icon name="kettlebell" size="sm" />Level I</span>
            </div>
            <Button block icon="play" href="/programs" style={{ marginTop: 18 }}>Continue Day 24</Button>
            <div className="lq-t13" style={{ textAlign: "center", marginTop: 10, opacity: 0.88 }}>Next: Bodyweight Warm Up, step 3 of 7</div>
          </Glass>
        </Card>

        <div className="sg-side">
          <Glass as="section" radius="card" interactive style={{ padding: "16px 20px" }}>
            <div className="sg-sech sg-desk-block"><h3 className="lq-t17">Progress</h3><span className="lq-t13 lq-c2">Level I</span></div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <Rings size={104} stroke={12} label="23 of 61 days, 2 of 7 steps, 12 day streak" rings={[{ value: 23 / 61, tone: 1 }, { value: 2 / 7, tone: 2 }, { value: 12 / 14, tone: 3 }]} />
              <div className="lq-legend">
                <StatTile swatch={1} value={23} unit="/61 days" label="Program" />
                <StatTile swatch={2} value={2} unit="/7 steps" label="Today" />
                <StatTile swatch={3} value={12} unit=" days" label="Streak" />
              </div>
            </div>
          </Glass>
          <Glass as="section" radius="card" style={{ padding: "18px 16px 16px" }}>
            <div className="sg-sech" style={{ padding: "0 4px" }}><h3 className="lq-t17">This week</h3><span className="lq-t13 lq-c2">3 of 4 sessions</span></div>
            <Week />
          </Glass>
        </div>

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

        <Glass as="section" radius="card" interactive className="sg-mtk">
          <div className="sg-mtk-img" style={{ backgroundImage: `url(${IMG.deadlift.src})` }} />
          <div style={{ flex: 1 }}>
            <div className="lq-t13 lq-c2">Ready for more technique?</div>
            <div className="lq-t17">Mastering the Kettlebell</div>
            <div className="lq-t13 lq-c2">14 lessons with Mike</div>
          </div>
          <IconButton icon="chevron" label="Open Mastering the Kettlebell" variant="fill" size="sm" iconSize="sm" href="/programs" />
        </Glass>
      </div>
      <style>{CSS}</style>
    </AppShell>
  );
}

const CSS = `
.sg-hero { position: absolute; inset: 0 -16px auto; height: 600px; }
.sg-title { position: relative; padding: 0 4px; margin-bottom: 186px; }
.sg-grid { position: relative; display: grid; gap: 12px; }
.sg-side { display: grid; gap: 12px; }
.sg-herocard { height: auto !important; overflow: visible; }
.sg-herocard > .lq-media { display: none; }
.sg-now { padding: 20px 20px 16px; }
.sg-sech { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.sg-desk-block, .sg-desk { display: none; }
.sg-mtk { display: flex; gap: 14px; align-items: center; padding: 12px; border-radius: 28px; }
.sg-mtk-img { width: 68px; height: 68px; border-radius: 18px; background: 50% 30% / cover; flex: none; }
@media (min-width: 1024px) {
  .sg-hero { display: none; }
  .sg-title { margin-bottom: 24px; padding: 0; }
  .sg-title .lq-ltitle[data-on-photo] .lq-ltitle-big { color: var(--label); }
  .sg-title .lq-ltitle[data-on-photo] .lq-ltitle-big h1 { text-shadow: none; }
  .sg-title .lq-ltitle[data-on-photo] .lq-ltitle-big > div { color: var(--label-2); }
  .sg-phone { display: none; }
  .sg-desk { display: inline-flex; }
  .sg-desk-block { display: flex; }
  .sg-grid { grid-template-columns: 1fr 368px; gap: 20px; }
  .sg-side { gap: 20px; }
  .sg-herocard { height: 452px !important; overflow: hidden; }
  .sg-herocard > .lq-media { display: block; }
  .sg-now { position: absolute; left: 16px; bottom: 16px; width: 420px; z-index: 2; }
  .sg-mtk { flex-direction: column; align-items: stretch; gap: 0; }
  .sg-mtk-img { width: 100%; height: 132px; border-radius: 20px; }
  .sg-mtk > div:nth-child(2) { padding: 12px 8px 4px; }
  .sg-mtk > a { position: absolute; right: 16px; bottom: 16px; }
}
`;
