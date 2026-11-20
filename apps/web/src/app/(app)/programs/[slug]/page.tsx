import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { ProgramView } from "@/components/training/ProgramView";
import { loadProgramPage } from "@/lib/loaders/training";
import { loadBoard } from "@/lib/loaders/selfguided";
import { opensAsCourse } from "@/lib/course-types";

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
  if (!data) notFound();
  // Courses and tools (the Roadmap) open their signature journey home, then lessons in the shared course player.
  if (opensAsCourse(data.program.type)) redirect(`/programs/${slug}/course`);
  // Experiences (coaching, retreats, live programs, challenges) have their own program pages.
  if (["coaching", "live", "challenge", "retreat"].includes(data.program.type)) redirect(`/experiences/programs/${slug}`);
  const board = data.program.access === "locked" ? null : await loadBoard(slug, data.path?.key ?? null, data.program.id, data.path?.id ?? null).catch(() => null);
  return <ProgramView data={data} board={board} initialMode={modeParam(param(sp.mode))} offer={<OfferSlot placement="program_page" />} />;
}
