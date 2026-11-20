import { Avatar, Glass, Icon } from "@/components/ui";
import type { RunHub } from "@/lib/loaders/commerce";
import { Ridge } from "./Ridge";

export function SectionHead({ title, kicker, aside }: { title: string; kicker?: string; aside?: React.ReactNode }) {
  return (
    <header>
      <div>
        {kicker && <div className="exp-kicker">{kicker}</div>}
        <h2 className="lq-t22">{title}</h2>
      </div>
      {aside}
    </header>
  );
}

export function Facilitators({ people }: { people: NonNullable<RunHub["run"]["details"]["facilitators"]> }) {
  return (
    <div className="exp-people">
      {people.map((p) => (
        <Glass key={p.name} radius="panel" className="exp-person">
          <Avatar name={p.name} size="md" />
          <div className="com-grow">
            <div className="lq-t15" style={{ fontWeight: 600 }}>{p.name}</div>
            <div className="lq-t13 lq-c2">{p.role}</div>
          </div>
        </Glass>
      ))}
    </div>
  );
}

export function Faq({ items }: { items: NonNullable<RunHub["run"]["details"]["faq"]> }) {
  return (
    <Glass radius="card" className="exp-faq" style={{ padding: "4px 20px" }}>
      {items.map((f) => (
        <details key={f.q}>
          <summary>
            <span>{f.q}</span>
            <Icon name="chevron" size="sm" />
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </Glass>
  );
}

export function Travel({ run }: { run: RunHub["run"] }) {
  const loc = run.location;
  const q = loc.map_query ?? loc.label;
  return (
    <div className="exp-travel">
      <Glass radius="card" className="exp-map">
        <Ridge className="exp-ridge" />
        <div style={{ position: "relative" }}>
          <div className="exp-kicker">Where</div>
          <div className="lq-t20">{loc.label ?? loc.city}</div>
          {loc.address && <p className="lq-t13 lq-c2" style={{ marginTop: 2 }}>{loc.address}</p>}
          {q && (
            <a className="lq-btn lq-fx lq-press" data-variant="fill" data-size="sm" data-fx="" style={{ marginTop: 12 }} href={`https://maps.google.com/?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener">
              <span>Open in Maps</span>
            </a>
          )}
        </div>
      </Glass>
      <Glass radius="card" className="com-panel com-stack" style={{ gap: 16 }}>
        {run.details.travel && (
          <div>
            <div className="exp-kicker" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="compass" size="xs" /> Getting there</div>
            <p className="lq-t15" style={{ marginTop: 4 }}>{run.details.travel}</p>
          </div>
        )}
        {run.details.accommodation && (
          <div>
            <div className="exp-kicker" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="moon" size="xs" /> Where you stay</div>
            <p className="lq-t15" style={{ marginTop: 4 }}>{run.details.accommodation}</p>
          </div>
        )}
        <div>
          <div className="exp-kicker" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="clock" size="xs" /> Time zone</div>
          <p className="lq-t15" style={{ marginTop: 4 }}>{run.timezone.replace("_", " ").replace("America/", "")} time</p>
        </div>
      </Glass>
    </div>
  );
}

/* ---------------------------------------------------------------- Legacy page-kit pieces, in the Liquid style */

/** Sticky context bar (legacy ContextBar): [back + label] [title + meta] [one action]. */
export function ContextBar({ back, backLabel, title, meta, action }: { back: string; backLabel: string; title: string; meta?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Glass as="nav" radius="pill" className="exp-ctx" aria-label="Page">
      <a className="exp-ctx-back lq-press" href={back} aria-label={backLabel}>
        <Icon name="back" size="sm" />
        <span className="exp-ctx-backlabel">{backLabel}</span>
      </a>
      <div className="exp-ctx-mid">
        <div className="exp-ctx-title">{title}</div>
        {meta && <div className="exp-ctx-meta lq-num">{meta}</div>}
      </div>
      <div className="exp-ctx-act">{action}</div>
    </Glass>
  );
}

/** Legacy SectionHeading: small eyebrow + section title, left-aligned. */
export function Heading({ eyebrow, title, id, aside }: { eyebrow?: string; title: string; id?: string; aside?: React.ReactNode }) {
  return (
    <header className="exp-heading">
      <div>
        {eyebrow && <div className="exp-kicker">{eyebrow}</div>}
        <h2 id={id} className="lq-t22">{title}</h2>
      </div>
      {aside}
    </header>
  );
}

export function Ticks({ items, cols = 2 }: { items: string[]; cols?: 1 | 2 }) {
  return (
    <ul className="exp-ticks" data-cols={cols} role="list">
      {items.map((h) => {
        const [head, ...rest] = h.split(" — ");
        return (
          <li key={h}>
            <span className="exp-ticks-i" aria-hidden><Icon name="check" size="xs" /></span>
            <span>{rest.length ? <><b>{head}</b> <span className="lq-c2">— {rest.join(" — ")}</span></> : h}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Facts({ items }: { items: { icon: "calendar" | "clock" | "people" | "mountain" | "sparkle" | "compass" | "bookmark"; label: string; value: React.ReactNode; href?: string }[] }) {
  return (
    <Glass as="dl" radius="card" className="exp-factgrid" data-n={items.length}>
      {items.map((f) => {
        const inner = (
          <>
            <dt><Icon name={f.icon} size="xs" />{f.label}</dt>
            <dd>{f.value}</dd>
          </>
        );
        return f.href ? (
          <a key={f.label} className="exp-fact" href={f.href} target="_blank" rel="noopener">{inner}</a>
        ) : (
          <div key={f.label} className="exp-fact">{inner}</div>
        );
      })}
    </Glass>
  );
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** "How the four days unfold": one numbered card per day with its items (legacy retreat page). */
export function DayList({ items }: { items: RunHub["itinerary"] }) {
  const days = new Map<number, RunHub["itinerary"]>();
  for (const i of items) days.set(i.day_index, [...(days.get(i.day_index) ?? []), i]);
  const list = [...days.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <ol className="exp-daylist" role="list">
      {list.map(([d, its], n) => {
        const desc = its[0]?.description ?? "";
        const title = desc.includes("·") ? desc.split("·").slice(1).join("·").trim() : null;
        return (
          <li key={d}>
            <span className="exp-daylist-n lq-num" aria-hidden>{n + 1}</span>
            <div>
              <div className="exp-kicker">Day {ROMAN[d - 1] ?? d}</div>
              {title && <h3 className="lq-t17">{title}</h3>}
              <ul role="list">{its.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
