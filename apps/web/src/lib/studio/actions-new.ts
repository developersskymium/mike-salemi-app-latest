"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { PHOTO } from "@/lib/photos";
import { studioAdmin } from "./guard";
import { studioDb, type Db } from "./db";
import { FULFILLMENT, LEAD_STATUS, REQUEST_STATUS } from "./tables";
import type { Result } from "./actions";

/** Studio writes for the Nov 20 content. Each verifies the admin role (studioAdmin) before touching the database. */
const fail = (error: string): Result => ({ ok: false, error });
const PREVIEW = "Preview mode: writes are disabled in local mock data.";

async function write(action: string, entity: string, run: (db: Db, actor: string) => Promise<{ id?: string | null; detail?: Record<string, unknown>; error?: string }>): Promise<Result> {
  const admin = await studioAdmin();
  if (MOCK) return fail(PREVIEW);
  const db = await studioDb();
  try {
    const r = await run(db, admin.id);
    if (r.error) return fail(r.error);
    await db.from("audit_log").insert({ actor: admin.id, action, entity, entity_id: r.id ?? null, detail: r.detail ?? {} });
    revalidatePath("/studio", "layout");
    return { ok: true, id: r.id ?? undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Something went wrong");
  }
}

const parse = <T>(s: z.ZodType<T>, v: unknown): { ok: true; data: T } | { ok: false; error: string } => {
  const r = s.safeParse(v);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues.map((i) => i.message).join(" · ") };
};
const uuid = z.string().uuid("Not a valid id");
const optUrl = z.string().trim().max(600).refine((s) => s === "" || /^https?:\/\//i.test(s), "Links must start with http:// or https://");

async function putSetting(db: Db, key: string, value: Record<string, unknown>) {
  const { error } = await db.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error?.message;
}

// ------------------------------------------------------------------ Home content

const noteSchema = z.object({
  text: z.string().trim().min(1, "Write the note").max(600, "Keep the note under 600 characters"),
  photo: z.string().refine((p) => p === "" || p in PHOTO, "Pick a photo from the list"),
  week_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Week: pick the Monday of the week"),
  enabled: z.boolean(),
});
export async function saveMikeNote(v: z.input<typeof noteSchema>): Promise<Result> {
  await studioAdmin();
  const p = parse(noteSchema, v);
  if (!p.ok) return fail(p.error);
  const value = { text: p.data.text, photo: p.data.photo || null, week_of: p.data.week_of, enabled: p.data.enabled };
  return write("update", "site_settings", async (db) => ({ id: "home_mike_note", detail: { week_of: value.week_of }, error: await putSetting(db, "home_mike_note", value) }));
}

const picksSchema = z.object({
  ids: z.array(uuid).max(8, "Pick up to 8 videos"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month: YYYY-MM"),
});
export async function saveLibraryPicks(v: z.input<typeof picksSchema>): Promise<Result> {
  await studioAdmin();
  const p = parse(picksSchema, v);
  if (!p.ok) return fail(p.error);
  const ids = [...new Set(p.data.ids)];
  return write("update", "site_settings", async (db) => ({ id: "library_picks", detail: { count: ids.length, month: p.data.month }, error: await putSetting(db, "library_picks", { ids, month: p.data.month }) }));
}

// ------------------------------------------------------------------ Coaching

export async function replyAsMike(memberId: string, body: string): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ memberId: uuid, body: z.string().trim().min(1, "Write a reply").max(4000, "Keep replies under 4,000 characters") }), { memberId, body });
  if (!p.ok) return fail(p.error);
  return write("create", "coaching_messages", async (db, actor) => {
    const now = new Date().toISOString();
    const { data, error } = await db.from("coaching_messages").insert({ member_id: p.data.memberId, author_id: actor, from_coach: true, body: p.data.body }).select("id").single();
    if (error) return { error: error.message };
    await db.from("coaching_messages").update({ read_at: now }).eq("member_id", p.data.memberId).eq("from_coach", false).is("read_at", null);
    return { id: (data as { id: string }).id, detail: { member_id: p.data.memberId } };
  });
}

export async function markThreadRead(memberId: string): Promise<Result> {
  await studioAdmin();
  const p = parse(uuid, memberId);
  if (!p.ok) return fail(p.error);
  return write("update", "coaching_messages", async (db) => {
    const { error } = await db.from("coaching_messages").update({ read_at: new Date().toISOString() }).eq("member_id", p.data).eq("from_coach", false).is("read_at", null);
    return { id: p.data, detail: { read: true }, error: error?.message };
  });
}

