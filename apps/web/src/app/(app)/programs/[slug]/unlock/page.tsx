import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasAccess } from "@ms/api";
import { SalesSheet } from "@/components/access/SalesSheet";
import { getAccessMap, previewLessonFor } from "@/lib/access";
import { loadProgramsTab, loadSales } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> };

export const metadata: Metadata = { title: "Unlock program" };

/**
 * The program's sales sheet inside the app: where the access guard sends members who open a lesson
 * they don't have yet. Never a dead end: the free preview, the outline with locks, and one action.
 */
export default async function UnlockPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await getUser();
  const [tab, access, sales, preview] = await Promise.all([
    loadProgramsTab(supabase),
    getAccessMap(),
    loadSales(supabase, slug).catch(() => null),
    previewLessonFor(slug).catch(() => null),
  ]);
  const program = tab.catalog.find((p) => p.slug === slug);
  if (!program) notFound();
  const a = access.get(slug) ?? null;
  // Already has it (e.g. just bought): go straight in.
  if (hasAccess(a)) redirect(`/programs/${slug}`);
  const plans = tab.catalog.length ? sales?.plans ?? null : null;
  return <SalesSheet program={program} access={a} outline={sales?.outline ?? []} previewLessonId={preview} from={sp.from ?? null} plans={plans} />;
}
