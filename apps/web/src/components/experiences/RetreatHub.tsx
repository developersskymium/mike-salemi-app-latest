import Image from "next/image";
import Link from "next/link";
import { Avatar, Button, Glass, Icon, ProgressBar, Rings } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateLong, dateRange, dayMonth, time } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import { MIKE_FACE, programPhoto } from "@/lib/program-photos";
import { retreatSteps, runDay, type RetreatStage } from "@/lib/retreat-stage";
import { Checklist } from "./Checklist";
import { Countdown } from "./Countdown";
import { PhotoTour } from "./PhotoTour";
import { byDay, dayTitle, photoFor, ROMAN } from "./RetreatPage";
import { RetreatSteps } from "./RetreatSteps";
import { Guides, HelpFab, retreatPhoto, Timeline, whereNext, withSitePhotos } from "./RetreatParts";
import { PhotoWall } from "./PhotoWall";
import { programHref } from "@/lib/hrefs";
import { Faq } from "./RunParts";
import { requestTime } from "@/lib/request-time";

function Sec({ id, eyebrow, title, aside, children }: { id: string; eyebrow?: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="rt-sec rt-hubsec" aria-labelledby={`${id}-h`}>
      <header className="rt-sec-head">
        <div>
          {eyebrow && <div className="lq-eyebrow" data-tone="accent">{eyebrow}</div>}
          <h2 id={`${id}-h`} className="lq-d-sm">{title}</h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Help({ hub, live }: { hub: RunHub; live?: boolean }) {
  const h = hub.run.details.help ?? {};
  const lead = (hub.run.details.facilitators ?? []).slice(0, live ? 5 : 2);
  return (
    <div className="rt-help">
      <Glass radius="card" className="rt-help-card">
        <div className="lq-t15" style={{ fontWeight: 600 }}>{live ? "On the land" : "Questions before you come"}</div>
        <p className="lq-t13 lq-c2">{h.note ?? (live ? "Find any facilitator, any time. Nobody does this alone." : "Mike’s team answers every question about travel, health and what to bring.")}</p>
        <div className="rt-help-acts">
          {h.phone && <Button size="sm" variant="filled" icon="phone" href={`tel:${h.phone.replace(/\s/g, "")}`}>Call the team</Button>}
          {h.email && <Button size="sm" variant="glass" icon="bell" href={`mailto:${h.email}`}>Email the team</Button>}
          {!h.phone && !h.email && <span className="lq-t12 lq-c3">Team phone and email are added here before the retreat.</span>}
        </div>
        {lead.length > 0 && (
          <ul className="rt-help-people" role="list">
            {lead.map((f) => (
              <li key={f.name}><Avatar name={f.name} src={/^mike salemi$/i.test(f.name) ? MIKE_FACE : undefined} size="md" /><span><b>{f.name}</b><span className="lq-c2">{f.role.split(" · ")[0]}</span></span></li>
            ))}
          </ul>
        )}
      </Glass>
      <Glass radius="card" className="rt-help-card" data-tone="sos">
        <div className="lq-t15 rt-ic-title" style={{ fontWeight: 600 }}><Icon name="info" size="sm" /> In an emergency</div>
        <p className="lq-t13 lq-c2">Call 911 first, then tell the nearest facilitator. The team carries everyone&rsquo;s emergency contact from the application.</p>
        <Button size="sm" variant="glass" icon="phone" href="tel:911">Call 911</Button>
      </Glass>
    </div>
  );
}

/** Booked member's retreat hub: countdown + preparation before, today's plan while live, integration after. */
export function RetreatHub({ hub, stage, now = requestTime() }: { hub: RunHub; stage: Extract<RetreatStage, "booked" | "live" | "after">; now?: number }) {
  const { run, about } = hub;
  const d = run.details;
  const photos = run.gallery.filter((g) => !g.stock);
  const cover = (stage === "booked" ? null : stage === "after" ? retreatPhoto("celebration").url : photoFor(photos, ["group on"], 0)?.url) ?? d.cover ?? photos[0]?.url ?? null;
  const dates = dateRange(run.starts_at, run.ends_at, run.timezone);
  const prereq = d.prerequisites ?? [];
  const packing = d.packing ?? [];
  const all = [...prereq, ...packing];
  const done = all.filter((i) => hub.checklist[i.id]).length;
  const days = byDay(hub.itinerary);
  const today = stage === "live" ? Math.min(Math.max(runDay(run.starts_at, run.timezone, now), 1), days.length || 1) : null;
  const todayItems = today ? days.find(([n]) => n === today)?.[1] ?? [] : [];
  const daysLeft = Math.max(0, Math.floor((Date.parse(run.starts_at) - now) / 86400000));
  const prep = hub.prepProgram;
  const prepDaysLeft = prep ? Math.max(0, Math.ceil((Date.parse(prep.opensAt) - now) / 86400000)) : 0;
  const docs = d.documents ?? [];

  const tabs =
    stage === "booked"
      ? [["prepare", "Prepare"], ["program", "Program"], ["itinerary", "Itinerary"], ["travel", "Travel"], ["documents", "Documents"], ["help", "Help"]]
      : stage === "live"
        ? [["today", "Today"], ["itinerary", "Itinerary"], ["wall", "Photo wall"], ["help", "Help"]]
        : [["integration", "Integration"], ["recap", "Photos"], ["certificate", "Certificate"], ["next", "What’s next"]];
  const dayPhotos = days.map((_, n) => photoFor(photos, [["shared meals"], ["breathwork ceremony"], ["sweat lodge"], ["facing"]][n] ?? [], n));
  const prepHref = prep ? programHref(prep.slug, "course") : "#";
  const next = stage === "live" ? whereNext(todayItems, run.timezone, now) : null;

  return (
    <div className="rt-page rt-hub" data-stage={stage}>
      <nav className="rt-crumbs" aria-label="Breadcrumb">
        <Link href="/experiences" className="rt-crumb lq-press"><Icon name="back" size="xs" />Retreats</Link>
      </nav>

      <section className="rt-hero" aria-labelledby="hub-h">
        {cover && <Image src={cover} alt="" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="rt-hero-img" />}
        <div className="rt-hero-body">
          <div className="rt-hero-top">
            <span className="rt-hero-badge">{stage === "booked" ? <><Icon name="check" size="xs" /> You&rsquo;re booked</> : stage === "live" ? <><i className="rt-live-dot" /> Happening now</> : <><Icon name="sparkle" size="xs" /> Integration</>}</span>
            <DraftChip note={run.draft_note} onPhoto />
          </div>
          <div className="rt-hero-main">
            <div>
              <div className="rt-hero-eyebrow">{[d.track, "Men of Movement"].filter(Boolean).join(" · ")}</div>
              <h1 id="hub-h" className="lq-d-xl">{stage === "after" ? "Welcome home." : run.name}</h1>
              <p className="rt-hero-meta lq-num">{stage === "after" ? `${run.name} · ${dates}` : `${dates} · ${run.location.city ?? run.location.label ?? ""}`}</p>
            </div>
            {stage === "booked" && (
              <div className="rt-hero-count">
                <div className="rt-hero-count-l">Until the mountain</div>
                <Countdown startsAt={run.starts_at} endsAt={run.ends_at} />
              </div>
            )}
            {stage === "live" && today && (
              <div className="rt-hero-count">
                <div className="rt-hero-count-l">Day {ROMAN[today - 1]} of {ROMAN[days.length - 1] ?? days.length}</div>
                <div className="rt-hero-today">{dayTitle(todayItems[0]?.description) ?? "Today"}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {stage === "booked" && (
        <div className="rt-hub-strip">
          <RetreatSteps steps={retreatSteps("booked")} variant="bar" />
          <div className="rt-hub-stats">
            <span><b className="lq-num">{daysLeft}</b> days to go</span>
            <span><b className="lq-num">{all.length ? Math.round((done / all.length) * 100) : 0}%</b> prepared</span>
          </div>
        </div>
      )}

      <nav className="rt-tabs" aria-label="Sections">
        {tabs.map(([id, label]) => <a key={id} href={`#${id}`} className="rt-tab lq-press">{label}</a>)}
      </nav>

      {stage === "booked" && (
        <>
          <Sec id="prepare" eyebrow="Before you travel" title="Your preparation" aside={<DraftChip note={d.checklist_draft_note} />}>
            <div className="rt-prep">
              <Glass radius="card" className="rt-prep-sum">
                <Rings size={112} stroke={12} rings={[{ value: all.length ? done / all.length : 0, tone: 2 }]} label={`Preparation ${done} of ${all.length} done`}>
                  <span className="lq-d-sm lq-num">{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
                </Rings>
                <div>
                  <div className="lq-d-xs">{done === all.length && all.length ? "Ready for the mountain" : `${all.length - done} things left`}</div>
                  <p className="lq-t13 lq-c2">Tick things off as you go. Your progress saves as you tap.</p>
                </div>
              </Glass>
              <div className="rt-prep-lists">
                {prereq.length > 0 && <Checklist runId={run.id} title="Before you come" items={prereq} initial={hub.checklist} />}
                {packing.length > 0 && <Checklist runId={run.id} title="Packing list" items={packing} initial={hub.checklist} />}
                {!all.length && <Glass radius="card" className="rt-empty"><Icon name="clipboard" size="md" /><p className="lq-t15">{d.checklist_note ?? "Your preparation list arrives here soon."}</p></Glass>}
              </div>
            </div>
          </Sec>

          {prep && (
            <Sec id="program" eyebrow="Included with your place" title="The pre-retreat program">
              <Glass radius="card" className="rt-program" data-open={prep.open ? "" : undefined}>
                <div className="rt-program-photo"><Image src={programPhoto(prep.slug).src} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: programPhoto(prep.slug).position }} /></div>
                <div className="rt-program-body">
                  <div className="lq-eyebrow" data-tone={prep.open ? "accent" : "warm"}>{prep.open ? "Open now" : `Opens ${dayMonth(prep.opensAt, run.timezone)}`}</div>
                  <h3 className="lq-d-sm">{prep.name}</h3>
                  <p className="lq-t15 lq-c2">Six videos across the five pillars{about.pillars.length ? ` (${about.pillars.join(", ")})` : ""}, so you arrive already practising. Lifetime access.</p>
                  {prep.open ? (
                    <Button href={prepHref} variant="filled" size="md" icon="play">Start the program</Button>
                  ) : (
                    <div className="rt-program-lock">
                      <div className="com-between"><span className="lq-t13 rt-ic-title"><Icon name="lock" size="xs" /> <span>Unlocks in <b className="lq-num">{prepDaysLeft}</b> days</span></span><span className="lq-t12 lq-c3">about 3 months before</span></div>
                      <ProgressBar value={Math.max(0.04, 1 - prepDaysLeft / Math.max(prepDaysLeft, 180))} tone="warm" size="thin" label="Time until the program opens" />
                    </div>
                  )}
                </div>
              </Glass>
            </Sec>
          )}

          {days.length > 0 && <Sec id="itinerary" eyebrow={d.duration_label ? `The ${d.duration_label}` : "Day by day"} title="Itinerary"><Timeline hub={hub} photos={dayPhotos} startsAt={run.starts_at} tz={run.timezone} /></Sec>}

          <Sec id="travel" eyebrow="Getting there" title="Travel and stay">
            <div className="rt-where">
              {photoFor(photos, ["venue"], 1) && <div className="rt-where-photo"><Image src={photoFor(photos, ["venue"], 1)!.url} alt="" fill sizes="(min-width: 1024px) 320px, 100vw" /></div>}
              <div className="rt-where-body">
                <div className="lq-t17" style={{ fontWeight: 650 }}>{run.location.label}</div>
                {run.location.address && <p className="lq-t13 lq-c2">{run.location.address}</p>}
                <ul className="rt-where-list" role="list">
                  {d.travel && <li><Icon name="route" size="sm" /><span><b>Getting there</b> {d.travel}</span></li>}
                  {d.accommodation && <li><Icon name="moon" size="sm" /><span><b>Stay</b> {d.accommodation}</span></li>}
                  {d.travel_time && <li><Icon name="map" size="sm" /><span><b>Travel time</b> {d.travel_time}</span></li>}
                  <li><Icon name="calendar" size="sm" /><span><b>Arrive</b> {dateLong(run.starts_at, run.timezone)}{run.ends_at ? ` · leave ${dateLong(run.ends_at, run.timezone)}` : ""}</span></li>
                </ul>
                {run.location.map_query && <Button size="sm" variant="glass" icon="map" href={`https://maps.google.com/?q=${encodeURIComponent(run.location.map_query)}`} target="_blank" rel="noopener">Open in Maps</Button>}
              </div>
            </div>
          </Sec>

          <Sec id="documents" eyebrow="Paperwork" title="Documents">
            {docs.length ? (
              <ul className="rt-docs" role="list">
                {docs.map((doc) => <li key={doc.url}><a href={doc.url} target="_blank" rel="noopener" className="rt-doc lq-press"><Icon name="file" size="sm" /><span className="com-grow">{doc.title}</span><Icon name="download" size="sm" /></a></li>)}
              </ul>
            ) : (
              <Glass radius="card" className="rt-empty"><Icon name="file" size="md" /><div><b>Nothing to sign yet</b><p className="lq-t13 lq-c2">Waivers and the preparation guide land here before the retreat. We&rsquo;ll let you know.</p></div></Glass>
            )}
          </Sec>

          {d.facilitators?.length ? <Sec id="guides" eyebrow="Who holds the space" title="Your guides"><Guides people={d.facilitators} /></Sec> : null}
          <Sec id="help" eyebrow="We’re here" title="Help and contacts"><Help hub={hub} /></Sec>
          {d.faq?.length ? <Sec id="faq" eyebrow="Good to know" title="Questions men ask"><Faq items={d.faq} /></Sec> : null}
        </>
      )}

      {stage === "live" && (
        <>
          <Sec id="today" eyebrow={today ? `Day ${ROMAN[today - 1]} · ${dateLong(new Date(now).toISOString(), run.timezone)}` : "Today"} title={dayTitle(todayItems[0]?.description) ?? "Today on the land"}>
            <Glass radius="card" className="rt-today">
              <ol role="list">
                {todayItems.map((i, n) => (
                  <li key={i.id} data-first={n === 0 ? "" : undefined}>
                    <span className="rt-today-dot" aria-hidden />
                    <div>
                      <b>{i.title}</b>
                      {(i.starts_at || i.location) && <span className="lq-t13 lq-c2">{[i.starts_at?.slice(0, 5), i.location].filter(Boolean).join(" · ")}</span>}
                    </div>
                  </li>
                ))}
                {!todayItems.length && <li><div><b>Free time on the land</b></div></li>}
              </ol>
            </Glass>
            {next && (
              <div className="rtp-next" role="status">
                <div><span className="lq-eyebrow" data-tone="ok">Now</span><b>{next.now.title}</b></div>
                {next.next && <div><span className="lq-eyebrow" data-tone="accent">Where next{next.nextAt ? ` · ${next.nextAt}` : ""}</span><b>{next.next.title}</b><span className="lq-t12 lq-c2">{next.next.location ?? run.location.venue ?? "On the land"}{next.timed ? "" : " · times on the day"}</span></div>}
              </div>
            )}
            {hub.sessions.length > 0 && (
              <ul className="rt-docs" role="list" style={{ marginTop: 12 }}>
                {hub.sessions.map((s) => <li key={s.id}><a href={s.join_url ?? "#"} className="rt-doc lq-press"><Icon name="video" size="sm" /><span className="com-grow">{s.title} · {time(s.starts_at, run.timezone)}</span><Icon name="external" size="sm" /></a></li>)}
              </ul>
            )}
          </Sec>
          {days.length > 0 && <Sec id="itinerary" eyebrow="The whole arc" title="Itinerary"><Timeline hub={hub} photos={dayPhotos} today={today} startsAt={run.starts_at} tz={run.timezone} /></Sec>}
          <Sec id="wall" eyebrow="Shared by the group" title="Photo wall" aside={<span className="lq-t13 lq-c2 lq-num">{hub.wall.length} photos</span>}><PhotoWall runId={run.id} photos={hub.wall} /></Sec>
          <Sec id="help" eyebrow="We’re here" title="Help and contacts"><Help hub={hub} live /></Sec>
          <HelpFab phone={d.help?.phone} />
        </>
      )}

      {stage === "after" && (
        <>
          <Sec id="integration" eyebrow="Unlocked" title="After the mountain">
            <Glass radius="card" className="rt-unlock">
              <div className="rt-unlock-badge" aria-hidden><Icon name="unlock" size="lg" /></div>
              <div className="rt-unlock-body">
                <div className="lq-eyebrow" data-tone="ok">Post-retreat module · open now</div>
                <h3 className="lq-d-sm">Integration</h3>
                <p className="lq-t15 lq-c2">The work keeps landing for weeks. Keep the practices going and stay close to the men you went through it with.</p>
                <ul className="rt-unlock-list" role="list">
                  {(d.aftercare ?? []).filter((x) => !/preparation/i.test(x)).map((x) => {
                    const [head, ...rest] = x.split(" — ");
                    return <li key={x}><Icon name="check" size="xs" /><span><b>{head}</b>{rest.length ? <span className="lq-c2"> · {rest.join(" — ")}</span> : null}</span></li>;
                  })}
                </ul>
                {prep && <Button href={prepHref} variant="filled" size="md" icon="play">Open your practices</Button>}
              </div>
            </Glass>
          </Sec>
          <Sec id="recap" eyebrow="Your retreat" title="The photos" aside={<span className="lq-t13 lq-c2 lq-num">{hub.wall.length || photos.length} photos</span>}>
            <div className="rt-recap">
              <div><b className="lq-d-lg lq-num">{days.length || 4}</b><span>days on the mountain</span></div>
              <div><b className="lq-d-lg lq-num">{hub.itinerary.length}</b><span>practices and ceremonies</span></div>
              <div><b className="lq-d-lg lq-num">{run.capacity ?? 20}</b><span>men in the circle</span></div>
            </div>
            {hub.wall.length > 0 ? <PhotoWall runId={run.id} photos={hub.wall} /> : <PhotoTour photos={withSitePhotos(photos)} name={run.name} priority={false} />}
          </Sec>
          <Sec id="certificate" eyebrow="Moments with Mike" title="Your certificate">
            <Glass radius="card" className="rtp-cert">
              <span className="rtp-cert-medal" aria-hidden><Icon name="medal" size="lg" /></span>
              <div className="com-grow">
                <b className="lq-d-xs">{run.name}</b>
                <p className="lq-t13 lq-c2">{hub.certificate ? `Completed ${dates}. Share it or keep it.` : "Mike’s team issues every man’s certificate within a week of the retreat."}</p>
              </div>
              {hub.certificate && hub.certificate.id !== "preview" ? <Button href={`/you/certificates/${hub.certificate.id}`} variant="glass" size="sm" icon="download">View certificate</Button> : hub.certificate ? <Button href="/you" variant="glass" size="sm" icon="medal">See it in You</Button> : null}
            </Glass>
          </Sec>
          <Sec id="next" eyebrow="Beyond the summit" title="Keep the momentum">
            <div className="rt-next">
              <Link href="/coaching" className="rt-next-card lq-press">
                <div className="rt-next-photo"><Image src={programPhoto("coaching").src} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: programPhoto("coaching").position }} /></div>
                <div><div className="lq-eyebrow" data-tone="accent">1:1 with Mike</div><b className="lq-d-xs">Coaching</b><p className="lq-t13 lq-c2">Physical performance and inner work, 45 minutes on Tuesdays.</p></div>
              </Link>
              <Link href="/experiences" className="rt-next-card lq-press">
                <div className="rt-next-photo"><Image src={retreatPhoto("celebration").url} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: retreatPhoto("celebration").focal }} /></div>
                <div><div className="lq-eyebrow" data-tone="warm">Come back deeper</div><b className="lq-d-xs">The next retreat</b><p className="lq-t13 lq-c2">About half the men return for a second round.</p></div>
              </Link>
              <Link href="/you/referrals" className="rt-next-card rtp-brother lq-press">
                <div className="rt-next-photo"><Image src={retreatPhoto("brothers").url} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: retreatPhoto("brothers").focal }} /></div>
                <div><div className="lq-eyebrow" data-tone="ok">Referral</div><b className="lq-d-xs">Bring a brother next time</b><p className="lq-t13 lq-c2">Send your link to the man who needs this. You both get a month on Mike.</p></div>
              </Link>
            </div>
          </Sec>
        </>
      )}
    </div>
  );
}
