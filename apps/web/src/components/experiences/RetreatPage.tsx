import Image from "next/image";
import Link from "next/link";
import { Avatar, Button, Glass, Icon, type IconName } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange } from "@/components/commerce/format";
import type { GalleryPhoto, RunHub } from "@/lib/loaders/commerce";
import { MIKE_FACE } from "@/lib/program-photos";
import type { RetreatStage } from "@/lib/retreat-stage";
import { BookingBar, BookingCard } from "./BookingCard";
import { Faq } from "./RunParts";
import { PhotoTour } from "./PhotoTour";

/* ------------------------------------------------------------------ helpers shared with the hub */

/** A real photo whose caption matches one of the words (cycles through the rest as a fallback). */
export function photoFor(photos: GalleryPhoto[], words: string[], i = 0): GalleryPhoto | null {
  const hit = photos.find((p) => words.some((w) => p.caption.toLowerCase().includes(w)));
  return hit ?? photos[i % Math.max(1, photos.length)] ?? null;
}

export function dayTitle(desc: string | null | undefined) {
  return desc && desc.includes("·") ? desc.split("·").slice(1).join("·").trim() : null;
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export function byDay(items: RunHub["itinerary"]) {
  const days = new Map<number, RunHub["itinerary"]>();
  for (const i of items) days.set(i.day_index, [...(days.get(i.day_index) ?? []), i]);
  return [...days.entries()].sort((a, b) => a[0] - b[0]);
}

const DAY_WORDS: string[][] = [["shared meals"], ["breathwork ceremony"], ["sweat lodge"], ["facing"]];

const PILLARS: Record<string, { line: string; words: string[]; icon: IconName }> = {
  rotation: { line: "Pillar name from Mike’s notes; the full description is on its way.", words: ["circle", "group"], icon: "repeat" },
  movement: { line: "Daily Qi Gong and team training, scaled to every body.", words: ["qi gong"], icon: "kettlebell" },
  breathwork: { line: "The somatic breathwork ceremony: the largest release of the retreat.", words: ["breathwork"], icon: "wind" },
  nature: { line: "Mount Shasta, the creek plunge and days on the land.", words: ["facing", "walking"], icon: "mountain" },
  storywork: { line: "Fire, circle and the stories men carry, said out loud.", words: ["fire"], icon: "flame" },
};

function Section({ id, eyebrow, title, aside, children }: { id: string; eyebrow?: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rt-sec" aria-labelledby={id}>
      <header className="rt-sec-head">
        <div>
          {eyebrow && <div className="lq-eyebrow" data-tone="accent">{eyebrow}</div>}
          <h2 id={id} className="lq-d-sm">{title}</h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Facilitators({ people }: { people: NonNullable<RunHub["run"]["details"]["facilitators"]> }) {
  return (
    <ul className="rt-facs" role="list">
      {people.map((f) => (
        <li key={f.name} className="rt-fac">
          <Avatar name={f.name} src={/^mike salemi$/i.test(f.name) ? MIKE_FACE : undefined} size="lg" />
          <div>
            <div className="lq-t15" style={{ fontWeight: 650 }}>{f.name}</div>
            <div className="lq-t13 lq-c2">{f.role}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "How the four days unfold": photo day cards (scroll on phones). */
export function DayCards({ hub, photos, today }: { hub: RunHub; photos: GalleryPhoto[]; today?: number | null }) {
  const used = new Set<string>();
  const pick = (n: number) => {
    const hit = photoFor(photos.filter((p) => !used.has(p.url)), DAY_WORDS[n] ?? [], n);
    if (hit) used.add(hit.url);
    return hit;
  };
  return (
    <ol className="rt-daycards" role="list">
      {byDay(hub.itinerary).map(([d, items], n) => {
        const ph = pick(n);
        return (
          <li key={d} className="rt-daycard" data-today={today === d ? "" : undefined}>
            <div className="rt-daycard-photo">
              {ph && <Image src={ph.url} alt={ph.caption} fill sizes="(min-width: 1024px) 260px, 70vw" />}
              <span className="rt-daycard-n">Day {ROMAN[d - 1] ?? d}{today === d ? " · Today" : ""}</span>
            </div>
            <div className="rt-daycard-body">
              <h3 className="lq-d-xs">{dayTitle(items[0]?.description) ?? `Day ${d}`}</h3>
              <ul role="list">{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ the retreat page (not booked) */

export function RetreatPage({ hub, stage }: { hub: RunHub; stage: RetreatStage }) {
  const { run, about } = hub;
  const d = run.details;
  const photos = run.gallery.filter((g) => !g.stock);
  const dates = dateRange(run.starts_at, run.ends_at, run.timezone);
  const place = run.location.city ? `${run.location.city}, ${run.location.region === "California" ? "California" : run.location.region ?? ""}` : run.location.label ?? "";
  const venue = photoFor(photos, ["venue", "golden"], 1);
  const rhythm = about.rhythm;
  const fac = d.facilitators ?? [];
  const mike = fac.find((f) => /mike/i.test(f.name));

  return (
    <div className="rt-page">
      <nav className="rt-crumbs" aria-label="Breadcrumb">
        <Link href="/experiences" className="rt-crumb lq-press"><Icon name="back" size="xs" />Retreats</Link>
      </nav>

      <header className="rt-head">
        <div className="rt-head-eyebrow">
          <span className="lq-eyebrow" data-tone="accent">{[d.track, d.season, "Men of Movement"].filter(Boolean).join(" · ")}</span>
          <DraftChip note={run.draft_note} />
        </div>
        <h1 className="lq-d-xl">{run.name}</h1>
        <p className="rt-head-meta">
          <span className="lq-num">{dates}</span>
          {place && <><span aria-hidden>·</span><span>{place}</span></>}
          {run.capacity && <><span aria-hidden>·</span><span>{run.capacity} men max</span></>}
          {run.requires_application && <><span aria-hidden>·</span><span>By application</span></>}
        </p>
      </header>

      <PhotoTour photos={photos} name={run.name} />

      <div className="rt-cols" data-stage={stage}>
        <div className="rt-main">
          <div className="rt-host">
            <div>
              <h2 className="lq-d-xs">{d.duration_label ? `${d.duration_label} in ${run.location.city ?? "Mount Shasta"}` : "Hosted by Mike Salemi"}</h2>
              <p className="lq-t15 lq-c2">Hosted by Mike Salemi{fac.length > 1 ? ` and ${fac.length - 1} facilitators` : ""} · {run.capacity ?? 20} men · fixed dates</p>
            </div>
            <Avatar name="Mike Salemi" src={MIKE_FACE} size="xl" />
          </div>

          {d.highlights?.length ? (
            <ul className="rt-highlights" role="list">
              {d.highlights.map((h, i) => {
                const [head, ...rest] = h.split(" — ");
                const icon: IconName = (["kettlebell", "wind", "flame", "heart"] as IconName[])[i % 4]!;
                return (
                  <li key={h}>
                    <span className="rt-hl-icon" aria-hidden><Icon name={icon} size="md" /></span>
                    <div><b>{head}</b>{rest.length > 0 && <span className="lq-c2"> · {rest.join(" — ")}</span>}</div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {d.description && (
            <section className="rt-sec rt-about" aria-label="About this retreat">
              {d.tagline && <p className="rt-tagline">{d.tagline}</p>}
              <p className="rt-lede">{d.description}</p>
            </section>
          )}

          {about.pillars.length > 0 && (
            <Section id="pillars" eyebrow="What the work rests on" title="The five pillars" aside={<DraftChip note={about.pillarsDraftNote} />}>
              <ul className="rt-pillars" role="list">
                {about.pillars.map((p, i) => {
                  const meta = PILLARS[p.toLowerCase()] ?? { line: "", words: [], icon: "sparkle" as IconName };
                  const ph = photoFor(photos, meta.words, i);
                  return (
                    <li key={p} className="rt-pillar">
                      <div className="rt-pillar-photo">{ph && <Image src={ph.url} alt="" fill sizes="(min-width: 1024px) 200px, 45vw" />}<span className="rt-pillar-n lq-num">{String(i + 1).padStart(2, "0")}</span></div>
                      <div className="rt-pillar-body"><b className="lq-d-xs">{p}</b><span className="lq-t13 lq-c2">{meta.line}</span></div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {rhythm && (
            <Section id="rhythm" eyebrow="Every day" title="The daily rhythm">
              <ol className="rt-rhythm" role="list">
                {[
                  { k: "Morning", t: "Move", w: ["qi gong"], s: "Qi Gong and team training to wake the body." },
                  { k: "Afternoon", t: "Go inward", w: ["breathwork", "circle room"], s: "Breathwork, ceremony and the deeper work." },
                  { k: "Evening", t: "Fire, food and circle", w: ["fire", "meal"], s: "Shared meals and the fire, every night." },
                ].map((r, i) => {
                  const ph = photoFor(photos, r.w, i + 3);
                  return (
                    <li key={r.k} className="rt-rhythm-item">
                      <div className="rt-rhythm-photo">{ph && <Image src={ph.url} alt={ph.caption} fill sizes="(min-width: 1024px) 240px, 80vw" />}</div>
                      <div className="lq-eyebrow" data-tone="warm">{r.k}</div>
                      <b className="lq-d-xs">{r.t}</b>
                      <span className="lq-t13 lq-c2">{r.s}</span>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          {hub.itinerary.length > 0 && (
            <Section id="days" eyebrow="Day by day" title={`How the ${byDay(hub.itinerary).length === 4 ? "four " : ""}days unfold`}>
              <DayCards hub={hub} photos={photos} />
            </Section>
          )}

          <Section id="where" eyebrow="Where you’ll be" title={run.location.venue ?? "The venue"}>
            <div className="rt-where">
              {venue && (
                <div className="rt-where-photo"><Image src={venue.url} alt={venue.caption} fill sizes="(min-width: 1024px) 320px, 100vw" /></div>
              )}
              <div className="rt-where-body">
                <div className="lq-t17" style={{ fontWeight: 650 }}>{run.location.label}</div>
                {run.location.address && <p className="lq-t13 lq-c2">{run.location.address}</p>}
                <ul className="rt-where-list" role="list">
                  {d.accommodation && <li><Icon name="moon" size="sm" /><span><b>Stay</b> {d.accommodation}</span></li>}
                  {d.travel && <li><Icon name="route" size="sm" /><span><b>Getting there</b> {d.travel}</span></li>}
                  <li><Icon name="clock" size="sm" /><span><b>Time zone</b> {run.timezone.replace("America/", "").replace("_", " ")} (Pacific)</span></li>
                </ul>
                {run.location.map_query && (
                  <Button size="sm" variant="glass" icon="map" href={`https://maps.google.com/?q=${encodeURIComponent(run.location.map_query)}`} target="_blank" rel="noopener">Open in Maps</Button>
                )}
              </div>
            </div>
          </Section>

          <Section id="fit" eyebrow="Before you apply" title="Who it’s for, and what it isn’t">
            <div className="rt-fit">
              <div className="rt-fit-col" data-tone="ok">
                <div className="lq-t15" style={{ fontWeight: 600 }}>It&rsquo;s for you if</div>
                <ul role="list">
                  <li>You need four days away from everything, with the right men around you</li>
                  <li>You&rsquo;re new to this work. About half the men are</li>
                  <li>You&rsquo;re coming back for a deeper round</li>
                  <li>You&rsquo;re single, partnered, a father, or not: the work starts with you</li>
                </ul>
              </div>
              <div className="rt-fit-col" data-tone="no">
                <div className="lq-t15" style={{ fontWeight: 600 }}>What it isn&rsquo;t</div>
                <ul role="list">
                  <li>No performance. Everything is scaled to meet you where you are</li>
                  <li>No forcing. You decide how far you go</li>
                  <li>Not a boot camp, and not just talk: the training is real, and so is the inner work</li>
                </ul>
              </div>
            </div>
          </Section>

          {fac.length > 0 && (
            <Section id="fac" eyebrow="Who holds the space" title="Your facilitators">
              <Facilitators people={fac} />
            </Section>
          )}

          <Section id="incl" eyebrow="What your place includes" title="Before, during and after">
            <ul className="rt-incl" role="list">
              {hub.prepProgram && (
                <li><span className="rt-incl-i"><Icon name="play" size="sm" /></span><div><b>{hub.prepProgram.name}</b><span className="lq-c2">{hub.prepProgram.lessons} lessons of breathwork and meditation. Opens about three months before the retreat.</span></div></li>
              )}
              {d.accommodation && <li><span className="rt-incl-i"><Icon name="heart" size="sm" /></span><div><b>Stay and every meal</b><span className="lq-c2">{d.accommodation}</span></div></li>}
              {d.travel && /pickup/i.test(d.travel) && <li><span className="rt-incl-i"><Icon name="route" size="sm" /></span><div><b>Airport pickup</b><span className="lq-c2">On Day I.</span></div></li>}
              {(d.aftercare ?? []).filter((x) => !/preparation/i.test(x)).map((x) => {
                const [head, ...rest] = x.split(" — ");
                return <li key={x}><span className="rt-incl-i"><Icon name="check" size="sm" /></span><div><b>{head}</b>{rest.length > 0 && <span className="lq-c2">{rest.join(" — ")}</span>}</div></li>;
              })}
            </ul>
          </Section>

          {d.faq?.length ? (
            <Section id="faq" eyebrow="Before you commit" title="Questions men ask">
              <Faq items={d.faq} />
            </Section>
          ) : null}

          {mike && stage === "sales" && (
            <Glass radius="card" className="rt-closing">
              <Image src={photoFor(photos, ["group"], 0)?.url ?? photos[0]!.url} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="rt-closing-img" />
              <div className="rt-closing-body">
                <h2 className="lq-d-md">{run.capacity ? `${run.capacity} places. That’s it.` : "Limited places."}</h2>
                <p>Apply in five minutes. Nothing is charged until Mike says yes.</p>
                <Button href={`/experiences/${run.id}/apply`} variant="white" size="md" iconAfter="arrowRight">Apply for {dates}</Button>
              </div>
            </Glass>
          )}
        </div>

        <aside className="rt-aside" aria-label="Your place">
          <BookingCard hub={hub} stage={stage} />
        </aside>
      </div>

      {["sales", "applied", "call", "pay"].includes(stage) && <BookingBar hub={hub} stage={stage} />}
    </div>
  );
}
