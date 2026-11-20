import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { loadIntakePage } from "@/lib/loaders/course";

type Props = { params: Promise<{ program: string }>; searchParams: Promise<{ answers?: string; fresh?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program } = await params;
  const data = await loadIntakePage(program);
  return { title: data ? data.form.title : "Program intake", robots: { index: false } };
}

/**
 * Program intake by program slug: Kettlebell Lifestyle (13 steps → level), Mastering the Kettlebell
 * (assessment → /mtk/results) and every course ("Your program approach").
 * `?answers=1` reopens the questions prefilled, `?fresh=1` starts a new attempt.
 */
export default async function IntakePage({ params, searchParams }: Props) {
  const [{ program }, sp] = await Promise.all([params, searchParams]);
  const data = await loadIntakePage(program);
  if (!data) notFound();
  const start = sp.fresh ? "fresh" : sp.answers ? "flow" : data.latest ? "review" : "flow";
  // The MTK assessment's results live on the results page.
  if (data.kind === "mtk" && start === "review") redirect("/mtk/results");
  return <IntakeFlow key={start} data={data} start={start} />;
}
