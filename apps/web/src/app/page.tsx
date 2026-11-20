import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProgram, PricingPlan } from "@ms/api";
import { Button, Card, Glass, Icon } from "@/components/ui";
import { ProgramCard, ToolGlyph } from "@/components/discover/ProgramCard";
import { publicChip } from "@/components/discover/access";
import { PublicFooter, PublicNav } from "@/components/discover/public/PublicChrome";
import { PlansGrid } from "@/components/discover/public/Plans";
import { loadExplore } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import heroImg from "@/components/discover/img/mtk.jpg";
import coachImg from "@/components/discover/img/coaching.jpg";
import pressImg from "@/components/discover/img/press.jpg";
import "@/components/discover/discover.css";

export const metadata: Metadata = {
  title: { absolute: "Mike Salemi · Kettlebell programs, retreats and coaching" },
  description: "Train with Mike Salemi: Kettlebell Lifestyle, Mastering the Kettlebell, Men of Movement retreats and 1:1 coaching. Start free.",
};

const FEATURED = ["kettlebell-lifestyle", "mastering-the-kettlebell", "athleticism-4-life"];
const TOOLS = [
  { id: "kettlebell-selector", name: "Kettlebell Selector", line: "Find the right bells to start with" },
  { id: "stretch-test", name: "Stretch Test", line: "Check the positions the program demands" },
  { id: "readiness-check", name: "Readiness Check", line: "Should you push today, or back off?" },
  { id: "kettlebell-roadmap", name: "Kettlebell Roadmap", line: "The four fundamental lifts, and your next step" },
];
const RETREAT_STRIP = [
  { src: "/media/retreats/live/fire.jpg", alt: "Men around the fire" },
  { src: "/media/retreats/live/qi-gong.png", alt: "Qi Gong on Mount Shasta" },
  { src: "/media/retreats/live/group-tims-land.jpg", alt: "Men of Movement group on Tim's land" },
];

