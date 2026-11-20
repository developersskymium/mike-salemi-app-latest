"use server";

import { revalidatePath } from "next/cache";
import { profileFromAnswers, saveTrainingProfile, submitIntake, type IntakeResult } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

export type IntakeActionResult = { ok: true; result: IntakeResult } | { ok: false; code: "offline" | "rule" | "auth"; message: string };

type Answers = Record<string, string | string[]>;

/** Answers are short: text ≤ 1000 characters, multi-choice ≤ 16 options of ≤ 200 characters. */
function clean(a: Answers): Answers {
  const out: Answers = {};
  for (const [k, v] of Object.entries(a ?? {})) {
    if (!/^[a-z0-9_-]{1,64}$/i.test(k)) continue;
    if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 16).map((x) => x.slice(0, 200));
    else if (typeof v === "string") out[k] = v.slice(0, 1000);
  }
  return out;
}

/** Saves one intake attempt (and its shared answers to the training profile) (every attempt is its own row; earlier answers are kept) and returns the recommendation. */
export async function submitIntakeAction(formId: string, answers: Answers, slug: string, formKey?: string | null): Promise<IntakeActionResult> {
  try {
    if (MOCK) throw new Error("preview mode");
    const { supabase, user } = await getUser();
    if (!user) return { ok: false, code: "auth", message: "Please sign in again." };
    const a = clean(answers);
    const result = await submitIntake(supabase, formId, a);
    // Shared answers write back to the training profile so the next intake can skip them.
    const key = formKey ?? (await supabase.from("intake_forms").select("key").eq("id", formId).maybeSingle()).data?.key ?? null;
    const patch = profileFromAnswers(key, a);
    if (Object.keys(patch).length) await saveTrainingProfile(supabase, patch, key ?? "intake").catch(() => null);
    revalidatePath(`/intake/${slug}`);
    revalidatePath(`/programs/${slug}`);
    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (MOCK || /fetch failed|network|ENOTFOUND|ECONN|timeout/i.test(message)) {
      return { ok: false, code: "offline", message: "Couldn't reach the server. Your answers are kept on this screen — try again in a moment." };
    }
    return { ok: false, code: "rule", message: "Couldn't save your intake." };
  }
}
