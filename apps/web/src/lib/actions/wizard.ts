"use server";

import { loadProgramPage } from "@/lib/loaders/training";
import { intentOf, type WizardDay } from "@/components/selfguided/wizardPlan";

/** The Self-Guided wizard's level step: one level's training days in order, with the member's progress. */
export async function wizardLevelAction(slug: string, pathKey: string | null): Promise<{ ok: true; pathKey: string | null; days: WizardDay[] } | { ok: false; message: string }> {
  try {
    const data = await loadProgramPage(slug, pathKey);
    if (!data) return { ok: false, message: "That level isn't available." };
    return { ok: true, pathKey: data.path?.key ?? null, days: wizardDays(data.lessons, data.progress) };
  } catch {
    return { ok: false, message: "Couldn't load that level. Try again." };
  }
}

function wizardDays(
  lessons: { id: string; title: string; dayNumber: number | null; dayType: string | null; pageType: string | null }[],
  progress: { lessonId: string; complete: boolean }[],
): WizardDay[] {
  const done = new Set(progress.filter((p) => p.complete).map((p) => p.lessonId));
  return lessons
    .filter((l) => l.dayNumber != null && !l.pageType)
    .sort((a, b) => a.dayNumber! - b.dayNumber!)
    .map((l) => ({ id: l.id, dayNumber: l.dayNumber!, title: l.title, dayType: l.dayType, intent: intentOf(l.dayType), minutes: null, done: done.has(l.id) }));
}
