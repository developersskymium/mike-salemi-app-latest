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
