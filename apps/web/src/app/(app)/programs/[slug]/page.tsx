import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { PairsWellWith } from "@/components/access/PairsWellWith";
import { ProgramBadges } from "@/components/badges/ProgramBadges";
import { ProgramView } from "@/components/training/ProgramView";
import { loadProgramPage } from "@/lib/loaders/training";
import { loadBoard } from "@/lib/loaders/selfguided";
import { opensAsCourse } from "@/lib/course-types";
import { KblHome } from "@/components/journeys/KblHome";
import { loadIntakePage } from "@/lib/loaders/course";
import { fixture, MOCK } from "@/lib/mock";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const param = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : null);
const modeParam = (v: string | null) => (v === "self-guided" || v === "self_guided" ? "self_guided" : v === "immersion" ? "immersion" : null);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProgramPage(slug, param((await searchParams).path));
  if (!data) return { title: "Program" };
  return { title: data.path && data.paths.length > 1 ? `${data.program.name}, ${data.path.shortName ?? data.path.name}` : data.program.name };
}

/**
 * Program page in the original layout (Immersion home + level page, Self-Guided level page):
 * context bar, level switch, hero, the Self-Guided board, phase tabs with day rows, sidebar,
 * progress, past runs and "About this level". `?path=` picks the level, `?mode=self-guided` the view.
 */
export default async function ProgramPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadProgramPage(slug, param(sp.path));
  // Local preview: courses have course snapshots but no program-page snapshot; open their journey home.
  if (!data && MOCK && (await fixture(`course-${slug}`).then(() => true, () => false))) redirect(`/programs/${slug}/course`);
  if (!data) notFound();
  // Courses and tools (the Roadmap) open their signature journey home, then lessons in the shared course player.
  if (opensAsCourse(data.program.type)) redirect(`/programs/${slug}/course`);
  // Experiences (coaching, retreats, live programs, challenges) have their own program pages.
  if (["coaching", "live", "challenge", "retreat"].includes(data.program.type)) redirect(`/experiences/programs/${slug}`);
  const board = data.program.access === "locked" ? null : await loadBoard(slug, data.path?.key ?? null, data.program.id, data.path?.id ?? null).catch(() => null);
  const mode = modeParam(param(sp.mode));
  // Kettlebell Lifestyle: calm main page (Level choice + Immersion weeks navigator); Self-Guided keeps its board.
  if (slug === "kettlebell-lifestyle" && mode !== "self_guided") {
    const intake = await loadIntakePage(slug).catch(() => null);
    const recommended = intake?.latest?.result?.path_key ?? null;
    return <KblHome key={data.path?.id ?? "p"} data={data} board={board} recommendedKey={recommended ?? (data.enrollment ? data.path?.key ?? null : null)} offer={<PairsWellWith program={slug} />} badges={<ProgramBadges slug={slug} />} />;
  }
  return <ProgramView key={`${data.path?.id ?? "p"}:${mode ?? ""}`} data={data} board={board} initialMode={mode} offer={<OfferSlot placement="program_page" />} />;
}
