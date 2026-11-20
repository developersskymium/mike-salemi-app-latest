"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Chip, Icon, Segmented } from "@/components/ui";
import { openScheduleWeeks, saveProgramMerch, saveSiteCopy, setApplicationStatus, type Merch } from "@/lib/studio/actions";
import { APPLICATION_STATUS } from "@/lib/studio/tables";
import { useRun } from "./forms";

/* --------------------------------------------------------------- Merchandising + live card */

export const VERTICALS = [
  { value: "mastery", label: "Kettlebell Mastery" },
  { value: "athletic", label: "Athletic Performance" },
  { value: "mind-body", label: "Mind-Body, Longevity & Retreats" },
] as const;

type ProgramCard = {
  id: string; name: string; summary: string | null; image: string | null; is_free: boolean; is_listed: boolean; position: number;
  highlights: string[]; instructor: string | null; sections: number; lessons: number; sectionLabel: string; lessonLabel: string;
  meta: { cta_label?: string; badge?: string; offer?: string; vertical?: string; featured?: boolean };
};

const plural = (n: number, w: string) => `${n} ${w.toLowerCase()}${n === 1 ? "" : "s"}`;

/** Legacy admin "Pricing, offers & placement": grouped fields beside a live catalog card. */
export function MerchEditor({ p }: { p: ProgramCard }) {
  const [m, setM] = useState({
    summary: p.summary ?? "", cta_label: p.meta.cta_label ?? "", badge: p.meta.badge ?? "", offer: p.meta.offer ?? "",
    vertical: (p.meta.vertical ?? "") as NonNullable<Merch["vertical"]>, featured: Boolean(p.meta.featured), is_listed: p.is_listed, position: String(p.position),
  });
  const { run, pending } = useRun();
  const set = <K extends keyof typeof m>(k: K, v: (typeof m)[K]) => setM({ ...m, [k]: v });
  const id = (k: string) => `merch-${k}`;
  const save = () => run(() => saveProgramMerch(p.id, { ...m, position: Number(m.position) || 0 }), "Card saved");

  return (
    <div className="st-merch">
      <form className="st-merch-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <fieldset className="st-group">
          <legend>Main copy</legend>
          <div className="st-field" data-wide="">
            <label className="st-label" htmlFor={id("summary")}>Card summary</label>
            <textarea id={id("summary")} className="st-in" rows={3} maxLength={400} value={m.summary} onChange={(e) => set("summary", e.target.value)} />
            <span className="st-help">{m.summary.length}/400 · two lines show on the card.</span>
          </div>
          <div className="st-field">
            <label className="st-label" htmlFor={id("cta")}>Button label <i>· optional</i></label>
            <input id={id("cta")} className="st-in" placeholder="View program" maxLength={40} value={m.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
          </div>
        </fieldset>
        <fieldset className="st-group">
          <legend>Offer &amp; badge</legend>
          <div className="st-field">
            <label className="st-label" htmlFor={id("badge")}>Badge <i>· optional</i></label>
            <input id={id("badge")} className="st-in" placeholder="New, Most popular…" maxLength={24} value={m.badge} onChange={(e) => set("badge", e.target.value)} />
          </div>
          <div className="st-field" data-wide="">
            <label className="st-label" htmlFor={id("offer")}>Offer line <i>· optional</i></label>
            <input id={id("offer")} className="st-in" placeholder="e.g. Founding members save 20%" maxLength={120} value={m.offer} onChange={(e) => set("offer", e.target.value)} />
          </div>
        </fieldset>
        <fieldset className="st-group">
          <legend>Placement</legend>
          <div className="st-field" data-wide="">
            <label className="st-label" htmlFor={id("vertical")}>Programs page section</label>
            <select id={id("vertical")} className="st-in" value={m.vertical} onChange={(e) => set("vertical", e.target.value as typeof m.vertical)}>
              <option value="">Not in a section</option>
              {VERTICALS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="st-field">
            <label className="st-label" htmlFor={id("pos")}>Order <i>· lower shows first</i></label>
            <input id={id("pos")} className="st-in" type="number" inputMode="numeric" min={0} value={m.position} onChange={(e) => set("position", e.target.value)} />
          </div>
          <div className="st-field">
            <span className="st-label">Visibility</span>
            <label className="st-check"><input type="checkbox" checked={m.is_listed} onChange={(e) => set("is_listed", e.target.checked)} />Listed in the catalog</label>
          </div>
          <label className="st-check" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={m.featured} onChange={(e) => set("featured", e.target.checked)} />Feature on Home (members with no progress yet)</label>
        </fieldset>
        <div className="st-bar"><Button type="submit" variant="filled" size="md" disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save card"}</Button></div>
      </form>

      <div className="st-merch-preview" aria-label="Live card preview">
        <div className="st-label" style={{ marginBottom: 8 }}>Live preview · Programs page</div>
        <article className="st-pcard" data-hidden={m.is_listed ? undefined : ""}>
          <div className="st-pcard-img">
            {p.image ? <Image src={p.image} alt="" fill unoptimized sizes="320px" /> : <span className="st-pcard-art" aria-hidden><Icon name="kettlebell" size="lg" /></span>}
            {m.badge && <span className="st-pcard-badge">{m.badge}</span>}
            {m.featured && <span className="st-pcard-flag"><Icon name="sparkle" size="xs" /> On Home</span>}
          </div>
          <div className="st-pcard-body">
            {p.instructor && <div className="st-pcard-by">{p.instructor}</div>}
            <h3>{p.name}</h3>
            {m.summary && <p className="st-pcard-sum">{m.summary}</p>}
            {m.offer && <p className="st-pcard-offer"><Icon name="sparkle" size="xs" /> {m.offer}</p>}
            {p.highlights.length > 0 && (
              <ul>{p.highlights.slice(0, 3).map((h) => <li key={h}><Icon name="check" size="xs" />{h}</li>)}</ul>
            )}
            <div className="st-pcard-foot">
              <span>{p.sections ? `${plural(p.sections, p.sectionLabel)} · ${plural(p.lessons, p.lessonLabel)}` : p.is_free ? "Free" : ""}</span>
              <Chip variant="fill">{p.is_free ? "Included" : "Locked"}</Chip>
            </div>
            <span className="st-pcard-cta">{!p.is_free && <Icon name="lock" size="xs" />}{m.cta_label || "View program"}<Icon name="chevron" size="xs" /></span>
          </div>
        </article>
        <p className="st-faint" style={{ marginTop: 8 }}>
          {m.vertical ? `Shows under “${VERTICALS.find((v) => v.value === m.vertical)?.label}”.` : "Not grouped: shows in the catalog group only."}
          {!m.is_listed && " Hidden from the catalog (still reachable by link)."}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Home / Programs copy */

type HomeCopy = { hero_eyebrow: string; featured_slug: string; enrolled_title: string };
type ProgramsCopy = { title: string; intro: string; flagship_badge: string; flagship_title: string; flagship_copy: string };

function Text({ id, label, value, onChange, long, wide, placeholder, help, max }: { id: string; label: string; value: string; onChange: (v: string) => void; long?: boolean; wide?: boolean; placeholder?: string; help?: string; max: number }) {
  return (
    <div className="st-field" data-wide={long || wide ? "" : undefined}>
      <label className="st-label" htmlFor={id}>{label}</label>
      {long ? (
        <textarea id={id} className="st-in" rows={3} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="st-in" maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {help && <span className="st-help">{help}</span>}
    </div>
  );
}

export function HomeCopyEditor({ value, programs }: { value: HomeCopy; programs: { slug: string; name: string }[] }) {
  const [v, setV] = useState(value);
  const { run, pending } = useRun();
  const featured = programs.find((p) => p.slug === v.featured_slug);
  return (
    <div className="st-merch">
      <form className="st-form" onSubmit={(e) => { e.preventDefault(); run(() => saveSiteCopy("home", v), "Home copy saved"); }}>
        <Text id="h-eyebrow" label="Hero label (new members)" placeholder="Featured program" max={60} value={v.hero_eyebrow} onChange={(x) => setV({ ...v, hero_eyebrow: x })} />
        <div className="st-field">
          <label className="st-label" htmlFor="h-feat">Featured program</label>
          <select id="h-feat" className="st-in" value={v.featured_slug} onChange={(e) => setV({ ...v, featured_slug: e.target.value })}>
            <option value="">None: show “Continue training” only</option>
            {programs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <span className="st-help">Shown to members who have not started anything yet.</span>
        </div>
        <Text id="h-enrolled" label="Enrolled row title" wide max={60} value={v.enrolled_title} onChange={(x) => setV({ ...v, enrolled_title: x })} />
        <div className="st-bar"><Button type="submit" variant="filled" size="md" disabled={pending}>Save Home copy</Button></div>
      </form>
      <div className="st-merch-preview" aria-label="Home preview">
        <div className="st-label" style={{ marginBottom: 8 }}>Live preview · Home</div>
        <div className="st-hero-prev">
          <span className="st-hero-eyebrow">{featured ? v.hero_eyebrow || "Featured program" : "Continue training"}</span>
          <b>{featured?.name ?? "Kettlebell Lifestyle"}</b>
          <span className="st-hero-btn">{featured ? "Join program" : "Resume"}</span>
        </div>
        <div className="st-rail-prev"><b>{v.enrolled_title || "Your programs"}</b><span>See all</span></div>
        <div className="st-rail-cards" aria-hidden><i /><i /><i /></div>
      </div>
    </div>
  );
}

export function ProgramsCopyEditor({ value, image }: { value: ProgramsCopy; image: string | null }) {
  const [v, setV] = useState(value);
  const { run, pending } = useRun();
  return (
    <div className="st-merch">
      <form className="st-form" onSubmit={(e) => { e.preventDefault(); run(() => saveSiteCopy("programs_page", v), "Programs copy saved"); }}>
        <Text id="p-title" label="Page title" wide max={60} value={v.title} onChange={(x) => setV({ ...v, title: x })} />
        <Text id="p-intro" label="Intro" long max={400} value={v.intro} onChange={(x) => setV({ ...v, intro: x })} />
        <Text id="p-badge" label="Flagship label" max={40} value={v.flagship_badge} onChange={(x) => setV({ ...v, flagship_badge: x })} />
        <Text id="p-ftitle" label="Flagship title" max={60} value={v.flagship_title} onChange={(x) => setV({ ...v, flagship_title: x })} />
        <Text id="p-fcopy" label="Flagship description" long max={400} value={v.flagship_copy} onChange={(x) => setV({ ...v, flagship_copy: x })} />
        <div className="st-bar"><Button type="submit" variant="filled" size="md" disabled={pending}>Save Programs copy</Button></div>
      </form>
      <div className="st-merch-preview" aria-label="Programs page preview">
        <div className="st-label" style={{ marginBottom: 8 }}>Live preview · Programs</div>
        <div className="st-pagehead-prev">
          <span className="st-hero-eyebrow">Beyond the program</span>
          <b>{v.title || "Programs"}</b>
          {v.intro && <p>{v.intro}</p>}
        </div>
        <div className="st-flag-prev">
          {image && <Image src={image} alt="" fill unoptimized sizes="360px" />}
          <div>
            <span className="st-pcard-badge" style={{ position: "static", justifySelf: "start" }}>{v.flagship_badge || "Flagship program"}</span>
            <b>{v.flagship_title || "Kettlebell Lifestyle"}</b>
            {v.flagship_copy && <p>{v.flagship_copy}</p>}
            <span className="st-hero-btn">Enter program</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Application pipeline */

const STATUS_LABEL: Record<string, string> = { submitted: "Submitted", call_booked: "Call booked", accepted: "Accept", waitlist: "Waitlist", declined: "Decline", booked: "Booked", cancelled: "Cancel" };
const QUICK = ["call_booked", "accepted", "waitlist", "declined"] as const;

/** Status actions for one application: accept / waitlist / decline / call booked, with a note. */
export function ApplicationActions({ id, status, note }: { id: string; status: string; note: string | null }) {
  const [n, setN] = useState(note ?? "");
  const [pick, setPick] = useState<string>(status);
  const { run, pending } = useRun();
  return (
    <div className="st-app-actions">
      <div className="st-row" role="group" aria-label="Set status">
        {QUICK.map((s) => (
          <Button key={s} type="button" size="sm" variant={pick === s ? "filled" : "fill"} aria-pressed={pick === s} onClick={() => setPick(s)} disabled={pending}>
            {STATUS_LABEL[s]}
          </Button>
        ))}
        <select className="st-in" aria-label="Other status" style={{ width: "auto", minHeight: 36, height: 36, padding: "4px 30px 4px 10px", fontSize: 13 }} value={(QUICK as readonly string[]).includes(pick) ? "" : pick} onChange={(e) => e.target.value && setPick(e.target.value)}>
          <option value="">More…</option>
          {APPLICATION_STATUS.filter((s) => !(QUICK as readonly string[]).includes(s)).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      <label className="st-label" htmlFor={`note-${id}`} style={{ marginTop: 10, display: "block" }}>Note for the team <i>· optional</i></label>
      <textarea id={`note-${id}`} className="st-in" rows={2} maxLength={2000} value={n} onChange={(e) => setN(e.target.value)} placeholder="Call notes, fit, travel…" />
      <div className="st-row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
        <Button type="button" variant="filled" size="sm" disabled={pending || (pick === status && n === (note ?? ""))} onClick={() => run(() => setApplicationStatus(id, pick, n), pick === status ? "Note saved" : `Marked ${pick.replace("_", " ")}`)}>
          {pick === status ? "Save note" : `Save · ${pick.replace("_", " ")}`}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Coaching schedule */

export function OpenWeeks({ schedule, openAhead }: { schedule: { times: string[]; weekdays: number[]; timezone: string } | null; openAhead: number }) {
  const [weeks, setWeeks] = useState("4");
  const { run, pending } = useRun();
  const D = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (!schedule) return <p className="st-faint">Add a schedule to the coaching program (meta.schedule: times, weekdays, timezone) to open weeks in one tap.</p>;
  const days = schedule.weekdays.map((d) => D[d]).join(", ");
  return (
    <div className="st-open-weeks">
      <div>
        <div className="st-label">Mike&rsquo;s schedule</div>
        <p style={{ margin: "4px 0 0" }}>{days} · {schedule.times.join(", ")} <span className="st-faint">({schedule.timezone.replace("_", " ")})</span></p>
        <p className="st-faint" style={{ margin: "4px 0 0" }}>{openAhead} open slots ahead. Existing times are skipped, so it is safe to run every week.</p>
      </div>
      <div className="st-row">
        <Segmented label="Weeks to open" variant="fill" value={weeks} onChange={setWeeks} options={[{ value: "2", label: "2 wk" }, { value: "4", label: "4 wk" }, { value: "8", label: "8 wk" }]} size="sm" />
        <Button variant="filled" size="md" icon="calendar" disabled={pending} onClick={() => run(() => openScheduleWeeks(Number(weeks)), "Slots opened")}>Open next {weeks} weeks</Button>
      </div>
    </div>
  );
}
