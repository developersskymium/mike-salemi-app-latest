import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Glass, Icon } from "@/components/ui";
import { ApplyForm } from "@/components/experiences/ApplyForm";
import { RetreatSteps } from "@/components/experiences/RetreatSteps";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange } from "@/components/commerce/format";
import { loadRunHub } from "@/lib/loaders/commerce";
import { retreatSteps } from "@/lib/retreat-stage";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/experiences/retreat.css";
import "@/components/experiences/retreat-plus.css";

export const metadata: Metadata = { title: "Apply", robots: { index: false } };

/** Step 1 of 3 (legacy L26): the four-part application, with the run and the three steps on top. */
export default async function ApplyPage(props: PageProps<"/experiences/[run]/apply">) {
  const { run } = await props.params;
  const sp = await props.searchParams;
  const hub = await loadRunHub(run, typeof sp.preview === "string" ? sp.preview : null);
  if (!hub) notFound();
  // Already applied or booked: the run page shows where it stands.
  if (hub.application) redirect(`/experiences/${run}`);
  const r = hub.run;
  const cover = r.details.cover ?? r.gallery.find((g) => !g.stock)?.url;
  const dates = dateRange(r.starts_at, r.ends_at, r.timezone);
  return (
    <div className="com-page rt-page rt-apply">
      <nav className="rt-crumbs" aria-label="Breadcrumb">
        <Link href={`/experiences/${run}`} className="rt-crumb lq-press"><Icon name="back" size="xs" />{r.name}</Link>
      </nav>
      <Glass radius="card" className="rt-apply-head">
        {cover && <span className="rt-apply-thumb"><Image src={cover} alt="" fill sizes="96px" /></span>}
        <div className="com-grow">
          <div className="lq-eyebrow" data-tone="accent">{r.status === "waitlist" ? "Waitlist" : "Apply · step 1 of 3"}</div>
          <h1 className="lq-d-sm" style={{ margin: "2px 0 4px" }}>{r.name}</h1>
          <div className="lq-t13 lq-c2"><span className="lq-num">{dates}</span>{r.location.city ? ` · ${r.location.city}` : ""}{r.capacity ? ` · ${r.capacity} men` : ""}</div>
        </div>
        <DraftChip note={r.draft_note} />
      </Glass>
      <div className="rt-apply-steps"><RetreatSteps steps={retreatSteps("sales")} variant="bar" /></div>
      {["open", "waitlist"].includes(r.status) ? (
        <ApplyForm runId={r.id} runName={r.name} dates={dates} waitlist={r.status === "waitlist"} />
      ) : (
        <Glass radius="card" className="com-panel exp-form"><p className="lq-t15">Applications for this date are closed.</p></Glass>
      )}
    </div>
  );
}
