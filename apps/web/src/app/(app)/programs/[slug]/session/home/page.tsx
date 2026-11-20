import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { SelfGuidedHome } from "@/components/selfguided/SelfGuidedHome";
import { SelfGuidedHub } from "@/components/selfguided/SelfGuidedHub";
import { loadBoard, loadSelfGuidedHome } from "@/lib/loaders/selfguided";
import { loadSchedule } from "@/lib/loaders/plan";
import { loadProgramPage } from "@/lib/loaders/training";
import type { TrainingStatsDTO } from "@ms/api";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Self-Guided", description: "The whole program, open. Go anywhere, any time." };

const PHOTO = { src: "/media/summit/mike-standing.jpg", position: "62% 24%" };

/** Weeks in a row (ending this week) with at least two training days. */
function steadyWeeks(stats: TrainingStatsDTO | null) {
  if (!stats) return 0;
  const active = new Set(stats.heatmap.filter((h) => h.sessions || h.steps || h.minutes).map((h) => h.date));
  const today = new Date(`${stats.today}T12:00:00Z`);
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000;
  let n = 0;
  for (let w = 1; w <= 26; w++) {
    let c = 0;
    for (let d = 0; d < 7; d++) if (active.has(new Date(monday - w * 7 * 86400000 + d * 86400000).toISOString().slice(0, 10))) c++;
    if (c >= 2) n++;
    else break;
  }
  return n;
}

/** Self-Guided, calm: Up next with its reason, three ways in, progress you can tap, then the level choice. */
export default async function SelfGuidedHomePage({ params }: Props) {
  const { slug } = await params;
  const [data, page, schedule] = await Promise.all([loadSelfGuidedHome(slug), loadProgramPage(slug, null).catch(() => null), loadSchedule().catch(() => null)]);
  if (!data) notFound();
  const board = page ? await loadBoard(slug, page.path?.key ?? null, page.program.id, page.path?.id ?? null).catch(() => null) : null;
  const today = board?.stats?.today ?? new Date().toISOString().slice(0, 10);
  const twoWeeksAgo = new Date(new Date(`${today}T12:00:00Z`).getTime() - 14 * 86400000).toISOString().slice(0, 10);
  const missed = (schedule?.items ?? []).filter((i) => i.program_slug === slug && i.kind !== "rest" && !i.done && !i.skipped && i.on_date < today && i.on_date >= twoWeeksAgo).length;
  const owned = new Map(data.programs.map((p) => [p.slug, p.access !== "locked"]));
  const hub =
    page && board ? (
      <SelfGuidedHub
        slug={slug}
        programId={page.program.id}
        pathId={page.path?.id ?? null}
        programName={data.program.name}
        board={board}
        missed={missed}
        photo={PHOTO}
        graduation={steadyWeeks(board.stats) >= 8 ? { a4l: !!owned.get("athleticism-4-life"), mtk: !!owned.get("mastering-the-kettlebell") } : null}
      />
    ) : null;
  return <SelfGuidedHome data={data} hub={hub} offer={<OfferSlot placement="program_page" />} />;
}
