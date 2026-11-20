import type { Metadata } from "next";
import Link from "next/link";
import type { CatalogProgram, PricingPlan } from "@ms/api";
import { Button, Chip, Icon, Tag } from "@/components/ui";
import { Climb } from "@/components/signature";
import { isDraft, money } from "@/components/discover/access";
import { PublicFooter, PublicNav } from "@/components/discover/public/PublicChrome";
import { PlansGrid } from "@/components/discover/public/Plans";
import { Finder, type FinderProgram } from "@/components/discover/public/Finder";
import { Draft, Photo, SectionHead } from "@/components/discover/public/Pieces";
import { PHOTOS, photoFor } from "@/components/discover/public/photos";
import { loadExplore } from "@/lib/loaders/discover";
import { publicPrices, publicViewer, type PublicPrices } from "@/lib/loaders/public";

export const metadata: Metadata = {
  title: { absolute: "Mike Salemi · Kettlebell programs, retreats and coaching" },
  description: "Train with Mike Salemi: Kettlebell Lifestyle, Mastering the Kettlebell, Men of Movement retreats on Mount Shasta and 1:1 coaching. Start free.",
};

/** Kettlebell Lifestyle's phases (Level I): the route the Climb draws. */
const KBL_PHASES = [
  { label: "On Ramp", from: 1, to: 7 },
  { label: "Phase 1", from: 8, to: 20 },
  { label: "Phase 2", from: 21, to: 40 },
  { label: "Phase 3", from: 41, to: 61 },
];

/** Real Phase 2 days from Kettlebell Lifestyle · Level I, as a member sees them. */
const DAYS = [
  { n: 21, title: "Workout I Day", meta: "Strength · warm-up, workout, stretch", state: "done" },
  { n: 22, title: "Recovery Day", meta: "Mobility and breath", state: "done" },
  { n: 23, title: "Workout II Day", meta: "Strength · readiness check first", state: "now" },
] as const;

const FINDER_SLUGS = ["kettlebell-lifestyle", "mastering-the-kettlebell", "athleticism-4-life", "working-in", "men-of-movement-retreats", "coaching", "what-your-kettlebell-swing-is-missing"];
const FREE_SLUGS = ["what-your-kettlebell-swing-is-missing", "free-6-video-kettlebell-mini-series", "kettlebell-roadmap"];
const FREE_LINES: Record<string, string> = {
  "kettlebell-roadmap": "The four fundamental lifts, and the step that comes next for you.",
};

