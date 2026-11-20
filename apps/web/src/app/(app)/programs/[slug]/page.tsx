import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { ProgramView } from "@/components/training/ProgramView";
import { loadProgramPage } from "@/lib/loaders/training";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const pathParam = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : null);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProgramPage(slug, pathParam((await searchParams).path));
  if (!data) return { title: "Program" };
  return { title: data.path && data.paths.length > 1 ? `${data.program.name}, ${data.path.shortName ?? data.path.name}` : data.program.name };
}

/** Program page: hero ridge, levels, mode and pace, phase map, plans and the one primary action. */
export default async function ProgramPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await loadProgramPage(slug, pathParam((await searchParams).path));
  if (!data) notFound();
  return (
    <ProgramView data={data} offer={<OfferSlot placement="program_page" />} />
  );
}
