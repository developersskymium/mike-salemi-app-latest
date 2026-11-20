import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { AmbientBackdrop, Glass, IconButton, LargeTitle } from "@/components/ui";
import { ApplyForm } from "@/components/experiences/ApplyForm";
import { DraftChip } from "@/components/commerce/DraftChip";
import { dateRange } from "@/components/commerce/format";
import { loadRunHub } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export const metadata: Metadata = { title: "Apply", robots: { index: false } };

export default async function ApplyPage(props: PageProps<"/experiences/[run]/apply">) {
  const { run } = await props.params;
  const sp = await props.searchParams;
  const hub = await loadRunHub(run, typeof sp.preview === "string" ? sp.preview : null);
  if (!hub) notFound();
  // Already applied or booked: the run page shows where it stands.
  if (hub.application) redirect(`/experiences/${run}`);
  const r = hub.run;
  const cover = r.details.cover ?? r.gallery[0]?.url;
  const dates = dateRange(r.starts_at, r.ends_at, r.timezone);
  return (
    <div className="com-page">
      {cover && <AmbientBackdrop src={cover} fixed />}
      <LargeTitle title="Apply" eyebrow={r.name} leading={<IconButton icon="back" label={`Back to ${r.name}`} href={`/experiences/${run}`} size="sm" />} />
      <div className="exp-form">
        <Glass radius="card" className="com-row" style={{ padding: 12, marginBottom: 16 }}>
          {cover && (
            <span style={{ position: "relative", width: 72, height: 72, borderRadius: "var(--r-inner)", overflow: "hidden", flex: "none" }}>
              <Image src={cover} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
            </span>
          )}
          <div className="com-grow">
            <div className="exp-kicker">{r.status === "waitlist" ? "Waitlist" : "Fixed cohort"}</div>
            <div className="lq-t17">{r.name}</div>
            <div className="lq-t13 lq-c2"><span className="lq-num">{dates}</span>{r.location.city ? ` · ${r.location.city}` : ""}{r.capacity ? ` · ${r.capacity} men` : ""}</div>
          </div>
          <DraftChip note={r.draft_note} />
        </Glass>
      </div>
      {["open", "waitlist"].includes(r.status) ? (
        <ApplyForm runId={r.id} runName={r.name} dates={dates} waitlist={r.status === "waitlist"} />
      ) : (
        <Glass radius="card" className="com-panel exp-form"><p className="lq-t15">Applications for this date are closed.</p></Glass>
      )}
    </div>
  );
}