/** Homework for one session: items one per line (members tick each day). Empty clears it. */
export async function saveHomework(bookingId: string, items: string[]): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ id: uuid, items: z.array(z.string().trim().max(300, "Keep each item under 300 characters")).max(10, "Up to 10 items") }), { id: bookingId, items });
  if (!p.ok) return fail(p.error);
  const list = p.data.items.filter(Boolean);
  return write("update", "coaching_bookings", async (db) => {
    const { error } = await db.from("coaching_bookings").update({ homework: list.length ? list.join("\n") : null }).eq("id", p.data.id);
    return { id: p.data.id, detail: { homework_items: list.length }, error: error?.message };
  });
}

export async function confirmLiveDate(id: string): Promise<Result> {
  await studioAdmin();
  const p = parse(uuid, id);
  if (!p.ok) return fail(p.error);
  return write("update", "coaching_live_sessions", async (db) => {
    const { error } = await db.from("coaching_live_sessions").update({ draft_note: null }).eq("id", p.data);
    return { id: p.data, detail: { confirmed: true }, error: error?.message };
  });
}

// ------------------------------------------------------------------ Retreats

export async function setLeadStatus(id: string, status: string, note: string): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ id: uuid, status: z.enum(LEAD_STATUS), note: z.string().trim().max(2000) }), { id, status, note });
  if (!p.ok) return fail(p.error);
  return write("update", "retreat_leads", async (db) => {
    const { error } = await db.from("retreat_leads").update({ status: p.data.status, admin_note: p.data.note || null, handled_at: p.data.status === "new" ? null : new Date().toISOString() }).eq("id", p.data.id);
    return { id: p.data.id, detail: { status: p.data.status }, error: error?.message };
  });
}

export async function setWallHidden(id: string, hidden: boolean): Promise<Result> {
  await studioAdmin();
  const p = parse(uuid, id);
  if (!p.ok) return fail(p.error);
  return write(hidden ? "hide" : "unhide", "run_wall_posts", async (db) => {
    const { error } = await db.from("run_wall_posts").update({ hidden_at: hidden ? new Date().toISOString() : null }).eq("id", p.data);
    return { id: p.data, error: error?.message };
  });
}

const facilitator = z.object({
  name: z.string().trim().min(1, "Each facilitator needs a name").max(80),
  role: z.string().trim().max(80),
  line: z.string().trim().max(240),
  photo: z.string().trim().max(600).refine((s) => s === "" || /^(https?:\/\/|\/)/i.test(s), "Photo: a web address or a /media path"),
});
export async function saveFacilitators(runId: string, list: z.input<typeof facilitator>[]): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ id: uuid, list: z.array(facilitator).max(12) }), { id: runId, list });
  if (!p.ok) return fail(p.error);
  return write("update", "program_runs", async (db) => {
    const { data: run, error: e1 } = await db.from("program_runs").select("details").eq("id", p.data.id).single();
    if (e1 || !run) return { error: e1?.message ?? "Run not found" };
    const clean = p.data.list.map((f) => ({ name: f.name, role: f.role, ...(f.line ? { line: f.line } : {}), ...(f.photo ? { photo: f.photo } : {}) }));
    const details = { ...((run as { details: Record<string, unknown> | null }).details ?? {}), facilitators: clean };
    const { error } = await db.from("program_runs").update({ details }).eq("id", p.data.id);
    return { id: p.data.id, detail: { facilitators: clean.length }, error: error?.message };
  });
}

const testimonialSchema = z.object({ name: z.string().trim().max(80), line: z.string().trim().max(280), video_url: optUrl, poster: z.string().trim().max(600) });
/** programs.meta.testimonial: shown on the retreat page once a video URL is set. Empty video clears it. */
export async function saveTestimonial(programId: string, v: z.input<typeof testimonialSchema>): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ id: uuid, v: testimonialSchema }), { id: programId, v });
  if (!p.ok) return fail(p.error);
  return write("update", "programs", async (db) => {
    const { data: prog, error: e1 } = await db.from("programs").select("meta").eq("id", p.data.id).single();
    if (e1 || !prog) return { error: e1?.message ?? "Program not found" };
    const meta = { ...((prog as { meta: Record<string, unknown> | null }).meta ?? {}) };
    if (p.data.v.video_url) meta.testimonial = { name: p.data.v.name, line: p.data.v.line, video_url: p.data.v.video_url, ...(p.data.v.poster ? { poster: p.data.v.poster } : {}) };
    else delete meta.testimonial;
    const { error } = await db.from("programs").update({ meta }).eq("id", p.data.id);
    return { id: p.data.id, detail: { testimonial: Boolean(p.data.v.video_url) }, error: error?.message };
  });
}

