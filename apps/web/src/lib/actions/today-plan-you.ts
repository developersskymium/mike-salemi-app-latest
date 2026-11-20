"use server";

import {
  applyMissedDayRule,
  markPlanItem,
  savePlanDraft,
  setPlanStatus,
  startPlanFromTemplate,
  submitIntake,
  type DB,
  type IntakeAnswers,
  type IntakeResult,
} from "@ms/api";
import type { IsoDate } from "@ms/core";
import { revalidatePath } from "next/cache";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Local preview cannot reach the database: writes fail with a typed error the UI handles. */
const OFFLINE: ActionResult<never> = { ok: false, error: "offline" };

async function run<T>(fn: (sb: DB, userId: string) => Promise<T>, paths: string[] = []): Promise<ActionResult<T>> {
  if (MOCK) return OFFLINE;
  try {
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, error: "signed_out" };
    const data = await fn(supabase as unknown as DB, user.id);
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

const isDate = (d: unknown): d is IsoDate => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const isDays = (d: unknown): d is number[] => Array.isArray(d) && d.length > 0 && d.every((x) => Number.isInteger(x) && x >= 0 && x <= 6);

/* ------------------------------------------------------------- onboarding */

export async function submitGoalIntake(formId: string, answers: IntakeAnswers): Promise<ActionResult<IntakeResult>> {
  // Preview: the recorded response of the real submit_intake for these answers.
  if (MOCK) return { ok: true, data: await fixture<IntakeResult>("tpy-intake-result") };
  return run((sb) => submitIntake(sb, formId, answers), ["/today", "/plan"]);
}

export async function skipOnboarding(): Promise<ActionResult> {
  return run(async (sb, userId) => {
    const { data } = await sb.from("profiles").select("onboarding").eq("id", userId).single();
    const cur = (data?.onboarding && typeof data.onboarding === "object" ? data.onboarding : {}) as Record<string, unknown>;
    const { error } = await sb.from("profiles").update({ onboarding: { ...cur, goal_skipped: true } }).eq("id", userId);
    if (error) throw new Error(error.message);
    return undefined;
  }, ["/today"]);
}

/* ------------------------------------------------------------- plans */

export async function startTemplatePlan(templateId: string, days: number[], startsOn: IsoDate | null): Promise<ActionResult<string>> {
  if (!isDays(days)) return { ok: false, error: "Choose at least one day" };
  if (startsOn !== null && !isDate(startsOn)) return { ok: false, error: "Invalid date" };
  return run((sb) => startPlanFromTemplate(sb, templateId, startsOn, days), ["/plan", "/today"]);
}

export async function fixMyPlan(planId: string): Promise<ActionResult<{ rule: string; missed: number; changed: number; offset_days?: number }>> {
  return run((sb) => applyMissedDayRule(sb, planId), ["/plan", "/today"]);
}

export async function setItemDone(itemId: string, done: boolean): Promise<ActionResult> {
  return run(async (sb) => markPlanItem(sb, itemId, { done }), ["/plan", "/today"]);
}

export async function skipItem(itemId: string, skipped: boolean): Promise<ActionResult> {
  return run(async (sb) => markPlanItem(sb, itemId, { skipped }), ["/plan", "/today"]);
}

export async function moveItem(itemId: string, onDate: IsoDate): Promise<ActionResult> {
  if (!isDate(onDate)) return { ok: false, error: "Invalid date" };
  return run(async (sb) => markPlanItem(sb, itemId, { onDate }), ["/plan", "/today"]);
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  return run(async (sb) => {
    const { error } = await sb.from("plan_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
    return undefined;
  }, ["/plan", "/today"]);
}

/** Adds a lesson to the member's own plan ("My plan"), creating that plan the first time. */
export async function addLessonToDay(lessonId: string, title: string, onDate: IsoDate): Promise<ActionResult<{ itemId: string; planId: string }>> {
  if (!isDate(onDate)) return { ok: false, error: "Invalid date" };
  return run(async (sb, userId) => {
    const { data: existing } = await sb
      .from("member_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "custom")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const planId = existing?.id ?? (await savePlanDraft(sb, userId, { startsOn: onDate, items: [], inputs: {} }, { name: "My plan", source: "custom" }));
    const { count } = await sb.from("plan_items").select("*", { count: "exact", head: true }).eq("plan_id", planId).eq("on_date", onDate);
    const { data, error } = await sb
      .from("plan_items")
      .insert({ plan_id: planId, user_id: userId, on_date: onDate, kind: "training", lesson_id: lessonId, title, position: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { itemId: data.id, planId };
  }, ["/plan", "/today"]);
}

export async function updatePlanStatus(planId: string, status: "active" | "paused" | "archived"): Promise<ActionResult> {
  return run(async (sb) => setPlanStatus(sb, planId, status), ["/plan", "/today"]);
}

/* ------------------------------------------------------------- you */

async function mergePrefs(sb: DB, userId: string, patch: Record<string, unknown>) {
  const { data } = await sb.from("profiles").select("preferences").eq("id", userId).single();
  const cur = (data?.preferences && typeof data.preferences === "object" ? data.preferences : {}) as Record<string, unknown>;
  const { error } = await sb.from("profiles").update({ preferences: { ...cur, ...patch } as never }).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function setAutoplay(on: boolean): Promise<ActionResult> {
  return run(async (sb, userId) => mergePrefs(sb, userId, { autoplay: !!on }), ["/you/settings"]);
}

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, error: "Enter your name" };
  return run(async (sb, userId) => {
    const { error } = await sb.from("profiles").update({ display_name: n, first_name: n.split(/\s+/)[0] }).eq("id", userId);
    if (error) throw new Error(error.message);
    return undefined;
  }, ["/you", "/you/settings", "/today"]);
}

const PREF_KEYS = ["email_enabled", "push_enabled", "reminder_time", "reminder_days", "quiet_start", "quiet_end", "streak_nudge", "weekly_recap", "offers_email"] as const;
type PrefPatch = Partial<Record<(typeof PREF_KEYS)[number], unknown>>;

export async function saveNotificationPrefs(patch: PrefPatch): Promise<ActionResult> {
  const clean: Record<string, unknown> = {};
  for (const k of PREF_KEYS) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (k === "reminder_days") {
      if (!Array.isArray(v) || !v.every((x) => Number.isInteger(x) && x >= 0 && x <= 6)) return { ok: false, error: "Invalid days" };
    } else if (k === "reminder_time" || k === "quiet_start" || k === "quiet_end") {
      if (!(v === null || (typeof v === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(v)))) return { ok: false, error: "Invalid time" };
    } else if (typeof v !== "boolean") return { ok: false, error: "Invalid value" };
    clean[k] = v;
  }
  return run(async (sb, userId) => {
    const { error } = await sb.from("notification_prefs").upsert({ user_id: userId, ...clean, updated_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    return undefined;
  }, ["/you/settings"]);
}
