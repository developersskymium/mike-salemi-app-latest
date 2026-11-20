import Image from "next/image";
import { Avatar, Button, Icon } from "@/components/ui";
import type { GalleryPhoto, RunHub } from "@/lib/loaders/commerce";
import { MIKE_FACE } from "@/lib/program-photos";
import { MOCK } from "@/lib/mock";
import { photo, type PhotoName } from "@/lib/photos";

/** A retreat photo from the central map (lib/photos). The local preview cannot reach the CDN, so it uses the local stand-in. */
export function retreatPhoto(name: PhotoName): { url: string; caption: string; focal: string } {
  const p = photo(name);
  return { url: MOCK && p.fallback && /^https?:/.test(p.src) ? p.fallback : p.src, caption: p.alt, focal: p.focal };
}

/** Real retreat photos from mikesalemi.io (spec 12 gallery): added to a run's own gallery, never repeated. */
const SITE_PHOTOS: PhotoName[] = ["celebration", "groupGrass", "lodge", "forestWalk", "overlook", "brothers"];
export function withSitePhotos<T extends { url: string; caption: string }>(own: T[]): { url: string; caption: string }[] {
  const seen = new Set(own.map((p) => p.url));
  const extra = SITE_PHOTOS.map(retreatPhoto).filter((p) => !seen.has(p.url) && (seen.add(p.url), true)).map(({ url, caption }) => ({ url, caption }));
  // The run's cover leads; the site's group photos sit in the mosaic; the rest follow.
  return own.length ? [own[0]!, ...extra.slice(0, 2), ...own.slice(1), ...extra.slice(2)] : extra;
}

/* Spec 12 · Retreat page: itinerary timeline, guides, included / not included, live "where next" and help. */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function days(items: RunHub["itinerary"]) {
  const m = new Map<number, RunHub["itinerary"]>();
  for (const i of items) m.set(i.day_index, [...(m.get(i.day_index) ?? []), i]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}
const titleOf = (desc: string | null | undefined) => (desc && desc.includes("·") ? desc.split("·").slice(1).join("·").trim() : null);
const hhmm = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
};

/** Day-by-day timeline: one rail, a photo per day, every practice with its time when Mike has set one. */
export function Timeline({ hub, photos, today, startsAt, tz }: { hub: RunHub; photos: (GalleryPhoto | null)[]; today?: number | null; startsAt: string; tz: string }) {
  const list = days(hub.itinerary);
  const date = (d: number) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(new Date(Date.parse(startsAt) + (d - 1) * 86400000));
  return (
    <ol className="rtp-tl" role="list">
      {list.map(([d, items], n) => {
        const ph = photos[n];
        return (
          <li key={d} className="rtp-tl-day" data-today={today === d ? "" : undefined} data-past={today && d < today ? "" : undefined}>
            <span className="rtp-tl-node lq-num" aria-hidden>{ROMAN[d - 1] ?? d}</span>
            <div className="rtp-tl-body">
              <div className="rtp-tl-head">
                <div>
                  <div className="lq-eyebrow" data-tone={today === d ? "ok" : "accent"}>Day {ROMAN[d - 1] ?? d} · <span className="lq-num">{date(d)}</span>{today === d ? " · Today" : ""}</div>
                  <h3 className="lq-d-xs">{titleOf(items[0]?.description) ?? `Day ${d}`}</h3>
                </div>
                {ph && <span className="rtp-tl-photo"><Image src={ph.url} alt={ph.caption} fill sizes="120px" /></span>}
              </div>
              <ul role="list" className="rtp-tl-items">
                {items.map((i) => (
                  <li key={i.id}>
                    {hhmm(i.starts_at) && <span className="rtp-tl-time lq-num">{hhmm(i.starts_at)}</span>}
                    <span>{i.title}{i.location ? <span className="lq-c2"> · {i.location}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Your guides: photo (or a calm initials placeholder until Mike sends one) and one line each. */
export function Guides({ people }: { people: NonNullable<RunHub["run"]["details"]["facilitators"]> }) {
  return (
    <ul className="rtp-guides" role="list">
      {people.map((f) => {
        const photo = f.photo ?? (/^mike salemi$/i.test(f.name) ? MIKE_FACE : null);
        return (
          <li key={f.name} className="rtp-guide">
            <span className="rtp-guide-photo" data-empty={photo ? undefined : ""}>
              {photo ? <Image src={photo} alt={f.name} fill sizes="(min-width: 1024px) 160px, 40vw" /> : <Avatar name={f.name} size="xl" />}
            </span>
            <b className="lq-t15">{f.name}</b>
            <span className="lq-t13 lq-c2">{f.line ?? f.role}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Included / not included, side by side. */
export function Included({ hub }: { hub: RunHub }) {
  const d = hub.run.details;
  const yes: { t: string; s?: string }[] = [];
  if (hub.prepProgram) yes.push({ t: "Men of Movement pre-retreat program", s: "6 videos across the five pillars. Opens about three months before." });
  if (d.accommodation) yes.push({ t: "Stay and every meal", s: d.accommodation });
  if (d.travel && /pickup/i.test(d.travel)) yes.push({ t: "Airport pickup on Day I" });
  yes.push({ t: "Every practice and ceremony", s: "Qi Gong, breathwork, sweat lodge, fire and circle." });
  for (const x of (d.aftercare ?? []).filter((x) => !/preparation/i.test(x))) {
    const [head, ...rest] = x.split(" — ");
    yes.push({ t: head!, s: rest.join(" — ") || undefined });
  }
  const no = d.not_included ?? [];
  return (
    <div className="rtp-incl">
      <div>
        <div className="rtp-incl-h"><Icon name="check" size="sm" /> Included</div>
        <ul role="list">{yes.map((x) => <li key={x.t}><b>{x.t}</b>{x.s && <span className="lq-c2">{x.s}</span>}</li>)}</ul>
      </div>
      {no.length > 0 && (
        <div data-tone="no">
          <div className="rtp-incl-h"><Icon name="close" size="sm" /> Not included</div>
          <ul role="list">{no.map((x) => <li key={x}><span>{x}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

/**
 * Live mode "where next": the next practice today. Items with a time use it; without times the day is
 * spread from 7 am to 9 pm so the order still moves along as the day goes.
 */
export function whereNext(items: RunHub["itinerary"], tz: string, now: number) {
  if (!items.length) return null;
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(new Date(now));
  const [h, m] = clock.split(":").map(Number);
  const mins = h! * 60 + m!;
  const at = (i: RunHub["itinerary"][number], n: number) => {
    if (i.starts_at) { const [a, b] = i.starts_at.split(":").map(Number); return a! * 60 + b!; }
    return 7 * 60 + Math.round((n * (14 * 60)) / Math.max(1, items.length - 1));
  };
  const idx = items.findIndex((i, n) => at(i, n) >= mins);
  const nowIdx = idx === -1 ? items.length - 1 : Math.max(0, idx - 1);
  return { now: items[nowIdx]!, next: idx === -1 ? null : items[idx]!, nextAt: idx === -1 ? null : hhmm(items[idx]!.starts_at), timed: items.some((i) => i.starts_at) };
}

/** Floating help button while live (phone and desktop): one tap to the team. */
export function HelpFab({ phone }: { phone?: string | null }) {
  return (
    <div className="rtp-fab">
      {phone ? (
        <Button href={`tel:${phone.replace(/\s/g, "")}`} variant="ink" size="md" icon="phone">Help</Button>
      ) : (
        <Button href="#help" variant="ink" size="md" icon="info">Help</Button>
      )}
    </div>
  );
}
