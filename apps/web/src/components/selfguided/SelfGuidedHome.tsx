"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Glass, Icon } from "@/components/ui";
import type { SelfGuidedHomeData } from "@/lib/loaders/selfguided";
import "./selfguided.css";


/** Legacy `/self-guided` (L7): hero, Choose a level, every program with search, how it works, promo. */
export function SelfGuidedHome({ data, offer, hub }: { data: SelfGuidedHomeData; offer?: ReactNode; hub?: ReactNode }) {
  const slug = data.program.slug;
  return (
    <div className="sg-page">
      <header className="sg-measure" style={{ display: "grid", gap: 8, marginTop: "var(--s-6)" }}>
        <p className="sg-eyebrow" data-tone="now">
          Self-guided · {data.program.name}
        </p>
        <h1 className="lq-t34" style={{ margin: 0 }}>
          Train it your way.
        </h1>
        <p className="lq-t17 lq-c2" style={{ margin: 0 }}>
          Every day is open. We suggest what&apos;s next and why — you choose.
        </p>
      </header>
      {hub && <div style={{ marginTop: "var(--s-6)" }}>{hub}</div>}

      {data.levels.length > 0 && (
        <section className="sg-stack" style={{ marginTop: "var(--s-8)" }} aria-labelledby="sg-lv-h">
          <h2 id="sg-lv-h" className="lq-t22" style={{ margin: 0 }}>
            Choose a level
          </h2>
          <p className="lq-t15 lq-c2" style={{ margin: 0 }}>Level I and Level II are a choice, not a ladder — switch any time.</p>
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

      {offer && <div className="sg-offer" style={{ marginTop: "var(--s-8)" }}>{offer}</div>}
    </div>
  );
}
