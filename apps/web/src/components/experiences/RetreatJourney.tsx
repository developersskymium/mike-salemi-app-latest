import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { dateRange } from "@/components/commerce/format";
import { loadRetreatJourney } from "@/lib/loaders/experiences";
import { retreatStage, retreatSteps, runDay } from "@/lib/retreat-stage";
import { RetreatSteps } from "./RetreatSteps";
import "./retreat.css";

/**
 * Home: the member's retreat in one card — the three sign-up steps while applying, the countdown and
 * preparation once booked, today's day while live, integration after. Renders nothing without a retreat.
 */
export async function RetreatJourney() {
  const j = await loadRetreatJourney();
  if (!j) return null;
  const now = Date.now();
  const stage = retreatStage({ runStatus: j.runStatus, startsAt: j.startsAt, endsAt: j.endsAt, application: j.application }, now);
  if (stage === "declined" || stage === "closed" || stage === "sales") return null;
  const days = Math.max(0, Math.floor((Date.parse(j.startsAt) - now) / 86400000));
  const href = `/experiences/${j.runId}`;
  const when = j.application.call_at
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: j.timezone, timeZoneName: "short" }).format(new Date(j.application.call_at))
    : null;
  const copy: Partial<Record<typeof stage, { k: string; t: string; cta: string; hash?: string }>> = {
    applied: { k: "Your retreat · step 2 of 3", t: "Pick a time for your call", cta: "Pick a time", hash: "#call" },
    call: { k: "Your retreat · step 2 of 3", t: `Call booked${when ? ` · ${when}` : ""}`, cta: "See your call", hash: "#call" },
    review: { k: "Your retreat · step 3 of 3", t: "Mike is reviewing your application", cta: "See where it stands" },
    pay: { k: "Your retreat · step 3 of 3", t: "You’re approved. Confirm your place.", cta: "Confirm your place", hash: "#pay" },
    waitlist: { k: "Your retreat", t: "You’re on the waitlist", cta: "See the retreat" },
    booked: { k: "Your retreat · booked", t: `${days} days to the mountain`, cta: "Prepare", hash: "#prepare" },
    live: { k: "Happening now", t: `Day ${runDay(j.startsAt, j.timezone, now)} on the mountain`, cta: "Today’s plan", hash: "#today" },
    after: { k: "Integration", t: "Welcome home. Keep it going.", cta: "Open integration", hash: "#integration" },
  };
  const c = copy[stage];
  if (!c) return null;
  const booked = stage === "booked" || stage === "live" || stage === "after";
  return (
    <Link href={`${href}${c.hash ?? ""}`} className="rt-journey lq-press" aria-label={`${j.name}: ${c.t}`}>
      <span className="rt-journey-photo">{j.cover && <Image src={j.cover} alt="" fill sizes="(min-width: 1024px) 220px, 120px" />}</span>
      <span className="rt-journey-body">
        <span className="lq-eyebrow" data-tone={stage === "pay" || stage === "applied" ? "accent" : "warm"}>{c.k}</span>
        <span className="lq-d-xs">{c.t}</span>
        <span className="lq-t13 lq-c2">{j.name} · <span className="lq-num">{dateRange(j.startsAt, j.endsAt, j.timezone)}</span>{j.location ? ` · ${j.location}` : ""}</span>
        {booked ? (
          stage === "booked" && j.checklist.total > 0 && (
            <span className="rt-journey-prep">
              <span className="rt-journey-bar" style={{ ["--p" as string]: `${Math.round((j.checklist.done / j.checklist.total) * 100)}%` }} />
              <span className="lq-t12 lq-c2 lq-num">{j.checklist.done} of {j.checklist.total} prepared</span>
            </span>
          )
        ) : (
          <RetreatSteps steps={retreatSteps(stage, when)} variant="bar" />
        )}
      </span>
      <span className="rt-journey-cta">{c.cta}<Icon name="arrowRight" size="xs" /></span>
    </Link>
  );
}
