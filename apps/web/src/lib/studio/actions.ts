"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { studioAdmin } from "./guard";
import { studioDb, type Db } from "./db";
import { cfg, parseValues, parseVimeo, MODES } from "./tables";

export type Result<T = unknown> = { ok: true; id?: string; data?: T; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const PREVIEW = "Preview mode: writes are disabled in local mock data.";

async function audit(db: Db, actor: string, action: string, entity: string, entityId: string | null, detail: Record<string, unknown> = {}) {
  await db.from("audit_log").insert({ actor, action, entity, entity_id: entityId, detail });
}

/** Every write goes through here: guard, validate, (preview short-circuit), run, audit, revalidate. */
async function write(action: string, entity: string, run: (db: Db, actor: string) => Promise<{ id?: string | null; detail?: Record<string, unknown>; error?: string }>): Promise<Result> {
  const admin = await studioAdmin();
  if (MOCK) return fail(PREVIEW);
  const db = await studioDb();
  try {
    const r = await run(db, admin.id);
    if (r.error) return fail(r.error);
    await audit(db, admin.id, action, entity, r.id ?? null, r.detail ?? {});
    revalidatePath("/studio", "layout");
    return { ok: true, id: r.id ?? undefined };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Something went wrong");
  }
}

/** Validation first (so errors show in preview too), then the write. */
function checked(table: string, values: Record<string, unknown>, creating: boolean) {
  const c = cfg(table);
  if (!c) return { error: `Unknown table ${table}` } as const;
  const p = parseValues(c, values, creating);
  return p.ok ? ({ c, data: p.data } as const) : ({ error: p.errors.join(" · ") } as const);
}

const refSchema = z.record(z.string(), z.string());

async function nextPosition(db: Db, table: string, scope: Record<string, unknown>): Promise<number> {
  let q = db.from(table).select("position").order("position", { ascending: false }).limit(1);
  for (const [k, v] of Object.entries(scope)) q = v == null ? q.is(k, null) : q.eq(k, v);
  const { data } = await q;
  const top = (data as { position: number }[] | null)?.[0]?.position;
  return top == null ? 0 : top + 1;
}

/** Create or update one row of a configured table. `pk` identifies it for updates; `fixed` are parent columns (program_id…). */
export async function saveRecord(table: string, pk: Record<string, string> | null, values: Record<string, unknown>, fixed: Record<string, unknown> = {}): Promise<Result> {
  await studioAdmin();
  const v = checked(table, values, pk === null);
  if ("error" in v) return fail(v.error!);
  const { c, data } = v;
  return write(pk ? "update" : "create", table, async (db) => {
    if (pk) {
      const keys = refSchema.parse(pk);
      let q = db.from(table).update(data);
      for (const k of c.pk) q = q.eq(k, keys[k]);
      const { error } = await q;
      return { id: Object.values(keys).join("/"), detail: { title: data[c.title ?? ""] ?? null, changed: Object.keys(data) }, error: error?.message };
    }
    const row: Record<string, unknown> = { ...data, ...fixed };
    if (c.positioned && row.position === undefined) row.position = await nextPosition(db, table, Object.fromEntries((c.scope ?? []).map((k) => [k, fixed[k] ?? null])));
    const { data: out, error } = await db.from(table).insert(row).select(c.pk.join(",")).single();
    const id = out ? c.pk.map((k) => (out as unknown as Record<string, string>)[k]).join("/") : null;
    return { id, detail: { title: data[c.title ?? ""] ?? null }, error: error?.message };
  });
}

export async function deleteRecord(table: string, pk: Record<string, string>): Promise<Result> {
  await studioAdmin();
  const c = cfg(table);
  if (!c) return fail("Unknown table");
  return write("delete", table, async (db) => {
    const keys = refSchema.parse(pk);
    let q = db.from(table).delete();
    for (const k of c.pk) q = q.eq(k, keys[k]);
    const { error } = await q;
    return { id: Object.values(keys).join("/"), error: error?.message };
  });
}

/** Swap a row with its neighbour and renumber siblings 0..n. */
export async function moveRecord(table: string, pk: Record<string, string>, dir: "up" | "down"): Promise<Result> {
  await studioAdmin();
  const c = cfg(table);
  if (!c?.positioned) return fail("Not orderable");
  return write("reorder", table, async (db) => {
    const keys = refSchema.parse(pk);
    const idCol = c.pk[c.pk.length - 1]!;
    let rowQ = db.from(table).select("*");
    for (const k of c.pk) rowQ = rowQ.eq(k, keys[k]);
    const { data: row } = await rowQ.single();
    if (!row) return { error: "Row not found" };
    let sq = db.from(table).select(c.pk.join(",") + ",position").order("position").order(idCol);
    for (const k of c.scope ?? []) sq = (row as Record<string, unknown>)[k] == null ? sq.is(k, null) : sq.eq(k, (row as Record<string, unknown>)[k]);
    const { data: sib } = await sq;
    const list = (sib ?? []) as unknown as Record<string, string | number>[];
    const i = list.findIndex((r) => r[idCol] === keys[idCol]);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return { id: keys[idCol] };
    [list[i], list[j]] = [list[j]!, list[i]!];
    for (let n = 0; n < list.length; n++) {
      const r = list[n]!;
      let uq = db.from(table).update({ position: n });
      for (const k of c.pk) uq = uq.eq(k, String(r[k]));
      const { error } = await uq;
      if (error) return { error: error.message };
    }
    return { id: keys[idCol], detail: { dir } };
  });
}

/** Guided program create: program + learning modes + optional hero/card images by URL. */
export async function createProgram(values: Record<string, unknown>, modes: string[], defaultMode: string, images: { hero?: string; card?: string }): Promise<Result> {
  await studioAdmin();
  const v = checked("programs", values, true);
  if ("error" in v) return fail(v.error!);
  const chosen = modes.filter((m) => (MODES as readonly string[]).includes(m));
  return write("create", "programs", async (db) => {
    const { data: p, error } = await db.from("programs").insert({ ...v.data, position: await nextPosition(db, "programs", {}) }).select("id").single();
    if (error || !p) return { error: error?.message ?? "Could not create" };
    const id = (p as { id: string }).id;
    if (chosen.length) await db.from("program_modes").insert(chosen.map((mode) => ({ program_id: id, mode, is_default: mode === defaultMode })));
    const media = (["hero", "card"] as const).filter((r) => images[r]?.trim()).map((role, i) => ({ program_id: id, role, url: images[role]!.trim(), alt: String(v.data.name), position: i }));
    if (media.length) await db.from("program_media").insert(media);
    return { id, detail: { title: v.data.name, modes: chosen } };
  });
}

export async function setProgramModes(programId: string, modes: string[], defaultMode: string): Promise<Result> {
  await studioAdmin();
  const chosen = modes.filter((m) => (MODES as readonly string[]).includes(m));
  return write("update", "program_modes", async (db) => {
    await db.from("program_modes").delete().eq("program_id", programId);
    if (chosen.length) {
      const { error } = await db.from("program_modes").insert(chosen.map((mode) => ({ program_id: programId, mode, is_default: mode === (chosen.includes(defaultMode) ? defaultMode : chosen[0]) })));
      if (error) return { error: error.message };
    }
    return { id: programId, detail: { modes: chosen } };
  });
}

/** Attach a Vimeo video to a step from a pasted URL or id + hash. Creates the library row when needed. */
export async function setStepVideo(stepId: string, input: string, hash: string, title: string): Promise<Result> {
  await studioAdmin();
  if (!input.trim()) return write("update", "steps", async (db) => {
    const { error } = await db.from("steps").update({ video_id: null }).eq("id", stepId);
    return { id: stepId, detail: { video: null }, error: error?.message };
  });
  const parsed = parseVimeo(input);
  if (!parsed) return fail("Could not read a Vimeo id from that. Paste the vimeo.com link or the numeric id.");
  const key = (hash.trim() || parsed.hash || "").toLowerCase();
  if (key && !/^[0-9a-f]{6,}$/.test(key)) return fail("The privacy key looks wrong: it is a short run of letters and numbers.");
  return write("update", "steps", async (db) => {
    const { data: found } = await db.from("videos").select("id,privacy_hash").eq("provider", "vimeo").eq("provider_id", parsed.id).maybeSingle();
    let videoId = (found as { id: string } | null)?.id;
    if (videoId) {
      if (key) await db.from("videos").update({ privacy_hash: key, needs_key: false }).eq("id", videoId);
    } else {
      const { data: made, error } = await db.from("videos").insert({ provider: "vimeo", provider_id: parsed.id, privacy_hash: key || null, needs_key: !key, title: title.trim() || `Vimeo ${parsed.id}` }).select("id").single();
      if (error || !made) return { error: error?.message ?? "Could not create video" };
      videoId = (made as { id: string }).id;
    }
    const { error } = await db.from("steps").update({ video_id: videoId }).eq("id", stepId);
    return { id: stepId, detail: { video_id: videoId, vimeo: parsed.id }, error: error?.message };
  });
}

/** Add a Vimeo clip to a step's playlist from a pasted link or id. */
export async function addStepClip(stepId: string, input: string, hash: string, title: string): Promise<Result> {
  await studioAdmin();
  const parsed = parseVimeo(input);
  if (!parsed) return fail("Could not read a Vimeo id from that.");
  const key = (hash.trim() || parsed.hash || "").toLowerCase();
  return write("create", "step_videos", async (db) => {
    const { data: found } = await db.from("videos").select("id").eq("provider", "vimeo").eq("provider_id", parsed.id).maybeSingle();
    let videoId = (found as { id: string } | null)?.id;
    if (!videoId) {
      const { data: made, error } = await db.from("videos").insert({ provider: "vimeo", provider_id: parsed.id, privacy_hash: key || null, needs_key: !key, title: title.trim() || `Vimeo ${parsed.id}` }).select("id").single();
      if (error || !made) return { error: error?.message ?? "Could not create video" };
      videoId = (made as { id: string }).id;
    }
    const { error } = await db.from("step_videos").insert({ step_id: stepId, video_id: videoId, title: title.trim(), position: await nextPosition(db, "step_videos", { step_id: stepId }) });
    return { id: stepId, detail: { video_id: videoId }, error: error?.message };
  });
}

export async function setVideoKey(videoId: string, hash: string): Promise<Result> {
  await studioAdmin();
  const key = hash.trim().toLowerCase();
  if (!/^[0-9a-f]{6,}$/.test(key)) return fail("Paste the hash after the id (e.g. vimeo.com/123456/abcdef1234), letters a-f and numbers.");
  return write("update", "videos", async (db) => {
    const { error } = await db.from("videos").update({ privacy_hash: key, needs_key: false }).eq("id", videoId);
    return { id: videoId, detail: { key_set: true }, error: error?.message };
  });
}

export async function setVideoTags(videoId: string, tagIds: string[]): Promise<Result> {
  await studioAdmin();
  return write("update", "video_tags", async (db) => {
    await db.from("video_tags").delete().eq("video_id", videoId);
    if (tagIds.length) await db.from("video_tags").insert(tagIds.map((tag_id) => ({ video_id: videoId, tag_id })));
    return { id: videoId, detail: { tags: tagIds.length } };
  });
}

/** Benefits grid cell: none / discount % / included for a plan and program. */
export async function setBenefit(planId: string, programId: string, benefit: "none" | "discount" | "included", percent: number | null): Promise<Result> {
  await studioAdmin();
  if (benefit === "discount" && !(percent && percent > 0 && percent <= 100)) return fail("Discount needs a percent between 1 and 100.");
  return write("update", "plan_program_benefits", async (db) => {
    const { error } = await db.from("plan_program_benefits").upsert({ plan_id: planId, program_id: programId, scope: "content", benefit, discount_percent: benefit === "discount" ? percent : null, coaching_credits: null }, { onConflict: "plan_id,program_id,scope" });
    return { id: `${planId}/${programId}`, detail: { benefit, percent }, error: error?.message };
  });
}

export async function grantAccess(userId: string, programId: string, endsAt: string, note: string): Promise<Result> {
  await studioAdmin();
  if (!userId || !programId) return fail("Pick a program.");
  const ends = endsAt ? new Date(endsAt) : null;
  if (ends && Number.isNaN(ends.getTime())) return fail("End date is not valid.");
  return write("grant_access", "access_grants", async (db) => {
    const { data, error } = await db.from("access_grants").insert({ user_id: userId, program_id: programId, scope: "content", source: "admin", ends_at: ends?.toISOString() ?? null, note: note.trim() || null }).select("id").single();
    return { id: (data as { id: string } | null)?.id, detail: { user_id: userId, program_id: programId }, error: error?.message };
  });
}

export async function revokeAccess(grantId: string): Promise<Result> {
  await studioAdmin();
  return write("revoke_access", "access_grants", async (db) => {
    const { error } = await db.from("access_grants").update({ revoked_at: new Date().toISOString() }).eq("id", grantId);
    return { id: grantId, error: error?.message };
  });
}

const slotsSchema = z.object({
  from: z.string().min(1, "Start date is required"), to: z.string().min(1, "End date is required"),
  times: z.string().min(1, "Add at least one time"), weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one weekday"),
  minutes: z.number().int().min(10).max(240), offsetMinutes: z.number().int().min(-840).max(840),
});

/** Bulk-add open coaching slots over a date range. Times are local to the given UTC offset (minutes east of UTC). */
export async function addSlots(input: z.input<typeof slotsSchema>): Promise<Result> {
  await studioAdmin();
  const p = slotsSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues.map((i) => i.message).join(" · "));
  const { from, to, times, weekdays, minutes, offsetMinutes } = p.data;
  const slots: { starts_at: string; duration_minutes: number; is_open: boolean }[] = [];
  const hhmm = times.split(/[\s,]+/).filter(Boolean);
  if (hhmm.some((t) => !/^\d{1,2}:\d{2}$/.test(t))) return fail("Times look like 09:00, 14:30");
  const d0 = new Date(`${from}T00:00:00Z`), d1 = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime()) || d1 < d0) return fail("Check the date range.");
  if ((d1.getTime() - d0.getTime()) / 864e5 > 120) return fail("Add at most 120 days at a time.");
  for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!weekdays.includes(d.getUTCDay())) continue;
    for (const t of hhmm) {
      const [h, m] = t.split(":").map(Number);
      slots.push({ starts_at: new Date(d.getTime() + (h! * 60 + m!) * 6e4 - offsetMinutes * 6e4).toISOString(), duration_minutes: minutes, is_open: true });
    }
  }
  if (!slots.length) return fail("No slots match those days.");
  return write("bulk_create", "coaching_slots", async (db) => {
    const { error } = await db.from("coaching_slots").insert(slots);
    return { detail: { count: slots.length, from, to }, error: error?.message };
  });
}