// ------------------------------------------------------------------ Account requests

export async function setRequestStatus(id: string, status: string, note: string): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ id: uuid, status: z.enum(REQUEST_STATUS), note: z.string().trim().max(4000) }), { id, status, note });
  if (!p.ok) return fail(p.error);
  return write("update", "account_requests", async (db) => {
    const done = p.data.status === "done" || p.data.status === "withdrawn";
    const { error } = await db.from("account_requests").update({ status: p.data.status, admin_note: p.data.note || null, handled_at: done ? new Date().toISOString() : null }).eq("id", p.data.id);
    return { id: p.data.id, detail: { status: p.data.status }, error: error?.message };
  });
}

// ------------------------------------------------------------------ Shop orders

const fulfilSchema = z.object({
  id: uuid,
  fulfillment: z.enum(FULFILLMENT).or(z.literal("")),
  carrier: z.string().trim().max(60),
  number: z.string().trim().max(80),
  url: optUrl,
});
/** Fulfilment status + tracking. Shipped / delivered stamp their time the first time they are set. */
export async function saveFulfilment(v: z.input<typeof fulfilSchema>): Promise<Result> {
  await studioAdmin();
  const p = parse(fulfilSchema, v);
  if (!p.ok) return fail(p.error);
  const d = p.data;
  if ((d.fulfillment === "shipped" || d.fulfillment === "delivered") && !d.number && !d.url) return fail("Add a tracking number or link before marking it shipped");
  return write("update", "orders", async (db) => {
    const { data: o, error: e1 } = await db.from("orders").select("shipped_at,delivered_at").eq("id", d.id).single();
    if (e1 || !o) return { error: e1?.message ?? "Order not found" };
    const cur = o as { shipped_at: string | null; delivered_at: string | null };
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { fulfillment: d.fulfillment || null, tracking_carrier: d.carrier || null, tracking_number: d.number || null, tracking_url: d.url || null };
    if (d.fulfillment === "shipped" || d.fulfillment === "delivered") patch.shipped_at = cur.shipped_at ?? now;
    if (d.fulfillment === "delivered") patch.delivered_at = cur.delivered_at ?? now;
    if (d.fulfillment === "processing" || d.fulfillment === "") { patch.shipped_at = null; patch.delivered_at = null; }
    if (d.fulfillment === "shipped") patch.delivered_at = null;
    const { error } = await db.from("orders").update(patch).eq("id", d.id);
    return { id: d.id, detail: { fulfillment: d.fulfillment || null }, error: error?.message };
  });
}

// ------------------------------------------------------------------ Badges

/** Pick the bonus video a perk badge unlocks: perk.video_id + href to that video. Other perk fields stay. */
export async function saveBadgeBonusVideo(badgeId: string, videoId: string, label: string, detail: string): Promise<Result> {
  await studioAdmin();
  const p = parse(z.object({ badge: z.string().min(1).max(120), video: uuid.or(z.literal("")), label: z.string().trim().min(1, "Give the perk a label").max(120), detail: z.string().trim().max(240) }), { badge: badgeId, video: videoId, label, detail });
  if (!p.ok) return fail(p.error);
  return write("update", "badges", async (db) => {
    const { data: b, error: e1 } = await db.from("badges").select("perk").eq("id", p.data.badge).single();
    if (e1 || !b) return { error: e1?.message ?? "Badge not found" };
    const prev = ((b as { perk: Record<string, unknown> | null }).perk ?? {}) as Record<string, unknown>;
    if (prev.kind && prev.kind !== "bonus_video") return { error: "This badge's perk is not a bonus video" };
    const perk: Record<string, unknown> = { ...prev, kind: "bonus_video", label: p.data.label, detail: p.data.detail || null };
    if (p.data.video) { perk.video_id = p.data.video; perk.href = `/library/${p.data.video}`; }
    else { delete perk.video_id; perk.href = "/library"; }
    const { error } = await db.from("badges").update({ perk }).eq("id", p.data.badge);
    if (error) return { error: error.message };
    // Members who already earned it: point their perk at the new video too.
    const { error: e2 } = await db.from("member_perks").update({ href: perk.href, label: perk.label, detail: perk.detail }).eq("badge_id", p.data.badge).eq("kind", "bonus_video");
    return { id: p.data.badge, detail: { video_id: p.data.video || null }, error: e2?.message };
  });
}