export default async function Landing() {
  const { supabase, signedIn } = await publicViewer();
  let catalog: CatalogProgram[] = [];
  let plans: PricingPlan[] = [];
  let prices: PublicPrices = { programs: [], coaching: [] };
  try {
    [{ catalog, plans }, prices] = await Promise.all([loadExplore(supabase), publicPrices(supabase)]);
  } catch {
    // The page still sells without live data: sections that need it are skipped.
  }
  const by = new Map(catalog.map((p) => [p.slug, p]));
  const kbl = by.get("kettlebell-lifestyle");
  const mtk = by.get("mastering-the-kettlebell");
  const retreat = by.get("men-of-movement-retreats");
  const coaching = by.get("coaching");
  const edge = by.get("executive-edge");
  const start = signedIn ? "/today" : "/signup";
  const finder: FinderProgram[] = FINDER_SLUGS.flatMap((s) => {
    const p = by.get(s);
    return p ? [{ slug: p.slug, name: p.name, line: p.tagline ?? p.summary, free: p.isFree || p.access === "free" }] : [];
  });
  const free = FREE_SLUGS.flatMap((s) => (by.get(s) ? [by.get(s)!] : []));
  const mtkPrice = mtk ? prices.programs.find((x) => x.programId === mtk.id) : undefined;
  const sessions = prices.coaching;

  return (
    <div className="pub">
      <PublicNav signedIn={signedIn} onPhoto />
      <main id="main" className="pub-main">
        {/* Hero: Mike in full colour */}
        <section className="pub-hero" aria-labelledby="hero-title">
          <Photo p={PHOTOS.hero} sizes="100vw" priority />
          <div className="pub-hero-in">
            <div className="pub-hero-copy lq-rise">
              <Tag tone="light">Kettlebell · Movement · Mount Shasta</Tag>
              <h1 id="hero-title" className="lq-d-xxl pub-hero-title">Strength you can trust. A life that moves.</h1>
              <p className="pub-hero-lede">Train with Mike Salemi: day-by-day kettlebell programs, technique you can rely on, retreats on the mountain and coaching when you want it personal.</p>
              <div className="pub-hero-ctas">
                <Button href={start} size="lg">{signedIn ? "Open the app" : "Start free"}</Button>
                <Button href="#finder" size="lg" variant="white" iconAfter="arrowRight">Find your program</Button>
              </div>
              <p className="pub-hero-note">
                <span><Icon name="check" size="xs" /> Free tools and starter series</span>
                <span><Icon name="check" size="xs" /> No card needed to start</span>
              </p>
            </div>
          </div>
          {kbl && (
            <div className="pub-hero-badge" aria-hidden>
              <i>61</i>
              <div>
                <b>{kbl.name}</b>
                <span>Days per level, four phases. Warm-up, workout and stretch in order.</span>
              </div>
            </div>
          )}
        </section>

        {/* Real facts from the programs themselves */}
        <div className="pub-wrap pub-facts">
          <div className="pub-facts-card">
            <div className="pub-fact"><b>2<small>levels</small></b><span>Kettlebell Lifestyle, Beginner and Intermediate</span></div>
            <div className="pub-fact" data-tone="warm"><b>61<small>days</small></b><span>Per level, in four phases from On Ramp to Phase 3</span></div>
            <div className="pub-fact"><b>{catalog.filter((p) => p.catalogGroup === "training").length || 5}<small>programs</small></b><span>Day-by-day plans and technique courses</span></div>
            <div className="pub-fact"><b>4<small>days</small></b><span>Men of Movement retreats, in person on Mount Shasta</span></div>
          </div>
        </div>

        {/* What the programs do */}
        <section className="pub-band" aria-labelledby="what-title">
          <div className="pub-wrap">
            <SectionHead eyebrow="What you get" id="what-title" title="Everything in order. Nothing left to guess." lede="Open the app and today is already planned: warm-up, workout and stretch, with a readiness check that adapts the day to how you feel." />
            <div className="pub-bento">
              <div className="pub-bento-climb">
                <p className="lq-eyebrow" data-tone="warm">The Climb</p>
                <h3 className="lq-d-md">Every level is a route up Mount Shasta.</h3>
                <p className="lq-t15 lq-c2" style={{ margin: 0, maxWidth: "46ch" }}>Phases are camps and the last day is the summit, so you always see where you are and what comes next.</p>
                <ol className="pub-days" aria-label="Example days in Phase 2">
                  {DAYS.map((d) => (
                    <li key={d.n} data-state={d.state}>
                      <span className="pub-days-dot" aria-hidden>{d.state === "done" ? <Icon name="check" size="xs" /> : d.state === "now" ? <Icon name="play" size="xs" /> : null}</span>
                      <span className="pub-days-n">Day {d.n}</span>
                      <span className="pub-days-t"><b>{d.title}</b><small>{d.meta}</small></span>
                      {d.state === "now" ? <Tag tone="warm">Today</Tag> : <span className="pub-days-s">{d.state === "done" ? "Done" : "Up next"}</span>}
                    </li>
                  ))}
                </ol>
                <Climb id="landing-climb" className="pub-desk" phases={KBL_PHASES} done={22} labels height={250} label="Example: day 23 of 61, in Phase 2" />
                <Climb id="landing-climb-ph" className="pub-phone" phases={KBL_PHASES} done={22} labels={false} height={250} label="Example: day 23 of 61, in Phase 2" />
              </div>
              <Link href="/explore/mastering-the-kettlebell" className="pub-tile">
                <Photo p={PHOTOS.deadlift} sizes="(min-width: 1024px) 520px, 92vw" />
                <div className="pub-tile-copy">
                  <Tag tone="light">Technique</Tag>
                  <h3 className="lq-d-sm">Every movement, broken down</h3>
                  <p>Swing, clean, press, snatch and get-up, from the first rep to performance.</p>
                </div>
              </Link>
              <Link href="/explore/working-in" className="pub-tile">
                <Photo p={PHOTOS.workingIn} sizes="(min-width: 1024px) 520px, 92vw" />
                <div className="pub-tile-copy">
                  <Tag tone="light">Recovery</Tag>
                  <h3 className="lq-d-sm">Breath, mobility and working in</h3>
                  <p>The quieter work that keeps you training for decades, made with Paul Chek.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* The program ladder: KBL → MTK → retreats */}
        <section className="pub-band" aria-labelledby="ladder-title">
          <div className="pub-wrap">
            <SectionHead eyebrow="Your path with Mike" tone="warm" id="ladder-title" title="Start strong. Go deeper. Reach the summit." lede="Three steps, each building on the last. Most people start with Kettlebell Lifestyle." action={<Button href="/explore" variant="secondary" size="md" iconAfter="arrowRight">All programs</Button>} />
            <div className="pub-ladder">
              <span className="pub-ladder-route" aria-hidden />
              {[
                { slug: "kettlebell-lifestyle", photo: PHOTOS.windmill, step: "Start here", title: kbl?.name ?? "Kettlebell Lifestyle", line: kbl?.tagline ?? "Nine weeks to a kettlebell you can trust, at two levels.", meta: ["2 levels", "61 days each", "Day by day or self-guided"] },
                { slug: "mastering-the-kettlebell", photo: PHOTOS.squat, step: "Go deeper", title: mtk?.name ?? "Mastering the Kettlebell", line: mtk?.summary ?? "Kettlebell technique from foundations to performance.", meta: [mtk?.paths.length ? `${mtk.paths.length} focus paths` : "Video course", "At your own pace"] },
                { slug: "men-of-movement-retreats", photo: PHOTOS.summitGroup, step: "The summit", title: retreat?.name ?? "Men of Movement Retreats", line: retreat?.summary ?? "Four days on Mount Shasta.", meta: ["4 days in person", "By application"] },
              ].map((s, i) => (
                <Link key={s.slug} href={`/explore/${s.slug}`} className="pub-step" data-summit={i === 2 ? "" : undefined}>
                  <span className="pub-step-camp" aria-hidden>{i === 2 ? <Icon name="flag" size="xs" /> : i + 1}</span>
                  <span className="pub-step-card">
                    <Photo p={s.photo} sizes="(min-width: 1024px) 380px, 90vw">
                      <Tag tone={i === 0 ? "accent" : i === 2 ? "warm" : "light"}>{s.step}</Tag>
                    </Photo>
                    <span className="pub-step-body">
                      <h3 className="lq-d-sm">{s.title}</h3>
                      <p>{s.line}</p>
                      <span className="pub-step-meta">
                        {s.meta.map((m) => (
                          <Chip key={m} size="sm" variant="fill">{m}</Chip>
                        ))}
                      </span>
                      <span className="pub-step-go">See the program <Icon name="arrowRight" size="xs" /></span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3-tap program finder */}
        {finder.length > 0 && (
          <section className="pub-band" id="finder" aria-labelledby="finder-title" style={{ scrollMarginTop: 80 }}>
            <div className="pub-wrap pub-finder">
              <div className="pub-finder-copy">
                <p className="lq-eyebrow" data-tone="accent">Program finder</p>
                <h2 id="finder-title" className="lq-d-lg pub-h2">Not sure where to start? Three taps.</h2>
                <p className="lq-lede" style={{ margin: 0 }}>Tell us where you are, what you want and how you like to learn. You&rsquo;ll get one clear recommendation and why it fits.</p>
                <div className="pub-finder-faces" aria-hidden>
                  <Photo p={PHOTOS.face} sizes="52px" />
                  <span className="lq-t13 lq-c2">The same advice Mike gives when someone asks him where to begin.</span>
                </div>
              </div>
              <Finder programs={finder} signedIn={signedIn} />
            </div>
          </section>
        )}

        {/* Retreats */}
        {retreat && (
          <section className="pub-band" aria-labelledby="retreat-title">
            <div className="pub-wrap">
              <SectionHead eyebrow="Men of Movement · Mount Shasta, California" tone="warm" id="retreat-title" title="Four days on the mountain." lede={retreat.summary} />
              <div className="pub-mosaic">
                {[PHOTOS.ridgeCircle, PHOTOS.fire, PHOTOS.shastaRidge, PHOTOS.meals, PHOTOS.timsLand].map((p, i) => (
                  <Photo key={p.src} p={p} sizes={i === 0 ? "(min-width: 1024px) 600px, 92vw" : "(min-width: 1024px) 300px, 46vw"} />
                ))}
              </div>
              <div className="pub-retreat">
                <div className="pub-retreat-copy">
                  <h3 className="lq-d-md">Movement, breath, nature and brotherhood.</h3>
                  <p className="lq-t15 lq-c2" style={{ margin: 0, maxWidth: "60ch" }}>
                    Training, breathwork, ceremony and long days outside with Mike and his team. Every place is by application, and almost everyone who applies is welcomed. You don&rsquo;t need to be in any particular shape.
                  </p>
                  <div className="pub-retreat-tracks">
                    <div className="pub-track"><b>Hold Your Ground <Draft note="Program details awaiting Mike" /></b><span>One of two retreat programs, each with its own venue and focus.</span></div>
                    <div className="pub-track"><b>Primal Reset <Draft note="Program details awaiting Mike" /></b><span>The second program: a slightly different setting and emphasis.</span></div>
                  </div>
                  <div className="pub-pillars" aria-label="Pillars">
                    {["Movement", "Breathwork", "Nature", "Storywork"].map((x) => (
                      <Chip key={x} variant="warm" size="sm">{x}</Chip>
                    ))}
                  </div>
                </div>
                <aside className="pub-howcard" aria-label="How it works">
                  <div>
                    <p className="lq-eyebrow">From</p>
                    <div className="pub-howcard-price">
                      <b>$2,700</b>
                      <Draft note="Retreat pricing awaiting Mike" />
                    </div>
                  </div>
                  <ol className="pub-how">
                    <li><div><b>Apply</b><span>A short form about where you are and why now.</span></div></li>
                    <li><div><b>Schedule a call</b><span>Talk it through with the team.</span></div></li>
                    <li><div><b>Confirm your place</b><span>If it&rsquo;s a fit, pay to reserve. A free preparation series opens before you go.</span></div></li>
                  </ol>
                  <Button href="/explore/men-of-movement-retreats" size="md" block>Apply for a place</Button>
                </aside>
              </div>
            </div>
          </section>
        )}

        {/* Coaching */}
        {coaching && (
          <section className="pub-band" aria-labelledby="coach-title">
            <div className="pub-wrap pub-split">
              <Photo p={PHOTOS.coaching} sizes="(min-width: 1024px) 580px, 92vw" />
              <div className="pub-split-copy">
                <p className="lq-eyebrow" data-tone="accent">1:1 coaching</p>
                <h2 id="coach-title" className="lq-d-lg pub-h2">{coaching.tagline ?? "Your program, built around you."}</h2>
                <p className="lq-lede" style={{ margin: 0 }}>{coaching.summary}</p>
                {sessions.length > 0 && (
                  <div className="pub-offers">
                    {sessions.map((s) => (
                      <div key={s.programId} className="pub-offer">
                        <div>
                          <b>{s.label}</b>
                          <small>Live video with Mike</small>
                        </div>
                        <span className="pub-offer-price">{money(s.amountCents, s.currency)} <Draft note={s.draftNote} /></span>
                      </div>
                    ))}
                  </div>
                )}
                {edge && (
                  <Link href={`/explore/${edge.slug}`} className="pub-edge">
                    <Photo p={PHOTOS.facingShasta} sizes="76px" />
                    <div>
                      <b>{edge.name} {isDraft(edge) && <Draft note={edge.draftNote} />}</b>
                      <span>{edge.tagline ?? edge.summary}</span>
                    </div>
                  </Link>
                )}
                <div><Button href="/explore/coaching" size="md" iconAfter="arrowRight">Ask about coaching</Button></div>
              </div>
            </div>
          </section>
        )}

        {/* Free start */}
        {free.length > 0 && (
          <section className="pub-band" aria-labelledby="free-title">
            <div className="pub-wrap">
              <SectionHead eyebrow="Free to start" tone="accent" id="free-title" title="Try Mike's coaching today, free." lede="Short series and tools you can use this week, no card needed." />
              <div className="pub-cards">
                {free.map((p) => (
                  <Link key={p.id} href={`/explore/${p.slug}`} className="pub-card">
                    <Photo p={p.slug === "kettlebell-roadmap" ? PHOTOS.getup : photoFor(p.slug)} sizes="(min-width: 1024px) 380px, (min-width: 720px) 46vw, 92vw">
                      <span className="pub-card-badges"><Tag tone="ok">Free</Tag></span>
                    </Photo>
                    <div className="pub-card-body">
                      <h3 className="lq-d-sm">{p.name}</h3>
                      <p>{p.summary ?? p.tagline ?? FREE_LINES[p.slug] ?? ""}</p>
                      <div className="pub-card-foot">
                        <span className="pub-card-go">{p.type === "tool" ? "Use the tool" : "Start watching"} <Icon name="arrowRight" size="xs" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing teaser */}
        {plans.length > 0 && (
          <section className="pub-band" aria-labelledby="pricing-title">
            <div className="pub-wrap">
              <SectionHead eyebrow="Membership" id="pricing-title" title="One membership. Everything in order." lede={mtkPrice ? `Or buy a course on its own, like Mastering the Kettlebell for ${money(mtkPrice.amountCents)}. Plans bundle the programs and save on the rest.` : "Plans bundle the programs and save on the rest."} action={<Button href="/pricing" variant="secondary" size="md" iconAfter="arrowRight">Compare plans</Button>} />
              <PlansGrid plans={plans} compact signedIn={signedIn} />
            </div>
          </section>
        )}

        {/* Meet Mike: real proof only */}
        <section className="pub-band" aria-labelledby="mike-title">
          <div className="pub-wrap pub-mike">
            <div className="pub-mike-portrait">
              <Photo p={PHOTOS.face} sizes="(min-width: 1024px) 420px, 80vw" />
              <span className="pub-mike-sig" aria-hidden><Icon name="kettlebell" size="sm" /> Coach · Kettlebell · Movement</span>
            </div>
            <div className="pub-mike-copy">
              <p className="lq-eyebrow" data-tone="accent">Your coach</p>
              <h2 id="mike-title" className="lq-d-lg pub-h2">Mike Salemi</h2>
              <p className="lq-lede">
                Mike teaches the kettlebell from the first swing to advanced technique, and brings the same attention to breath, mobility and the practice of working in. His programs are the ones he coaches: clear, progressive and built for real lives.
              </p>
              <div className="pub-proof">
                <div className="pub-proof-item"><Icon name="kettlebell" size="sm" /><b>Kettlebell Lifestyle</b><span>Two nine-week levels, filmed and coached by Mike.</span></div>
                <div className="pub-proof-item"><Icon name="leaf" size="sm" /><b>Working-In</b><span>A short series made together with Paul Chek.</span></div>
                <div className="pub-proof-item"><Icon name="mountain" size="sm" /><b>Men of Movement</b><span>In-person retreats on Mount Shasta, California.</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="pub-close" aria-labelledby="close-title">
          <Photo p={PHOTOS.summitClouds} sizes="100vw" />
          <div className="pub-close-in">
            <h2 id="close-title" className="lq-d-xl">Your first swing starts here.</h2>
            <p>Free tools and starter series today. Upgrade whenever you&rsquo;re ready.</p>
            <Button href={start} size="lg">{signedIn ? "Open the app" : "Start free"}</Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
