import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { SelfGuidedHome } from "@/components/selfguided/SelfGuidedHome";
import { loadSelfGuidedHome } from "@/lib/loaders/selfguided";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Self-Guided", description: "The whole program, open. Go anywhere, any time." };

/** Legacy Self-Guided home: "Train it your way", level cards, every program, how it works. */
export default async function SelfGuidedHomePage({ params }: Props) {
  const { slug } = await params;
  const data = await loadSelfGuidedHome(slug);
  if (!data) notFound();
  return <SelfGuidedHome data={data} offer={<OfferSlot placement="program_page" />} />;
}
