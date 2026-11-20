import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Glass, Icon } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange, dateShort, money } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { Gallery } from "./Gallery";
import { Ridge } from "./Ridge";
import { ContextBar, DayList, Facts, Faq, Heading, Ticks } from "./RunParts";

const OPEN = new Set(["open", "waitlist"]);
const STATUS: Record<string, string> = { open: "Applications open", waitlist: "Waitlist", full: "Full", past: "Finished", upcoming: "Opening soon", cancelled: "Cancelled", draft: "Draft" };

/** Where the member's application stands, with the one next step (sits in the sticky aside). */
function StatusPanel({ hub }: { hub: RunHub }) {
  const a = hub.application;
  if (!a) return null;
  const q = hub.quote;
  const copy: Record<string, { icon: "clock" | "check" | "people" | "close"; title: string; body: string }> = {
    submitted: { icon: "clock", title: "Application received", body: `Sent ${dateShort(a.applied_at)}. Mike’s team reads every one and will reach out to book a short alignment call.` },
    call_booked: { icon: "people", title: "Alignment call booked", body: "A short call with Mike’s team to make sure this is the right time for you." },
    accepted: { icon: "check", title: "You’re accepted", body: "Confirm your place to unlock the retreat hub: preparation, packing, travel and the group." },
    waitlist: { icon: "clock", title: "You’re on the waitlist", body: "You’ll be first to hear when a place opens or the next dates land." },
    declined: { icon: "close", title: "Not this time", body: "This retreat isn’t the right fit right now. Mike’s team will be in touch about other ways to work together." },
    cancelled: { icon: "close", title: "Booking cancelled", body: "Your place for this retreat was cancelled. Reach out if that’s unexpected." },
  };
  const c = copy[a.status] ?? copy.submitted!;
  return (
    <div className="exp-status" role="status">
      <span className="exp-status-icon"><Icon name={c.icon} size="md" /></span>
      <div className="com-grow">
        <div className="lq-t17">{c.title}</div>
        <p className="lq-t13 lq-c2">{c.body}</p>
        {a.status === "accepted" && (
          <div style={{ marginTop: 12 }}>
            {q && q.state === "purchasable" && (
              <p className="lq-t15" style={{ marginBottom: 8 }}>
                <span className="lq-num">{money(q.amount_cents, q.currency)}</span>
                {q.discount_cents > 0 && <span className="lq-c2 lq-num"> (was {money(q.base_cents, q.currency)})</span>}
              </p>
            )}
            <CheckoutButton kind="run" refId={hub.run.id} label="Confirm your place" size="md" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Photo grid hero (legacy RetreatPhotoGrid): one large photo and four around it; the rest live in the gallery below. */
function PhotoGrid({ photos, name }: { photos: { url: string; caption: string }[]; name: string }) {
  const top = photos.slice(0, 5);
  if (!top.length) return null;
  return (
    <div className="exp-mosaic" data-n={top.length}>
      {top.map((p, i) => (
        <figure key={p.url} className="exp-mosaic-cell">
          <Image src={p.url} alt={i === 0 ? `${name}: ${p.caption}` : p.caption} fill priority={i === 0} sizes={i === 0 ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 320px, 50vw"} />
        </figure>
      ))}
      {photos.length > 5 && (
        <a href="#gallery" className="exp-mosaic-more"><Chip variant="clear" icon="sparkle">{photos.length} photos</Chip></a>
      )}
    </div>
  );
}

/** Not booked: legacy retreat page (L25) — context bar, title + photo grid, two columns with a sticky status aside, then the full-width sections. */
export function RunSales({ hub }: { hub: RunHub }) {
  const { run } = hub;
  const d = run.details;
  const open = OPEN.has(run.status);
  const waitlist = run.status === "waitlist";
  const past = run.status === "past";
  const applied = Boolean(hub.application);
  const applyHref = `/experiences/${run.id}/apply`;
  const dates = dateRange(run.starts_at, run.ends_at, run.timezone);
  const place = run.location.city ? `${run.location.city}${run.location.region ? `, ${run.location.region === "California" ? "CA" : run.location.region}` : ""}` : run.location.label ?? "";
  const photos = run.gallery.filter((g) => !g.stock);
  const ctaShort = waitlist ? "Waitlist" : past ? "Finished" : "Apply";
  const ctaLong = waitlist ? "Join the waitlist" : past ? "Retreat finished" : d.cta_label ?? "Apply for your place";
  const max = run.capacity ? `${run.capacity} men max` : null;

  const primary = (block = false, size: "md" | "lg" = "lg") =>
    !open ? (
      <Button block={block} size={size} variant="fill" disabled>{ctaLong}</Button>
    ) : run.requires_application ? (
      <Button block={block} size={size} variant="filled" href={applyHref} iconAfter="chevron">{ctaLong}</Button>
    ) : (
      <CheckoutButton kind="run" refId={run.id} label="Book your place" block={block} />
    );

  return (
    <div className="exp-l25">
      <ContextBar
        back="/experiences"
        backLabel="All retreats"
        title={run.name}
        meta={`${d.season ? `${d.season} · ` : ""}${dates}`}
        action={applied ? <Chip variant="fill">{STATUS[hub.application!.status] ?? "Applied"}</Chip> : open ? (
          <Button size="sm" variant="filled" href={run.requires_application ? applyHref : "#status"}>{ctaShort}</Button>
        ) : <Chip variant="outline">{ctaShort}</Chip>}
      />

      <header className="exp-titleblock">
        <div className="exp-eyebrow-row"><span className="exp-kicker exp-kicker-ink">{d.season ? `${d.season} · ` : ""}Men of Movement</span><DraftChip note={run.draft_note} /></div>
        <h1 className="lq-display">{run.name}</h1>
        {d.tagline && <p className="exp-titleblock-tag">{d.tagline}</p>}
        <ul className="exp-chiprow" role="list">
          {[max, run.location.label ?? place, "Fixed cohort dates", run.requires_application ? "By application" : run.price_note].filter(Boolean).map((t) => (
            <li key={t!}><Chip variant="glass" icon="check">{t}</Chip></li>
          ))}
        </ul>
        <PhotoGrid photos={photos} name={run.name} />
      </header>

      <div className="exp-two">
        <div className="exp-two-main">
          <Facts items={[
            { icon: "calendar", label: "Dates", value: dates },
            { icon: "sparkle", label: "Length", value: d.duration_label ?? "—" },
            { icon: "people", label: "Group", value: max ?? "Small group" },
            { icon: "mountain", label: "Where", value: place || "Shared after acceptance", href: run.location.map_query ? `https://maps.google.com/?q=${encodeURIComponent(run.location.map_query)}` : undefined },
          ]} />

          {d.description && (
            <section className="exp-block" aria-labelledby="what">
              <h2 id="what" className="lq-t22">What this retreat is</h2>
              <p className="exp-lede">{d.description}</p>
            </section>
          )}

          {d.highlights?.length ? (
            <section className="exp-block" aria-labelledby="walk">
              <h2 id="walk" className="lq-t22">What you walk away with</h2>
              <Ticks items={d.highlights} />
            </section>
          ) : null}

          {hub.itinerary.length > 0 && (
            <section className="exp-block" aria-labelledby="days">
              <h2 id="days" className="lq-t22">How the {hub.itinerary.reduce((m, i) => Math.max(m, i.day_index), 0) === 4 ? "four" : ""} days unfold</h2>
              <DayList items={hub.itinerary} />
            </section>
          )}

          {photos.length > 5 && (
            <section id="gallery" className="exp-block" aria-labelledby="more">
              <h2 id="more" className="lq-t22">More from the mountain</h2>
              <Gallery photos={photos.slice(5)} />
            </section>
          )}
        </div>

        <aside id="status" className="exp-aside" aria-label="Your place">
          <Glass radius="card" className="exp-aside-card">
            <div className="com-between">
              <Chip variant={open ? "tint" : "fill"} dot={run.status === "open"}>{STATUS[run.status] ?? run.status}</Chip>
              <DraftChip note={run.draft_note} />
            </div>
            <p className="exp-aside-dates lq-num">{dates}</p>
            <p className="lq-t13 lq-c2">{[d.duration_label, run.price_note].filter(Boolean).join(" · ")}</p>
            {applied ? <StatusPanel hub={hub} /> : <div style={{ marginTop: 16 }}>{primary(true, "lg")}</div>}
            <ul className="exp-aside-notes" role="list">
              {["Dates and itinerary set by Mike’s team", "A short call to talk through fit", "Payment details shared after acceptance"].map((l) => (
                <li key={l}><Icon name="check" size="xs" />{l}</li>
              ))}
            </ul>
          </Glass>
          <Glass radius="card" className="exp-aside-steps">
            <div className="lq-t15" style={{ fontWeight: 600 }}>How it comes together</div>
            <ol role="list">
              {["Send your application.", "Mike’s team calls to talk through fit.", "Accepted men get prep, travel and payment details."].map((s, i) => (
                <li key={s}><span className="lq-num">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </Glass>
        </aside>
      </div>

      <section className="exp-section" aria-labelledby="prep">
        <Heading eyebrow="Before you arrive" title="Preparation" id="prep" />
        {(d.prerequisites?.length ?? 0) + (d.packing?.length ?? 0) > 0 ? (
          <ul className="exp-chiprow" role="list">{[...(d.prerequisites ?? []), ...(d.packing ?? [])].map((i) => <li key={i.id}><Chip variant="glass">{i.label}</Chip></li>)}</ul>
        ) : (
          <p className="exp-measure lq-c2">{d.checklist_note ?? "A detailed guide on what to bring and how to prepare is shared after you’re accepted."}</p>
        )}
      </section>

      {d.facilitators?.length ? (
        <section className="exp-section" aria-labelledby="fac">
          <Heading eyebrow="Who holds the space" title="Facilitators" id="fac" />
          <div className="exp-facgrid">
            {d.facilitators.map((f) => (
              <Glass key={f.name} radius="card" className="exp-fac">
                <span className="exp-fac-mono" aria-hidden>{f.name.split(" ").map((w) => w[0]).filter((c) => c && /[A-Z]/.test(c)).slice(0, 2).join("")}</span>
                <div className="lq-t15" style={{ fontWeight: 600 }}>{f.name}</div>
                <div className="lq-t13 lq-c2">{f.role}</div>
              </Glass>
            ))}
          </div>
        </section>
      ) : null}

      {d.aftercare?.length ? (
        <section className="exp-section" aria-labelledby="after">
          <Heading eyebrow="You do not go home empty" title="After the retreat" id="after" />
          <Ticks items={d.aftercare} cols={1} />
          <Link href="/programs/men-of-movement" className="exp-textlink">Open Men of Movement: Preparation <Icon name="chevron" size="xs" /></Link>
        </section>
      ) : null}

      {d.documents?.length ? (
        <section className="exp-section" aria-labelledby="docs">
          <Heading eyebrow="Paperwork" title="Documents" id="docs" />
          <div className="exp-docs">
            {d.documents.map((doc) => (
              <a key={doc.url} href={doc.url} target="_blank" rel="noopener" className="exp-doc lq-press"><Icon name="down" size="sm" /><span>{doc.title}</span></a>
            ))}
          </div>
        </section>
      ) : null}

      {d.faq?.length ? (
        <section className="exp-section" aria-labelledby="faq">
          <Heading eyebrow="Before you commit" title="Questions men ask" id="faq" />
          <Faq items={d.faq} />
        </section>
      ) : null}

      {!applied && (
        <Glass radius="hero" className="exp-closing">
          <Ridge className="exp-closing-ridge" />
          <h2 className="lq-t28">{open && !waitlist ? `${run.capacity ? `${["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"][run.capacity] ?? run.capacity} places` : "Limited places"}. That’s it.` : past ? "This cohort has happened." : "The room is full for now."}</h2>
          <p className="lq-t15 lq-c2 exp-measure" style={{ textAlign: "center" }}>
            {open && !waitlist ? "Apply and Mike’s team will be in touch to talk through fit, travel and payment." : past ? "See the retreats for the next dates." : "Join the waitlist and you’ll be first to hear when a place opens or the next dates land."}
          </p>
          {past ? <Button variant="glass" href="/experiences" iconAfter="chevron">See the retreats</Button> : primary(false, "md")}
        </Glass>
      )}
    </div>
  );
}