export default async function Landing() {
  const { supabase, user } = await getUser();
  let catalog: CatalogProgram[] = [];
  let plans: PricingPlan[] = [];
  try {
    ({ catalog, plans } = await loadExplore(supabase));
  } catch {
    // The page still sells without live data: sections that need it are skipped.
  }
  const featured = FEATURED.map((s) => catalog.find((p) => p.slug === s)).filter((p): p is CatalogProgram => Boolean(p));
  const retreat = catalog.find((p) => p.slug === "men-of-movement-retreats");
  const signedIn = Boolean(user);
  const start = signedIn ? "/today" : "/signup";

  return (
    <div className="dsc-public dsc-landing">
      <PublicNav signedIn={signedIn} onPhoto />
      <main id="main">
        {/* Hero */}
        <section className="dsc-hero" aria-labelledby="hero-title">
          <div className="dsc-hero-photo">
            <Image src={heroImg} alt="Mike Salemi in the gym with a kettlebell" fill priority placeholder="blur" sizes="100vw" />
          </div>
          <div className="dsc-hero-copy">
            <p className="lq-t15 dsc-eyebrow">Kettlebell coach · Master of Sport</p>
            <h1 id="hero-title" className="dsc-display dsc-hero-title">Strength you can trust. A life that moves.</h1>
            <p className="lq-t20 dsc-hero-lede">Day-by-day kettlebell programs, retreats and coaching with Mike Salemi.</p>
            <div className="dsc-hero-ctas">
              <Button href={start} size="lg">{signedIn ? "Open the app" : "Start free"}</Button>
              <Button href="/explore" size="lg" variant="white">Explore programs</Button>
            </div>
          </div>
        </section>

        {/* Programs */}
        {featured.length > 0 && (
          <section className="dsc-band" aria-labelledby="programs-title">
            <header className="dsc-band-head">
              <p className="lq-t15 lq-c2 dsc-eyebrow">Programs</p>
              <h2 id="programs-title" className="dsc-h2">Built to be followed, one day at a time.</h2>
              <p className="lq-t17 lq-c2">Every workout, warm-up and stretch, in order, with a readiness check that adapts the day to you.</p>
            </header>
            <div className="dsc-grid">
              {featured.map((p) => (
                <ProgramCard key={p.id} program={p} href={`/explore/${p.slug}`} action="Learn more" height={420} chip={publicChip(p, plans)} />
              ))}
            </div>
            <div className="dsc-band-more">
              <Link href="/explore" className="lq-t17 dsc-link">
                See every program <Icon name="chevron" size="xs" />
              </Link>
            </div>
          </section>
        )}

        {/* Coach */}
        <section className="dsc-band dsc-coach" aria-labelledby="coach-title">
          <div className="dsc-coach-photos">
            <div className="dsc-coach-a">
              <Image src={coachImg} alt="Mike coaching a member through a kettlebell press" fill placeholder="blur" sizes="(min-width: 1024px) 420px, 70vw" />
            </div>
            <div className="dsc-coach-b">
              <Image src={pressImg} alt="Mike pressing a kettlebell overhead" fill placeholder="blur" sizes="(min-width: 1024px) 260px, 45vw" />
            </div>
          </div>
          <div className="dsc-coach-copy">
            <p className="lq-t15 lq-c2 dsc-eyebrow">Your coach</p>
            <h2 id="coach-title" className="dsc-h2">Mike Salemi</h2>
            <p className="lq-t17 lq-c2">
              Mike teaches the kettlebell from the first swing to Master of Sport technique, and brings the same attention to breath, mobility and
              the practice of working in. His programs are the ones he coaches: clear, progressive and built for real lives.
            </p>
            <ul className="dsc-coach-list">
              <li className="lq-t15"><Icon name="kettlebell" size="sm" /> Kettlebell Lifestyle, at two levels</li>
              <li className="lq-t15"><Icon name="steps" size="sm" /> Mastering the Kettlebell, movement by movement</li>
              <li className="lq-t15"><Icon name="mountain" size="sm" /> Men of Movement retreats on Mount Shasta</li>
            </ul>
          </div>
        </section>

        {/* Retreats */}
        {retreat && (
          <section className="dsc-band" aria-labelledby="retreat-title">
            <Card
              height={560}
              radius="hero"
              className="dsc-retreat"
              image={{ src: "/media/retreats/live/after-sweat-lodge.jpg", alt: "Brotherhood after the sweat lodge", position: "50% 40%", sizes: "(min-width: 1024px) 1080px, 100vw" }}
              footer={
                <div className="dsc-retreat-foot">
                  <div>
                    <p className="lq-t13 dsc-dim" style={{ fontWeight: 600 }}>Retreats · {retreat.formatLabel}</p>
                    <h2 id="retreat-title" className="lq-t28">{retreat.name}</h2>
                    <p className="lq-t15 dsc-dim">{retreat.summary}</p>
                  </div>
                  <Button href={`/explore/${retreat.slug}`} variant="white" size="md">Learn more</Button>
                </div>
              }
            />
            <div className="dsc-strip">
              {RETREAT_STRIP.map((m) => (
                <div key={m.src} className="dsc-strip-img">
                  <Image src={m.src} alt={m.alt} fill sizes="(min-width: 1024px) 360px, 33vw" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Free tools */}
        <section className="dsc-band" aria-labelledby="tools-title">
          <header className="dsc-band-head">
            <p className="lq-t15 lq-c2 dsc-eyebrow">Free to start</p>
            <h2 id="tools-title" className="dsc-h2">Four tools. Two minutes each.</h2>
          </header>
          <div className="dsc-landing-tools">
            {TOOLS.map((t) => (
              <Link key={t.id} href={signedIn ? `/tools/${t.id}` : `/signup?next=${encodeURIComponent(`/tools/${t.id}`)}`} className="dsc-cardlink">
                <Glass radius="card" interactive className="dsc-ltool lq-lift">
                  <span className="dsc-ltool-art" aria-hidden><ToolGlyph id={t.id} size={120} /></span>
                  <span className="lq-t17">{t.name}</span>
                  <span className="lq-t13 lq-c2">{t.line}</span>
                </Glass>
              </Link>
            ))}
          </div>
        </section>

        {/* Pricing teaser */}
        {plans.length > 0 && (
          <section className="dsc-band" aria-labelledby="pricing-title">
            <header className="dsc-band-head">
              <p className="lq-t15 lq-c2 dsc-eyebrow">Membership</p>
              <h2 id="pricing-title" className="dsc-h2">One membership. Everything in order.</h2>
            </header>
            <PlansGrid plans={plans} compact signedIn={signedIn} />
            <div className="dsc-band-more">
              <Link href="/pricing" className="lq-t17 dsc-link">
                Compare plans <Icon name="chevron" size="xs" />
              </Link>
            </div>
          </section>
        )}

        {/* Close */}
        <section className="dsc-band dsc-close" aria-labelledby="close-title">
          <h2 id="close-title" className="dsc-display">Your first swing starts here.</h2>
          <Button href={start} size="lg">{signedIn ? "Open the app" : "Start free"}</Button>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
