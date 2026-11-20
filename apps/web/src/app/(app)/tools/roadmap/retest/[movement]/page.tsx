import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RetestFlow } from "@/components/roadmap/RetestFlow";
import { unlockHref } from "@/lib/access";
import { loadRoadmap } from "@/lib/loaders/roadmap";
import "@/components/roadmap/roadmap.css";

export const metadata: Metadata = { title: "Re-test", robots: { index: false } };

type Props = { params: Promise<{ movement: string }> };

/** Re-run one node's benchmark (members). Locked nodes and Phase 4 (no benchmarks) go back to the map. */
export default async function RetestPage({ params }: Props) {
  const { movement } = await params;
  const v = await loadRoadmap();
  if (!v) redirect("/tools/roadmap");
  const m = v.movements.find((x) => x.key === movement);
  if (!m) notFound();
  if (!v.member) redirect(unlockHref("kettlebell-lifestyle", "tool:roadmap"));
  const node = v.nodes.find((n) => n.key === m.key);
  const bms = v.benchmarks.filter((b) => b.movement === m.key).sort((a, b) => a.position - b.position);
  if (!node || node.state === "locked" || !bms.length) redirect(`/tools/roadmap?node=${m.key}`);
  return (
    <div data-shell-focus="">
      <RetestFlow movement={m} benchmarks={bms} bell={v.bell} names={Object.fromEntries(v.movements.map((x) => [x.key, x.name]))} defaultVariant={v.variants[m.key] ?? "main"} />
    </div>
  );
}
