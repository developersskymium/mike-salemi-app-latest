"use server";

import { loadProgramPage } from "@/lib/loaders/training";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
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

export interface OtherLevelPlan {
  id: string;
  name: string;
  /** The level that plan follows, e.g. "Level I". */
  level: string;
}

/**
 * Active plans that follow a different level of the same program (e.g. a Level I schedule while starting Level II),
 * so the wizard can offer "Replace your Level I schedule?". Read-only; the member decides.
 */
export async function otherLevelPlansAction(slug: string, pathKey: string | null): Promise<OtherLevelPlan[]> {
  try {
    if (MOCK) {
      const base = await loadProgramPage(slug, null);
      const first = base?.paths[0];
      if (!first || !pathKey || first.key === pathKey) return [];
      const level = first.shortName ?? first.name;
      return [{ id: "preview-level-plan", name: `${base.program.name} · ${level} · 3×/week`, level }];
    }
    const { supabase: sb, user } = await getUser();
    if (!user) return [];
    const { data: program } = await sb.from("programs").select("id").eq("slug", slug).maybeSingle();
    if (!program) return [];
    const [{ data: plans }, { data: paths }] = await Promise.all([
      sb.from("member_plans").select("id, name").eq("user_id", user.id).eq("status", "active"),
      sb.from("program_paths").select("id, key, name, short_name").eq("program_id", program.id),
    ]);
    if (!plans?.length || (paths?.length ?? 0) < 2) return [];
    const { data: items } = await sb.from("plan_items").select("plan_id, lesson_id").in("plan_id", plans.map((p) => p.id)).not("lesson_id", "is", null).limit(2000);
    const lessonIds = [...new Set((items ?? []).map((i) => i.lesson_id as string))];
    if (!lessonIds.length) return [];
    const { data: lessons } = await sb.from("lessons").select("id, path_id").eq("program_id", program.id).in("id", lessonIds);
    const pathOf = new Map((lessons ?? []).map((l) => [l.id as string, l.path_id as string | null]));
    const out: OtherLevelPlan[] = [];
    for (const p of plans) {
      const pathIds = new Set((items ?? []).filter((i) => i.plan_id === p.id).map((i) => pathOf.get(i.lesson_id as string)).filter(Boolean) as string[]);
      const other = (paths ?? []).find((x) => pathIds.has(x.id) && x.key !== pathKey);
      const same = (paths ?? []).some((x) => pathIds.has(x.id) && x.key === pathKey);
      if (other && !same) out.push({ id: p.id, name: p.name, level: other.short_name ?? other.name });
    }
    return out;
  } catch {
    return [];
  }
}
