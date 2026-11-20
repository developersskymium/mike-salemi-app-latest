"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, Glass, Icon } from "@/components/ui";
import type { SelfGuidedHomeData } from "@/lib/loaders/selfguided";
import "./selfguided.css";

const HOW = [
  { icon: "lock" as const, title: "Nothing is locked", body: "Every phase and day is open from the start. Train what suits your body today." },
  { icon: "down" as const, title: "Plans to download", body: "Each phase ships with a printable PDF plan you can take to the gym." },
  { icon: "calendar" as const, title: "Your own calendar", body: "Drop days onto a schedule, set reminders and choose what happens if you miss one." },
];
const ACCESS: Record<string, string> = { included: "Included", owned: "Owned", org: "Team", free: "Free", locked: "Locked", preview: "Preview" };

/** Legacy `/self-guided` (L7): hero, Choose a level, every program with search, how it works, promo. */
export function SelfGuidedHome({ data, offer }: { data: SelfGuidedHomeData; offer?: ReactNode }) {
  const [q, setQ] = useState("");
  const slug = data.program.slug;
  const progs = data.programs.filter((p) => !q || `${p.name} ${p.summary ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="sg-page">
      <header className="sg-measure" style={{ display: "grid", gap: 10, marginTop: "var(--s-6)" }}>
        <p className="sg-eyebrow" data-tone="now">
          Self-guided
        </p>
        <h1 className="lq-t34" style={{ margin: 0 }}>
          Train it your way.
        </h1>
        <p className="lq-t17 lq-c2" style={{ margin: 0 }}>
          The same program as Immersion, without the fixed order. Open a level, go straight to any phase or day, and build a schedule that fits your week.
        </p>
        <div className="sg-hero-actions">
          <Button icon="calendar" href={`/programs/${slug}/session/wizard`}>
            Build a schedule
          </Button>
          <Button variant="glass" icon="library" href="/library">
            Browse the library
          </Button>
          <Button variant="glass" icon="sparkle" href={`/programs/${slug}/session/plan`}>
            Create my plan
          </Button>
        </div>
      </header>

      {data.levels.length > 0 && (
        <section className="sg-stack" style={{ marginTop: "var(--s-8)" }} aria-labelledby="sg-lv-h">
          <h2 id="sg-lv-h" className="lq-t22" style={{ margin: 0 }}>
            Choose a level
          </h2>
          <div className="sg-levelcards">
            {data.levels.map((l) => (
              <Glass key={l.pathId} as={Link} href={`/programs/${slug}?path=${encodeURIComponent(l.key ?? l.pathId)}&mode=self-guided`} radius="card" interactive className="sg-levelcard">
                <div className="sg-levelcard-img">
                  {l.image && <Image src={l.image} alt={`${data.program.name} ${l.shortName ?? ""} training`} fill sizes="(min-width: 1000px) 40vw, 100vw" />}
                  <span className="sg-levelcard-cap">
                    <span className="sg-eyebrow">{l.name.split("·")[1]?.trim() ?? l.shortName}</span>
                    <b className="lq-t22">
                      {data.program.name} · {l.shortName ?? l.name}
                    </b>
                  </span>
                </div>
                <div className="sg-levelcard-b">
                  {l.tagline && <p className="lq-t15 lq-c2">{l.tagline}</p>}
                  <p className="sg-hero-meta lq-t12 lq-c2">
                    <span className="sg-num">
                      <Icon name="mountain" /> {l.phases.length} phases
                    </span>
                    <span className="sg-num">
                      <Icon name="calendar" /> {l.days} days
                    </span>
                    <span className="sg-num">
                      <Icon name="play" /> {l.steps} lessons
                    </span>
                  </p>
                  <div className="sg-phasechips">
                    {l.phases.map((p) => (
                      <span key={p.title}>
                        <b>{p.title.replace(/\s*phase$/i, "")}</b>
                        <small>{p.subtitle}</small>
                      </span>
                    ))}
                  </div>
                  <span className="lq-btn" data-variant="glass" data-size="md" data-block="" style={{ pointerEvents: "none" }}>
                    Open {l.shortName ?? l.name}
                    <Icon name="chevron" size="sm" />
                  </span>
                </div>
              </Glass>
            ))}
          </div>
        </section>
      )}

      <section className="sg-stack" style={{ marginTop: "var(--s-8)" }} aria-labelledby="sg-all-h">
        <div className="sg-sec-h" style={{ alignItems: "flex-end" }}>
          <div>
            <p className="sg-eyebrow" data-tone="now">
              Every program
            </p>
            <h2 id="sg-all-h" className="lq-t22" style={{ margin: "4px 0 0" }}>
              Browse your full library
            </h2>
          </div>
          <label className="sg-search" style={{ width: "min(100%, 22rem)" }}>
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs" aria-label="Search programs" />
          </label>
        </div>
        {progs.length ? (
          <div className="sg-progs">
            {progs.map((p) => (
              <Glass key={p.slug} as={Link} href={p.access === "locked" ? `/explore/${p.slug}` : `/programs/${p.slug}?mode=self-guided`} radius="card" interactive className="sg-prog">
                <span className="sg-prog-img">{p.image && <Image src={p.image} alt="" fill sizes="96px" />}</span>
                <span className="sg-prog-t">
                  <b className="lq-t15 sg-ellipsis">{p.name}</b>
                  {p.summary && <span className="lq-t12 lq-c2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.summary}</span>}
                  <span className="lq-t12 lq-c2 sg-num" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {p.sections} sections · {p.lessons} lessons
                    <span className="sg-intent" data-i={p.access === "locked" ? undefined : "skill"}>
                      {p.access === "locked" && <Icon name="lock" size="xs" />}
                      {ACCESS[p.access] ?? p.access}
                    </span>
                  </span>
                </span>
              </Glass>
            ))}
          </div>
        ) : (
          <Glass radius="card" className="sg-empty">
            <p className="lq-t15">No programs match “{q}”</p>
          </Glass>
        )}
      </section>

      <section className="sg-stack" style={{ marginTop: "var(--s-8)" }} aria-labelledby="sg-how2-h">
        <h2 id="sg-how2-h" className="lq-t22" style={{ margin: 0 }}>
          How self-guided works
        </h2>
        <div className="sg-how">
          {HOW.map((h) => (
            <Glass key={h.title} radius="card">
              <Icon name={h.icon} />
              <h3 className="lq-t15" style={{ fontWeight: 650 }}>
                {h.title}
              </h3>
              <p className="lq-t13 lq-c2">{h.body}</p>
            </Glass>
          ))}
        </div>
      </section>
      {offer && <div className="sg-offer" style={{ marginTop: "var(--s-8)" }}>{offer}</div>}
    </div>
  );
}
