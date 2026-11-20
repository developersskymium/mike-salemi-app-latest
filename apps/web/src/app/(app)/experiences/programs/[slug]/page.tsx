import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AmbientBackdrop } from "@/components/ui";
import { ConceptView } from "@/components/experiences/ConceptView";
import { loadConceptProgram } from "@/lib/loaders/experiences";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";

export async function generateMetadata(props: PageProps<"/experiences/programs/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await loadConceptProgram(slug).catch(() => null);
  return { title: d?.program.name ?? "Program", description: d?.program.tagline ?? d?.program.summary ?? undefined };
}

/**
 * Coaching, live, challenge and retreat programs (legacy program detail, layout L3).
 * The lead routes /programs/<slug> here for those types (the program page itself is training-owned).
 */
export default async function ConceptProgramPage(props: PageProps<"/experiences/programs/[slug]">) {
  const { slug } = await props.params;
  const data = await loadConceptProgram(slug);
  if (!data) notFound();
  return (
    <div className="com-page">
      {data.program.hero && <AmbientBackdrop src={data.program.hero.url} fixed />}
      <ConceptView data={data} />
    </div>
  );
}
