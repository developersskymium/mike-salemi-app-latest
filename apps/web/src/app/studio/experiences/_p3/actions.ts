"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { studioAdmin } from "@/lib/studio/guard";
import { studioDb } from "@/lib/studio/db";
import type { Result } from "@/lib/studio/actions";

/**
 * Retreat sign-up pipeline (P3): the Studio side of Apply → Schedule a call → (if approved) Pay.
 * Mark the call done, approve or decline, send the payment step, mark paid by hand. Every write is audited.
 */
type Step = "call_done" | "approve" | "decline" | "send_payment" | "mark_booked" | "call_link";

export async function retreatPipeline(applicationId: string, step: Step, value?: string): Promise<Result> {
  const admin = await studioAdmin();
  if (!z.uuid().safeParse(applicationId).success) return { ok: false, error: "Unknown application." };
  if (MOCK) return { ok: false, error: "Preview mode: writes are disabled in local mock data." };
  const db = await studioDb();
  const { data: app, error: e0 } = await db.from("run_applications").select("id, run_id, user_id, status, call_done_at").eq("id", applicationId).maybeSingle();
  if (e0 || !app) return { ok: false, error: e0?.message ?? "Application not found." };
  const now = new Date().toISOString();
  let cols: Record<string, unknown>;
  switch (step) {
    case "call_done":
      cols = { call_done_at: now, status: app.status === "submitted" ? "call_booked" : app.status };
      break;
    case "approve":
      cols = { status: "accepted", decided_at: now, call_done_at: app.call_done_at ?? now };
      break;
    case "decline":
      cols = { status: "declined", decided_at: now };
      break;
    case "send_payment":
      cols = { status: "accepted", payment_link_sent_at: now, decided_at: now };
      break;
    case "mark_booked":
      cols = { status: "booked" };
      break;
    case "call_link": {
      const url = (value ?? "").trim();
      if (url && !z.url().safeParse(url).success) return { ok: false, error: "Paste a full link (https://…)." };
      cols = { call_url: url || null };
      break;
    }
  }
  const { error } = await db.from("run_applications").update({ ...cols, updated_at: now }).eq("id", applicationId);
  if (error) return { ok: false, error: error.message };

  // Tell the member in the app when it's their move (approved / pay).
  if (step === "approve" || step === "send_payment") {
    const { data: run } = await db.from("program_runs").select("name").eq("id", app.run_id).maybeSingle();
    await db.from("notification_events").upsert(
      {
        user_id: app.user_id, kind: "retreat_approved", channel: "in_app", status: "sent",
        title: `You're approved for ${(run as { name?: string } | null)?.name ?? "the retreat"}`,
        body: "Confirm your place to open your retreat hub.", url: `/experiences/${app.run_id}#pay`,
        dedupe_key: `${applicationId}:${step}`,
      },
      { onConflict: "user_id,kind,channel,dedupe_key", ignoreDuplicates: true },
    );
  }
  await db.from("audit_log").insert({ actor: admin.id, action: `retreat_${step}`, entity: "run_applications", entity_id: applicationId, detail: cols });
  revalidatePath("/studio", "layout");
  revalidatePath(`/experiences/${app.run_id}`);
  return { ok: true, id: applicationId };
}

/** Executive Edge (and other by-application packages): accept or decline. */
export async function coachingApplication(applicationId: string, status: "call_booked" | "accepted" | "declined"): Promise<Result> {
  const admin = await studioAdmin();
  if (!z.uuid().safeParse(applicationId).success) return { ok: false, error: "Unknown application." };
  if (MOCK) return { ok: false, error: "Preview mode: writes are disabled in local mock data." };
  const db = await studioDb();
  const { error } = await db.from("coaching_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_log").insert({ actor: admin.id, action: `coaching_application_${status}`, entity: "coaching_applications", entity_id: applicationId, detail: { status } });
  revalidatePath("/studio", "layout");
  return { ok: true, id: applicationId };
}