export async function createInvite(orgId: string, email: string, role: string): Promise<Result> {
  await studioAdmin();
  const e = z.string().email().safeParse(email.trim());
  if (!e.success) return fail("Enter a valid email.");
  return write("create", "org_invites", async (db, actor) => {
    const { data, error } = await db.from("org_invites").insert({ org_id: orgId, email: e.data, role: role === "coach" ? "coach" : "member", token: randomBytes(18).toString("hex"), expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), invited_by: actor }).select("id").single();
    return { id: (data as { id: string } | null)?.id, detail: { email: e.data }, error: error?.message };
  });
}

export async function removeOrgMember(orgId: string, userId: string): Promise<Result> {
  await studioAdmin();
  return write("remove_member", "org_members", async (db) => {
    const { error } = await db.from("org_members").update({ removed_at: new Date().toISOString(), status: "removed" }).eq("org_id", orgId).eq("user_id", userId);
    return { id: `${orgId}/${userId}`, error: error?.message };
  });
}

/** Site settings and any other validated JSON value. */
export async function saveSetting(key: string, raw: string): Promise<Result> {
  await studioAdmin();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("That is not valid JSON."); }
  if (!/^[a-z0-9_.-]+$/i.test(key)) return fail("Key: letters, numbers, dots, dashes.");
  return write("update", "site_settings", async (db) => {
    const { error } = await db.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    return { id: key, error: error?.message };
  });
}
