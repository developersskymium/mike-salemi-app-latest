import { Button, Chip, Glass, Icon } from "@/components/ui";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateShort, money } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { Gallery } from "./Gallery";
import { Itinerary } from "./Itinerary";
import { RunHero } from "./RunHero";
import { Facilitators, Faq, SectionHead, Travel } from "./RunParts";

const OPEN = new Set(["open", "waitlist"]);

/** Where the member's application stands, with the one next step. */
function StatusPanel({ hub }: { hub: RunHub }) {
  const a = hub.application;
  if (!a) return null;
  const q = hub.quote;
  const copy: Record<string, { icon: "clock" | "check" | "people" | "close"; title: string; body: string }> = {
    submitted: { icon: "clock", title: "Application received", body: `Sent ${dateShort(a.applied_at)}. Mike’s team reads every one and will reach out to book a short alignment call.` },
    call_booked: { icon: "people", title: "Alignment call booked", body: "A short call with Mike’s team to make sure this is the right time for you." },
    accepted: { icon: "check", title: "You’re accepted", body: "Confirm your place to unlock the retreat hub: preparation, packing, travel and the group." },
    waitlist: { icon: "clock", title: "You’re on the waitlist", body: "We’ll let you know the moment a place opens." },
    declined: { icon: "close", title: "Not this time", body: "This retreat isn’t the right fit right now. Mike’s team will be in touch about other ways to work together." },
    cancelled: { icon: "close", title: "Booking cancelled", body: "Your place for this retreat was cancelled. Reach out if that’s unexpected." },
  };
  const c = copy[a.status] ?? copy.submitted!;
  return (
    <Glass radius="card" className="exp-status" role="status">
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
    </Glass>
  );
}

/** Not booked: the run's story, with apply (or status) as the one action. */
export function RunSales({ hub }: { hub: RunHub }) {
  const { run } = hub;
  const d = run.details;
  const open = OPEN.has(run.status);
  const waitlist = run.status === "waitlist";
  const applied = Boolean(hub.application);
  const applyHref = `/experiences/${run.id}/apply`;
  const ctaLabel = waitlist ? "Join the waitlist" : d.cta_label ?? "Apply";

  const pane = !applied ? (
    <Glass level="clear" radius="hero" className="exp-hero-pane">
      <div className="com-between">
        <div>
          <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.9 }}>{run.capacity ? `${run.capacity} places` : "Limited places"}</div>
          <div className="lq-t20">{run.requires_application ? "Apply to join" : run.price_note ?? "Booking open"}</div>
        </div>
        {waitlist ? <Chip variant="clear">Waitlist</Chip> : run.status === "full" ? <Chip variant="clear">Full</Chip> : null}
      </div>
      {open ? (
        run.requires_application ? (
          <Button block variant="filled" href={applyHref} icon="sparkle" style={{ marginTop: 14 }}>{ctaLabel}</Button>
        ) : (
          <CheckoutButton kind="run" refId={run.id} label="Book your place" block className="exp-mt" />
        )
      ) : (
        <p className="lq-t15" style={{ marginTop: 10, opacity: 0.92 }}>{run.status === "past" ? "This retreat has happened." : "Applications for this date are closed."}</p>
      )}
      <p className="lq-t12" style={{ marginTop: 10, opacity: 0.82, textAlign: "center" }}>Nothing is charged when you apply.</p>
    </Glass>
  ) : undefined;

  return (
    <>
      <RunHero hub={hub} mode="sales" pane={pane} />
      <StatusPanel hub={hub} />

      {d.description && (
        <section className="exp-section" aria-label="About">
          <SectionHead title="Why this retreat" kicker={d.season} aside={<DraftChip note={run.draft_note} />} />
          <p className="exp-lede">{d.description}</p>
        </section>
      )}

      {d.highlights?.length ? (
        <section className="exp-section" aria-label="Highlights">
          <SectionHead title="What you’ll go through" kicker="Highlights" />
          <div className="exp-highlights">
            {d.highlights.map((h, i) => {
              const [head, tail] = h.split(" — ");
              return (
                <Glass key={h} radius="panel" className="exp-highlight">
                  <span className="exp-highlight-i">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="lq-t15" style={{ fontWeight: 600 }}>{head}</div>
                    {tail && <div className="lq-t13 lq-c2">{tail}</div>}
                  </div>
                </Glass>
              );
            })}
          </div>
        </section>
      ) : null}

      {hub.itinerary.length > 0 && (
        <section className="exp-section" aria-label="Itinerary">
          <SectionHead title="The arc of the days" kicker={d.duration_label ?? "Itinerary"} />
          <Itinerary items={hub.itinerary} startsAt={run.starts_at} timezone={run.timezone} />
        </section>
      )}

      {run.gallery.some((g) => !g.stock) && (
        <section className="exp-section" aria-label="Gallery">
          <SectionHead title="On the mountain" kicker="Gallery" />
          <Gallery photos={run.gallery} />
        </section>
      )}

      {d.facilitators?.length ? (
        <section className="exp-section" aria-label="Facilitators">
          <SectionHead title="Who holds the space" kicker="Facilitators" />
          <Facilitators people={d.facilitators} />
        </section>
      ) : null}

      <section className="exp-section" aria-label="Where">
        <SectionHead title="Where" kicker="Travel & stay" />
        <Travel run={run} />
      </section>

      {d.faq?.length ? (
        <section className="exp-section" aria-label="Questions">
          <SectionHead title="Questions men ask" kicker="FAQ" />
          <Faq items={d.faq} />
        </section>
      ) : null}

      {open && !applied && (
        <Glass radius="card" className="exp-cta-band">
          <Icon name="mountain" size="lg" />
          <h2 className="lq-t22">{run.name}</h2>
          <p className="lq-t15 lq-c2">{run.capacity ? `${run.capacity} men. ` : ""}{run.requires_application ? "Every application is read by Mike’s team." : ""}</p>
          {run.requires_application ? (
            <Button variant="glass" href={applyHref} iconAfter="chevron" style={{ marginTop: 8 }}>{ctaLabel}</Button>
          ) : (
            <CheckoutButton kind="run" refId={run.id} label="Book your place" variant="glass" />
          )}
        </Glass>
      )}
    </>
  );
}
