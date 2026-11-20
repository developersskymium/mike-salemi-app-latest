import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AmbientBackdrop } from "@/components/ui";
import { RunHubView } from "@/components/experiences/RunHubView";
import { RunSales } from "@/components/experiences/RunSales";
import { loadRunHub } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export async function generateMetadata(props: PageProps<"/experiences/[run]">): Promise<Metadata> {
  const { run } = await props.params;
  const hub = await loadRunHub(run).catch(() => null);
  return { title: hub?.run.name ?? "Experience" };
}

/** Retreat hub for booked members; a sales view (apply / status) for everyone else. */
export default async function RunPage(props: PageProps<"/experiences/[run]">) {
  const { run } = await props.params;
  const sp = await props.searchParams;
  const hub = await loadRunHub(run, typeof sp.preview === "string" ? sp.preview : null);
  if (!hub) notFound();
  const booked = hub.application?.status === "booked";
  const cover = hub.run.details.cover ?? hub.run.gallery[0]?.url;
  return (
    <div className="com-page exp-page">
      {cover && <AmbientBackdrop src={cover} fixed />}
      {booked ? <RunHubView hub={hub} /> : <RunSales hub={hub} />}
    </div>
  );
}
