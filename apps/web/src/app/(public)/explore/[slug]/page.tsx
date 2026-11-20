import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PricingPlan } from "@ms/api";
import { Button, Chip, Icon, Tag } from "@/components/ui";
import { isDraft, money } from "@/components/discover/access";
import { BuyBar } from "@/components/discover/public/BuyBar";
import { Draft, Photo } from "@/components/discover/public/Pieces";
import { Curriculum, faq, FirstLesson, Prose, realSections, salesCta } from "@/components/discover/public/Sales";
import { PHOTOS, photoFor, type PhotoKey, type PubPhoto } from "@/components/discover/public/photos";
import { freeProgramIds, isDraftPlan, planValue, yearly } from "@/components/discover/public/value";
import { loadSales } from "@/lib/loaders/discover";
import { publicPrices, publicViewer } from "@/lib/loaders/public";
import { getUser } from "@/lib/supabase/server";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getUser();
  const page = await loadSales(supabase, slug).catch(() => null);
  if (!page) return { title: "Program" };
  return { title: page.program.name, description: page.program.tagline ?? page.program.summary ?? undefined };
}

const TYPE_LABEL: Record<string, string> = { day_program: "Day-by-day program", course: "Video course", challenge: "Group challenge", live: "Live program", retreat: "In-person retreat", coaching: "1:1 coaching", tool: "Free tool" };

/** The next camp on the route: where this program leads. */
const NEXT: Record<string, { slug: string; photo: PhotoKey; tag: string; title: string; line: string }> = {
  "kettlebell-lifestyle": { slug: "mastering-the-kettlebell", photo: "windmill", tag: "Beyond the summit", title: "Mastering the Kettlebell", line: "When the daily plan feels solid, go movement by movement: grips, pre-checks, common errors and variations." },
  "mastering-the-kettlebell": { slug: "men-of-movement-retreats", photo: "summitGroup", tag: "Beyond the summit", title: "Men of Movement retreats", line: "Four days of training, breathwork and brotherhood with Mike on Mount Shasta." },
  "what-your-kettlebell-swing-is-missing": { slug: "kettlebell-lifestyle", photo: "hero", tag: "Your next step", title: "Kettlebell Lifestyle", line: "Put the swing to work: nine weeks, day by day, with a readiness check that adapts each day." },
  "free-6-video-kettlebell-mini-series": { slug: "kettlebell-lifestyle", photo: "hero", tag: "Your next step", title: "Kettlebell Lifestyle", line: "Nine weeks, day by day: warm-up, workout and stretch in order." },
  "men-of-movement-retreats": { slug: "coaching", photo: "coaching", tag: "Keep going", title: "1:1 coaching with Mike", line: "Your program adapted to your body, schedule and goals, with feedback and accountability week to week." },
};

