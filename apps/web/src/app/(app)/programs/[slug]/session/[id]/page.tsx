import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionPlayer } from "@/components/selfguided/SessionPlayer";
import { loadSessionPlayer } from "@/lib/loaders/selfguided";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await loadSessionPlayer(slug, id);
  return { title: data ? `${data.session.title} · ${data.program.name}` : "Session" };
}

/** Quick, custom, library and repeated sessions: the assembled parts, played in order. */
export default async function SessionPage({ params }: Props) {
  const { slug, id } = await params;
  const data = await loadSessionPlayer(slug, id);
  if (!data || !data.steps.length) notFound();
  return <SessionPlayer key={data.session.id} data={data} />;
}
