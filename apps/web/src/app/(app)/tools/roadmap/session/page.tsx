import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPhaseSession } from "@ms/core";
import { SessionPlayer } from "@/components/roadmap/SessionPlayer";
import { unlockHref } from "@/lib/access";
import { loadRoadmap } from "@/lib/loaders/roadmap";
import "@/components/roadmap/roadmap.css";

export const metadata: Metadata = { title: "Phase session", robots: { index: false } };

type Props = { searchParams: Promise<{ at?: string }> };

/** Today's rules-built phase session (members). Today's KBL readiness carries over (Recovery Day → breath + decompression). */
export default async function PhaseSessionPage({ searchParams }: Props) {
  const [sp, v] = await Promise.all([searchParams, loadRoadmap()]);
  if (!v) redirect("/tools/roadmap");
  if (!v.member) redirect(unlockHref("kettlebell-lifestyle", "tool:roadmap"));
  if (!v.placement) redirect("/tools/roadmap");
  const session = buildPhaseSession(v, v.nodes, v.readiness);
  // `?at=<step>` opens the player paused at a step (preview and screenshots).
  const at = sp.at && /^\d{1,3}$/.test(sp.at) ? Number(sp.at) : null;
  return <SessionPlayer session={session} movements={v.movements} preview={at != null ? { at, elapsed: 0 } : undefined} />;
}