export default async function SalesPageRoute({ params }: Params) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) notFound();
  const { supabase, signedIn } = await publicViewer();
  const [page, prices] = await Promise.all([loadSales(supabase, slug), publicPrices(supabase)]);
  if (!page) notFound();
  const p = page.program;
  const cta = salesCta(page, signedIn);
  const photo: PubPhoto = photoFor(p.slug);
  const gallery = p.media.filter((m) => m.role === "gallery").slice(0, 5);
  const questions = faq(page, cta);
  const sections = realSections(page.outline);
  const lessons = sections.reduce((n, s) => n + s.lessonCount, 0);
  const lessonLabel = p.lessonLabel ?? "Lesson";
  const list = prices.programs.find((x) => x.programId === p.id);
  const freeIds = freeProgramIds(page.plans);
  const coveringPlans = page.plans.filter((pl) => pl.prices.length && pl.benefits.some((b) => b.programId === p.id && b.benefit === "included")).sort((a, b) => a.rank - b.rank);
  const discountPlan = page.plans.find((pl) => pl.benefits.some((b) => b.programId === p.id && b.benefit === "discount"));
  const next = NEXT[p.slug];
  const draft = cta.draft ?? (list?.draftNote && cta.price ? list.draftNote : null) ?? (isDraft(p) ? p.draftNote : null);
  const free = cta.price === "Free";
  // A tagline that only repeats the name says nothing: use the summary instead.
  const lede = p.tagline && !p.tagline.toLowerCase().includes(p.name.toLowerCase().replace(/ retreats?$/, "")) ? p.tagline : p.summary ?? p.tagline;

  const facts = [
    { k: "Format", v: TYPE_LABEL[p.type] ?? "Program" },
    { k: p.type === "retreat" ? "Length" : "Duration", v: p.durationLabel ?? p.formatLabel ?? (lessons ? `${lessons} ${lessonLabel.toLowerCase()}s` : "At your pace") },
    { k: "How you train", v: p.type === "retreat" ? "In person, small groups" : p.modes.length ? (p.modes.includes("immersion") ? "Day by day or self-guided" : "At your own pace") : "With Mike" },
    { k: p.paths.length > 1 ? (p.paths[0]!.kind === "level" ? "Levels" : "Focus paths") : "Access", v: p.paths.length > 1 ? p.paths.map((x) => x.shortName ?? x.name.split(" · ")[0]).join(", ") : free ? "Free" : p.type === "retreat" ? "By application" : list ? "One-time, yours to keep" : coveringPlans[0] ? `With ${coveringPlans[0].name}` : "On request" },
  ];

  return (
    <div className="pub-sales">
      <section className="pub-sales-hero" data-portrait={photo.wide ? undefined : ""} aria-labelledby="sales-title">
        <Photo p={photo} sizes={photo.wide ? "100vw" : "(min-width: 720px) 50vw, 100vw"} priority />
        <div className="pub-sales-hero-in">
          <Link href="/explore" className="pub-crumb"><Icon name="back" size="xs" /> All programs</Link>
          <Tag tone={p.type === "retreat" ? "warm" : free ? "ok" : "light"}>{free ? "Free" : TYPE_LABEL[p.type] ?? "Program"}</Tag>
          <h1 id="sales-title" className="lq-d-xxl">{p.name}</h1>
          {lede && <p className="pub-sales-lede">{lede}</p>}
          {p.paths.length > 1 && (
            <div className="pub-flag-chips">
              {p.paths.map((x) => (
                <Chip key={x.id} variant="clear">{x.name}</Chip>
              ))}
            </div>
          )}
          <div className="pub-sales-buy" id="buy-row">
            <Button href={cta.href} size="lg">{cta.label}</Button>
            {cta.price && (
              <span className="pub-price">
                <b>{cta.price}</b>
                {cta.per && <span>{cta.per}</span>}
                <Draft note={draft} onPhoto />
              </span>
            )}
          </div>
          {cta.note && <p className="pub-sales-note">{cta.note}</p>}
        </div>
      </section>

      <div className="pub-strip">
        <div className="pub-strip-in">
          {facts.map((f) => (
            <div key={f.k} className="pub-strip-cell">
              <span>{f.k}</span>
              <b>{f.v}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="pub-wrap">
        <div className="pub-sales-body">
          <div className="pub-sales-main">
            {p.highlights?.length ? (
              <section aria-label="Highlights" className="pub-hls">
                {p.highlights.map((h, i) => (
                  <div key={h} className="pub-hl">
                    <i aria-hidden>0{i + 1}</i>
                    <p>{h}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {(p.description || p.summary) && (
              <section aria-labelledby="about">
                <h2 id="about" className="lq-d-md">About {p.type === "retreat" ? "the retreat" : "the program"}</h2>
                <Prose text={p.description ?? p.summary!} />
              </section>
            )}

            {gallery.length >= 3 && (
              <section aria-label="Photos" className={gallery.length >= 5 ? "pub-mosaic" : "pub-gal"}>
                {gallery.map((m, i) => (
                  <Photo key={m.url + i} p={{ src: m.url, alt: m.alt, focal: "50% 45%" }} sizes={i === 0 ? "(min-width: 1024px) 520px, 92vw" : "(min-width: 1024px) 260px, 46vw"} />
                ))}
              </section>
            )}

            {sections.length > 0 && (
              <section aria-labelledby="inside">
                <h2 id="inside" className="lq-d-md">What&rsquo;s inside</h2>
                <Curriculum outline={page.outline} lessonLabel={lessonLabel} summary={lessonLabel === "Day" ? p.formatLabel : null} />
              </section>
            )}

            {sections.length > 0 && (
              <section aria-labelledby="first">
                <h2 id="first" className="lq-d-md">Your first {lessonLabel.toLowerCase()}</h2>
                <FirstLesson outline={page.outline} photo={photo} href={cta.href} signedIn={signedIn} />
              </section>
            )}

            {!free && (list || coveringPlans.length > 0) && (
              <section aria-labelledby="value">
                <h2 id="value" className="lq-d-md">On its own, or with a plan</h2>
                <ValueCompare name={p.name} list={list} plans={coveringPlans.slice(0, 2)} prices={prices.programs} freeIds={freeIds} discountPlan={discountPlan} programId={p.id} signedIn={signedIn} buyHref={cta.href} />
              </section>
            )}

            {questions.length > 0 && (
              <section aria-labelledby="faq">
                <h2 id="faq" className="lq-d-md">Questions</h2>
                <div className="pub-faq">
                  {questions.map((f) => (
                    <details key={f.q}>
                      <summary>
                        {f.q}
                        <Icon name="plus" size="sm" />
                      </summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="pub-aside" data-keep={p.type === "retreat" ? "" : undefined} aria-label="Get this program">
            <div className="pub-buycard">
              <Photo p={photo} sizes="360px" />
              <div className="pub-buycard-body">
                <p className="lq-eyebrow">{p.name}</p>
                {cta.price ? (
                  <span className="pub-price">
                    <b>{cta.price}</b>
                    {cta.per && <span>{cta.per}</span>}
                    <Draft note={draft} />
                  </span>
                ) : (
                  <p className="lq-d-xs" style={{ margin: 0 }}>{p.type === "retreat" ? "By application" : "On request"} <Draft note={isDraft(p) ? p.draftNote : null} /></p>
                )}
                {cta.note && <p className="lq-t13 lq-c2" style={{ margin: 0 }}>{cta.note}</p>}
                <ul className="pub-buycard-list">
                  {(p.highlights ?? []).slice(0, 3).map((h) => (
                    <li key={h}><Icon name="check" size="xs" /> {h}</li>
                  ))}
                  {lessons > 0 && lessonLabel !== "Day" && <li><Icon name="check" size="xs" /> {lessons} {lessonLabel.toLowerCase()}s across {sections.length} parts</li>}
                </ul>
                {p.type === "retreat" && (
                  <ol className="pub-how" aria-label="How it comes together">
                    <li><div><b>Apply</b><span>A short form about where you are and why now.</span></div></li>
                    <li><div><b>Schedule a call</b><span>Talk it through with the team.</span></div></li>
                    <li><div><b>Confirm your place</b><span>If it&rsquo;s a fit, pay to reserve. A free preparation series opens before you go.</span></div></li>
                  </ol>
                )}
                <Button href={cta.href} block size="md">{cta.label}</Button>
                {!free && p.type !== "retreat" && <Button href="/pricing" block size="md" variant="ghost">Compare plans</Button>}
              </div>
            </div>
          </aside>
        </div>

        {next && next.slug !== p.slug && (
          <section className="pub-band" data-tight aria-labelledby="next-title">
            <Link href={`/explore/${next.slug}`} className="pub-next">
              <Photo p={PHOTOS[next.photo]} sizes="(min-width: 1240px) 1160px, 100vw" />
              <div className="pub-next-copy">
                <Tag tone="warm">{next.tag}</Tag>
                <h3 id="next-title" className="lq-d-lg">{next.title}</h3>
                <p>{next.line}</p>
                <span className="pub-step-go" style={{ color: "#fff" }}>See what&rsquo;s inside <Icon name="arrowRight" size="xs" /></span>
              </div>
            </Link>
          </section>
        )}
        <div style={{ height: 112 }} />
      </div>

      <BuyBar watch="buy-row" name={p.name} photo={photo} price={cta.price} per={cta.per} note={cta.note} draft={draft} label={cta.label} href={cta.href} />
    </div>
  );
}

/** Alone vs with a plan: the program's list price beside the plans that include it, with what else they carry. */
function ValueCompare({ name, list, plans, prices, freeIds, discountPlan, programId, signedIn, buyHref }: {
  name: string;
  list: { amountCents: number; currency: string; draftNote: string | null } | undefined;
  plans: PricingPlan[];
  prices: Parameters<typeof planValue>[1];
  freeIds: Set<string>;
  discountPlan: PricingPlan | undefined;
  programId: string;
  signedIn: boolean;
  buyHref: string;
}) {
  const short = name.split(":")[0];
  const disc = discountPlan?.benefits.find((b) => b.programId === programId && b.benefit === "discount");
  return (
    <div className="pub-value">
      {list && (
        <div className="pub-value-card" data-best={plans.length === 0 ? "" : undefined}>
          <Tag tone="ink">On its own</Tag>
          <h3 className="lq-d-sm">Just {short}</h3>
          <span className="pub-price"><b>{money(list.amountCents, list.currency)}</b><span>one-time</span><Draft note={list.draftNote} /></span>
          <ul>
            <li><span><Icon name="check" size="xs" /> Every {short} lesson</span></li>
            <li><span><Icon name="check" size="xs" /> Yours to keep, no subscription</span></li>
            {disc && discountPlan && <li><span><Icon name="sparkle" size="xs" /> {discountPlan.name} members save {disc.discountPercent}%</span><b>{money(Math.round(list.amountCents * (1 - (disc.discountPercent ?? 0) / 100)))}</b></li>}
          </ul>
          <Button href={buyHref} size="md" variant={plans.length ? "secondary" : "filled"}>Get {short}</Button>
        </div>
      )}
      {plans.map((pl, i) => {
        const v = planValue(pl, prices, freeIds);
        const y = yearly(pl);
        return (
          <div key={pl.id} className="pub-value-card" data-best={i === 0 ? "" : undefined}>
            <Tag tone={i === 0 ? "accent" : "light"}>{i === 0 ? "Best value" : "Everything"}</Tag>
            <h3 className="lq-d-sm">With {pl.name}</h3>
            {y && <span className="pub-price"><b>{money(y.amountCents, y.currency)}</b><span>a year</span><Draft note={isDraftPlan(pl)} /></span>}
            <ul>
              {v.priced.map((x) => (
                <li key={x.id}><span><Icon name="check" size="xs" /> {x.name}</span><b>{money(x.cents)}</b></li>
              ))}
              {v.planOnly.map((x) => (
                <li key={x}><span><Icon name="check" size="xs" /> {x}</span><b className="lq-c3">Plan only</b></li>
              ))}
              {v.discounts.map((d) => (
                <li key={d.id}><span><Icon name="sparkle" size="xs" /> {d.pct}% off {d.name}</span><b>−{money(d.cents)}</b></li>
              ))}
            </ul>
            {v.worth > 0 && <p className="pub-meter-note">Programs worth {money(v.worth)}{v.planOnly.length ? " plus the plan-only programs" : ""} if bought one by one.</p>}
            <Button href={signedIn ? `/you/billing?plan=${pl.id}&interval=year` : `/signup?plan=${encodeURIComponent(pl.name.toLowerCase())}`} size="md" variant={i === 0 ? "filled" : "secondary"}>Choose {pl.name}</Button>
          </div>
        );
      })}
    </div>
  );
}
