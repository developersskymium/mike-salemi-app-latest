import { Button, Glass, Icon, ProgressBar } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { dateLong, time } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { Checklist } from "./Checklist";
import { Countdown } from "./Countdown";
import { Gallery } from "./Gallery";
import { Itinerary } from "./Itinerary";
import { Ridge } from "./Ridge";
import { RunHero } from "./RunHero";
import { Facilitators, Faq, SectionHead, Travel } from "./RunParts";
import { SectionNav } from "./SectionNav";

/** Booked member's retreat hub: countdown, preparation, itinerary, travel, gallery, documents, help. */
export function RunHubView({ hub, now = Date.now() }: { hub: RunHub; now?: number }) {
  const { run } = hub;
  const d = run.details;
  const start = new Date(run.starts_at).getTime();
  const end = run.ends_at ? new Date(run.ends_at).getTime() : start + 86400000;
  const during = now >= start && now < end;
  const nowDay = during ? Math.floor((now - start) / 86400000) + 1 : null;
  const prereq = d.prerequisites ?? [];
  const packing = d.packing ?? [];
  const docs = d.documents ?? [];
  const appliedAt = hub.application ? new Date(hub.application.applied_at).getTime() : start - 1000 * 86400 * 120;
  const journey = Math.max(0, Math.min(1, (now - appliedAt) / Math.max(1, start - appliedAt)));
  const realPhotos = run.gallery.filter((g) => !g.stock);

  const sections = [
    { id: "prepare", label: "Prepare" },
    ...(hub.sessions.length ? [{ id: "sessions", label: "Live calls" }] : []),
    { id: "itinerary", label: "Itinerary" },
    { id: "travel", label: "Travel" },
    ...(realPhotos.length ? [{ id: "gallery", label: "Gallery" }] : []),
    { id: "documents", label: "Documents" },
    { id: "help", label: "Help" },
  ];

  return (
    <>
      <RunHero
        hub={hub}
        mode="hub"
        pane={
          <Glass level="clear" radius="hero" className="exp-hero-pane">
            <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.9 }}>{during ? "You’re there" : `Starts ${dateLong(run.starts_at, run.timezone)}`}</div>
            <Countdown startsAt={run.starts_at} endsAt={run.ends_at} />
            {!during && (
              <div className="exp-progress-track">
                <ProgressBar value={journey} tone="white" label="Time until the retreat" />
                <div className="com-between lq-t12" style={{ marginTop: 6, opacity: 0.85 }}>
                  <span>Booked</span>
                  <span>Arrive</span>
                </div>
              </div>
            )}
            <Button block variant="filled" href="#prepare" icon="check" style={{ marginTop: 14 }}>
              {prereq.length + packing.length ? "Continue preparing" : "See what’s next"}
            </Button>
          </Glass>
        }
      />

      <SectionNav sections={sections} />

      <section id="prepare" className="exp-section" aria-label="Prepare">
        <SectionHead title="Prepare" kicker="Before you go" />
        {prereq.length + packing.length ? (
          <div className="exp-check-grid">
            {prereq.length > 0 && <Checklist runId={run.id} title="Prerequisites" items={prereq} initial={hub.checklist} />}
            {packing.length > 0 && <Checklist runId={run.id} title="Packing list" items={packing} initial={hub.checklist} />}
          </div>
        ) : (
          <Glass radius="card" className="exp-note">
            <Ridge className="exp-note-art" />
            <div>
              <div className="lq-t17">Your packing list is on its way</div>
              <p className="lq-t15 lq-c2">{d.checklist_note ?? "Mike’s team shares the packing list and preparation steps in the weeks before the retreat."}</p>
            </div>
          </Glass>
        )}
      </section>

      {hub.sessions.length > 0 && (
        <section id="sessions" className="exp-section" aria-label="Live calls">
          <SectionHead title="Live calls" kicker="With the group" />
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

      <section id="itinerary" className="exp-section" aria-label="Itinerary">
        <SectionHead title="Itinerary" kicker={d.duration_label ?? "Day by day"} />
        {hub.itinerary.length ? (
          <Itinerary items={hub.itinerary} startsAt={run.starts_at} timezone={run.timezone} nowDay={nowDay} />
        ) : (
          <Glass radius="card"><EmptyState icon="calendar" title="The day-by-day is being finalised" body="It appears here as soon as Mike publishes it." /></Glass>
        )}
      </section>

      <section id="travel" className="exp-section" aria-label="Travel">
        <SectionHead title="Travel & stay" kicker="Getting there" />
        <Travel run={run} />
      </section>

      {realPhotos.length > 0 && (
        <section id="gallery" className="exp-section" aria-label="Gallery">
          <SectionHead title="Gallery" kicker="From past retreats" aside={<span className="lq-t13 lq-c2 lq-num">{realPhotos.length} photos</span>} />
          <Gallery photos={run.gallery} />
        </section>
      )}

      <section id="documents" className="exp-section" aria-label="Documents">
        <SectionHead title="Documents" kicker="Forms and guides" />
        {docs.length ? (
          <Glass radius="card" className="com-panel">
            <ul className="com-list" role="list">
              {docs.map((doc) => (
                <li key={doc.url}>
                  <a className="com-li" href={doc.url} target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>
                    <Icon name="bookmark" size="sm" />
                    <span className="com-grow lq-t15">{doc.title}</span>
                    <Icon name="chevron" size="sm" />
                  </a>
                </li>
              ))}
            </ul>
          </Glass>
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

      <section id="help" className="exp-section" aria-label="Help">
        <SectionHead title="Who’s holding the space" kicker="Help" />
        {d.facilitators?.length ? <Facilitators people={d.facilitators} /> : null}
        {d.faq?.length ? <div style={{ marginTop: 16 }}><Faq items={d.faq} /></div> : null}
        {d.aftercare?.length ? (
          <Glass radius="card" className="com-panel" style={{ marginTop: 16 }}>
            <div className="exp-kicker">After the retreat</div>
            <ul className="com-list" role="list" style={{ marginTop: 6 }}>
              {d.aftercare.map((a) => {
                const [head, ...rest] = a.split(" — ");
                return (
                  <li key={a} className="com-li" style={{ alignItems: "flex-start" }}>
                    <Icon name="leaf" size="sm" />
                    <div className="com-grow">
                      <div className="lq-t15" style={{ fontWeight: 600 }}>{head}</div>
                      {rest.length > 0 && <div className="lq-t13 lq-c2">{rest.join(" — ")}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Glass>
        ) : null}
      </section>
    </>
  );
}
