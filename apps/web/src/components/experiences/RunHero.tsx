import Image from "next/image";
import type { ReactNode } from "react";
import { Chip, IconButton } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange } from "@/components/commerce/format";
import type { RunHub } from "@/lib/loaders/commerce";
import "./experiences.css";

/** Cinematic full-bleed photo hero for a run. `pane` sits over the photo (countdown or apply). */
export function RunHero({ hub, mode, pane }: { hub: RunHub; mode: "sales" | "hub"; pane?: ReactNode }) {
  const { run } = hub;
  const d = run.details;
  const cover = d.cover ?? run.gallery.find((g) => !g.stock)?.url;
  const place = run.location.city ? `${run.location.city}, ${run.location.region ?? ""}`.replace(/, $/, "") : run.location.label;
  return (
    <section className="exp-hero" data-mode={mode} aria-labelledby="run-title">
      {cover && (
        <div className="exp-hero-photo lq-parallax">
          <Image src={cover} alt="" fill priority sizes="100vw" />
        </div>
      )}
      {mode === "sales" ? (
        <div className="exp-hero-top">
          <IconButton icon="back" label="All retreats" href="/experiences" variant="clear" />
          <DraftChip note={run.draft_note} onPhoto />
        </div>
      ) : null}
      <div className="exp-hero-inner">
        <div className="exp-hero-copy">
          <div className="exp-eyebrow">
            {mode === "hub" ? <Chip variant="clear" icon="check">You&rsquo;re booked</Chip> : <span>{d.season ?? hub.program.name}</span>}
          </div>
          <h1 id="run-title" className="lq-display">{run.name}</h1>
          {d.tagline && <p className="exp-tagline">{d.tagline}</p>}
          <div className="exp-facts">
            <Chip variant="clear" icon="calendar"><span className="lq-num">{dateRange(run.starts_at, run.ends_at, run.timezone)}</span></Chip>
            {place && <Chip variant="clear" icon="mountain">{place}</Chip>}
            {mode === "sales" && d.duration_label && <Chip variant="clear" icon="clock">{d.duration_label}</Chip>}
            {mode === "sales" && run.capacity && <Chip variant="clear" icon="people"><span className="lq-num">{run.capacity}</span>&nbsp;men max</Chip>}
          </div>
        </div>
        {pane}
      </div>
    </section>
  );
}
