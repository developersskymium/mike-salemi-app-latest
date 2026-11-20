import type { Metadata } from "next";
import Image from "next/image";
import { Button, Chip, Glass, Icon, LargeTitle } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange } from "@/components/commerce/format";
import { Ridge } from "@/components/experiences/Ridge";
import { Heading } from "@/components/experiences/RunParts";
import { loadRetreats } from "@/lib/loaders/experiences";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export const metadata: Metadata = {
  title: "Retreats",
  description: "Four-day retreats in Mount Shasta capped at 20 men: movement, ceremony, sweat lodge and honest brotherhood.",
};

const STATUS: Record<string, string> = { open: "Applications open", waitlist: "Waitlist", full: "Full", past: "Past cohort", upcoming: "Opening soon" };
const MINE: Record<string, string> = { submitted: "Applied", call_booked: "Call booked", accepted: "Accepted", waitlist: "On the waitlist", booked: "You’re booked" };

/** Legacy retreats index (L24): page head, two-column cohort cards, "What it is not". */
export default async function RetreatsPage() {
  const d = await loadRetreats();
  const cap = d.runs.find((r) => r.capacity)?.capacity ?? 20;
  return (
    <div className="com-page">
      <LargeTitle title="Retreats" eyebrow="Men of Movement" />
      <div className="exp-pagehead">
        <p>Four days in Mount Shasta with nineteen other men. Movement in the morning, ceremony at night, and the kind of conversation most men never get to have.</p>
        <span className="exp-meta lq-num">{d.runs.length} cohort{d.runs.length === 1 ? "" : "s"} · capped at {cap} men</span>
      </div>

      <div className="exp-retreats">
        {d.runs.map((r, i) => {
          const booked = r.mine === "booked";
          return (
            <Glass as="article" key={r.id} radius="card" className="exp-rcard lq-lift" data-past={r.status === "past" ? "" : undefined} aria-labelledby={`r-${r.id}`}>
              <div className="exp-rcard-photo">
                {r.cover && <Image src={r.cover} alt={`${r.name}${r.location ? ` retreat at ${r.location}` : ""}`} fill priority={i === 0} sizes="(min-width: 1024px) 560px, 100vw" />}
                <div className="exp-rcard-cap">
                  {r.season && <div className="exp-kicker">{r.season}</div>}
                  <h2 id={`r-${r.id}`} className="lq-t28">{r.name}</h2>
                </div>
              </div>
              <div className="exp-rcard-body">
                <div className="com-row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <Chip variant="fill" icon="calendar"><span className="lq-num">{dateRange(r.starts_at, r.ends_at, r.timezone)}</span></Chip>
                  <Chip variant={r.status === "open" ? "tint" : "outline"} dot={r.status === "open"}>{STATUS[r.status] ?? r.status}</Chip>
                  {r.mine && <Chip variant="fill" icon="check">{MINE[r.mine] ?? r.mine}</Chip>}
                  <DraftChip note={r.draft_note} />
                </div>
                {r.tagline && <p className="lq-t15 lq-c2" style={{ margin: 0 }}>{r.tagline}</p>}
                <ul className="exp-rcard-meta" role="list">
                  {r.location && <li><Icon name="mountain" size="xs" />{r.location}</li>}
                  {r.capacity && <li><Icon name="people" size="xs" /><span><span className="lq-num">{r.capacity}</span> men maximum</span></li>}
                </ul>
                <div className="com-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Button href={`/experiences/${r.id}`} variant={r.status === "open" && !booked ? "filled" : "glass"} size="md" iconAfter="chevron">View retreat</Button>
                  {booked && <Button href={`/experiences/${r.id}`} variant="filled" size="md" icon="compass">Your retreat hub</Button>}
                </div>
              </div>
            </Glass>
          );
        })}
      </div>
      {!d.runs.length && (
        <Glass radius="card" className="exp-note"><Ridge className="exp-note-art" /><div><div className="lq-t17">New dates are on their way</div><p className="lq-t15 lq-c2">Mike announces each cohort here first.</p></div></Glass>
      )}

      <Glass as="section" radius="card" className="exp-notice" aria-labelledby="not">
        <Ridge className="exp-note-art" />
        <Heading eyebrow="What it is not" title="No performance, no forcing" id="not" />
        <p className="exp-measure lq-c2" style={{ position: "relative" }}>
          Around half the men who come have never done work like this. Everything is scalable, nothing is forced, and you decide how far you go. You leave with practices you can keep, a brotherhood group, and a follow-up call a week later.
        </p>
      </Glass>
    </div>
  );
}
