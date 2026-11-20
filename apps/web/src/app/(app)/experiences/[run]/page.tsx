import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RetreatHub } from "@/components/experiences/RetreatHub";
import { RetreatPage } from "@/components/experiences/RetreatPage";
import { loadRunHub } from "@/lib/loaders/commerce";
import { retreatStage } from "@/lib/retreat-stage";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/experiences/retreat.css";
import "@/components/experiences/retreat-plus.css";

export async function generateMetadata(props: PageProps<"/experiences/[run]">): Promise<Metadata> {
  const { run } = await props.params;
  const hub = await loadRunHub(run).catch(() => null);
  return { title: hub?.run.name ?? "Retreat", description: hub?.run.details.tagline ?? undefined };
}

/**
 * One retreat. Not booked: the Airbnb-style page with the three-step sign-up in the sticky booking card
 * (Apply → Schedule a call → if approved, Pay). Booked: the hub (countdown and preparation before,
 * today's plan, gallery and help while live, integration after).
 */
export default async function RunPage(props: PageProps<"/experiences/[run]">) {
  const { run } = await props.params;
  const sp = await props.searchParams;
  const hub = await loadRunHub(run, typeof sp.preview === "string" ? sp.preview : null);
  if (!hub) notFound();
  const stage = retreatStage({ runStatus: hub.run.status, startsAt: hub.run.starts_at, endsAt: hub.run.ends_at, application: hub.application });
  return (
    <div className="com-page">
      {stage === "booked" || stage === "live" || stage === "after" ? <RetreatHub hub={hub} stage={stage} /> : <RetreatPage hub={hub} stage={stage} />}
    </div>
  );
}
