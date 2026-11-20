import { redirect } from "next/navigation";
import { loadProgramPage } from "@/lib/loaders/training";

type Props = { params: Promise<{ slug: string }> };

/**
 * One schedule (spec 11 #1): the old per-program plan creator is gone. Programs with a day-by-day plan
 * open the Self-Guided wizard (which feeds the main schedule); everything else uses the main creator.
 */
export default async function ProgramPlanRedirect({ params }: Props) {
  const { slug } = await params;
  const data = await loadProgramPage(slug, null).catch(() => null);
  const hasDays = !!data && data.program.access !== "locked" && !data.locked && data.lessons.some((l) => l.dayNumber != null);
  redirect(hasDays ? `/programs/${slug}/session/wizard` : `/plan/create`);
}
