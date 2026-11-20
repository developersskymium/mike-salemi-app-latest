import { Button, EmptyState, Glass, Icon, Rings } from "@/components/ui";
import { dateLong, dateRange, time } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { Checklist } from "./Checklist";
import { Countdown } from "./Countdown";
import { Gallery } from "./Gallery";
import { Itinerary } from "./Itinerary";
import { Ridge } from "./Ridge";
import { RunHero } from "./RunHero";
import { ContextBar, Facilitators, Faq, Heading, Ticks, Travel } from "./RunParts";
import { SectionNav } from "./SectionNav";

/**
 * Booked member's retreat hub, legacy layout L27: context bar → hero card (phase + countdown | preparation)
 * → sticky section tabs → Checklists → Gallery → Location and travel → Itinerary → Guides → Downloads → Integration support.
 * v2 extras slot in without reordering: live group calls after the checklists, FAQ under the guides.
 */
export function RunHubView({ hub, now = Date.now() }: { hub: RunHub; now?: number }) {
  const { run } = hub;
  const d = run.details;
  const start = new Date(run.starts_at).getTime();
  const end = run.ends_at ? new Date(run.ends_at).getTime() : start + 86400000;
  const phase = now < start ? "before" : now < end ? "during" : "after";
  const nowDay = phase === "during" ? Math.floor((now - start) / 86400000) + 1 : null;
  const prereq = d.prerequisites ?? [];
  const packing = d.packing ?? [];
  const all = [...prereq, ...packing];
  const done = all.filter((i) => hub.checklist[i.id]).length;
  const docs = d.documents ?? [];
  const realPhotos = run.gallery.filter((g) => !g.stock);

  const sections = [
    { id: "checklists", label: "Checklists" },
    ...(hub.sessions.length ? [{ id: "sessions", label: "Live calls" }] : []),
    ...(realPhotos.length ? [{ id: "gallery", label: "Gallery" }] : []),
    { id: "travel", label: "Travel" },
    { id: "itinerary", label: "Itinerary" },
    ...(d.facilitators?.length ? [{ id: "guides", label: "Guides" }] : []),
    { id: "documents", label: "Documents" },
    ...(d.aftercare?.length ? [{ id: "integration", label: "Integration" }] : []),
  ];

  return (
    <>
      <ContextBar back="/experiences" backLabel="All retreats" title={`${run.name} — your hub`} meta={dateRange(run.starts_at, run.ends_at, run.timezone)} action={<Button size="sm" variant="glass" href="#checklists" icon="check">Prepare</Button>} />
      <RunHero
        hub={hub}
        mode="hub"
        pane={
          <Glass level="clear" radius="hero" className="exp-hero-pane">
            <div className="exp-phase">{phase === "before" ? "Countdown" : phase === "during" ? "Happening now" : "Integration"}</div>
            {phase === "before" ? (
              <Countdown startsAt={run.starts_at} endsAt={run.ends_at} />
            ) : (
              <p className="lq-t22" style={{ margin: "8px 0 4px" }}>{phase === "during" ? "You’re on the land" : "Welcome home"}</p>
            )}
            <div className="exp-prep">
              <Rings size={62} stroke={7} rings={[{ value: all.length ? done / all.length : 0, tone: 1 }]} label={`Preparation ${done} of ${all.length} done`}>
                <span className="lq-t13 lq-num" style={{ fontWeight: 650 }}>{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
              </Rings>
              <div className="com-grow">
                <div className="lq-t15" style={{ fontWeight: 600 }}>Preparation</div>
                <div className="lq-t13" style={{ opacity: 0.8 }}>{all.length ? `${done} of ${all.length} done` : "Your guide arrives after acceptance"}</div>
              </div>
            </div>
          </Glass>
        }
      />

      <SectionNav sections={sections} />

      <section id="checklists" className="exp-section" aria-labelledby="h-check">
        <Heading eyebrow="Before you travel" title="Your checklists" id="h-check" />
        {all.length ? (
          <div className="exp-check-grid">
            {prereq.length > 0 && <Checklist runId={run.id} title="Prerequisites" items={prereq} initial={hub.checklist} />}
            {packing.length > 0 && <Checklist runId={run.id} title="Packing list" items={packing} initial={hub.checklist} />}
          </div>
        ) : (
          <Glass radius="card" className="exp-note">
            <Ridge className="exp-note-art" />
            <div>
              <div className="lq-t17">Your packing list is on its way</div>
              <p className="lq-t15 lq-c2">{d.checklist_note ?? "Your preparation guide and packing list arrive after acceptance."}</p>
            </div>
          </Glass>
        )}
      </section>

      {hub.sessions.length > 0 && (
        <section id="sessions" className="exp-section" aria-labelledby="h-calls">
          <Heading eyebrow="With the group" title="Live calls" id="h-calls" />
          <Glass radius="card" className="com-panel">
            <ul className="com-list" role="list">
              {hub.sessions.map((s) => {
                const live = now >= new Date(s.starts_at).getTime() && (!s.ends_at || now < new Date(s.ends_at).getTime());
                return (
                  <li key={s.id} className="com-li">
                    <div className="com-grow">
                      <div className="lq-t15" style={{ fontWeight: 600 }}>{s.title}</div>
                      <div className="lq-t13 lq-c2">{dateLong(s.starts_at, run.timezone)} · {time(s.starts_at, run.timezone)}</div>
                    </div>
                    {s.join_url ? (
                      <Button size="sm" variant={live ? "filled" : "glass"} href={s.join_url} target="_blank">{live ? "Join now" : "Join link"}</Button>
                    ) : (
                      <span className="lq-t13 lq-c3">Link coming</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Glass>
        </section>
      )}

      {realPhotos.length > 0 && (
        <section id="gallery" className="exp-section" aria-labelledby="h-gal">
          <Heading eyebrow="What it looks like" title="On the land" id="h-gal" aside={<span className="lq-t13 lq-c2 lq-num">{realPhotos.length} photos</span>} />
          <Gallery photos={run.gallery} />
        </section>
      )}

      <section id="travel" className="exp-section" aria-labelledby="h-travel">
        <Heading eyebrow="Getting there" title="Location and travel" id="h-travel" />
        <Travel run={run} />
      </section>

      <section id="itinerary" className="exp-section" aria-labelledby="h-it">
        <Heading eyebrow={d.duration_label ? `The ${d.duration_label}` : "Day by day"} title="Itinerary" id="h-it" />
        {hub.itinerary.length ? (
          <Itinerary items={hub.itinerary} startsAt={run.starts_at} timezone={run.timezone} nowDay={nowDay} />
        ) : (
          <Glass radius="card"><EmptyState icon="calendar" title="The day-by-day is being finalised" body="It appears here as soon as Mike publishes it." /></Glass>
        )}
      </section>

      {d.facilitators?.length ? (
        <section id="guides" className="exp-section" aria-labelledby="h-guides">
          <Heading eyebrow="Who holds the space" title="Your guides" id="h-guides" />
          <Facilitators people={d.facilitators} />
          {d.faq?.length ? <div style={{ marginTop: 16 }}><Faq items={d.faq} /></div> : null}
        </section>
      ) : null}

      <section id="documents" className="exp-section" aria-labelledby="h-docs">
        <Heading eyebrow="Documents" title="Downloads" id="h-docs" />
        {docs.length ? (
          <div className="exp-docs" data-cols="3">
            {docs.map((doc) => (
              <a key={doc.url} href={doc.url} target="_blank" rel="noopener" className="exp-doc lq-press"><Icon name="down" size="sm" /><span className="com-grow">{doc.title}</span><Icon name="chevron" size="xs" /></a>
            ))}
          </div>
        ) : (
          <Glass radius="card" className="exp-note">
            <span className="exp-note-art" style={{ display: "grid", placeItems: "center" }}><Icon name="bookmark" size="lg" /></span>
            <div>
              <div className="lq-t17">Nothing to sign yet</div>
              <p className="lq-t15 lq-c2">Waivers and the preparation guide land here before the retreat. We&rsquo;ll let you know.</p>
            </div>
          </Glass>
        )}
      </section>

      {d.aftercare?.length ? (
        <section id="integration" className="exp-section" aria-labelledby="h-int">
          <Heading eyebrow="After the retreat" title="Integration support" id="h-int" />
          <Glass radius="card" className="com-panel"><Ticks items={d.aftercare} cols={1} /></Glass>
        </section>
      ) : null}
    </>
  );
}
