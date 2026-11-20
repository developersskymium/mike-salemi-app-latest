"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { studioAdmin } from "./guard";
import { studioDb, type Db } from "./db";
import { APPLICATION_STATUS, cfg, parseValues, parseVimeo, MODES } from "./tables";

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

/* ------------------------------------------------------------------ W5: merchandising, site copy, pipeline, slots */

const merchSchema = z.object({
  summary: z.string().max(400).optional(),
  cta_label: z.string().max(40).optional(),
  badge: z.string().max(24).optional(),
  offer: z.string().max(120).optional(),
  vertical: z.enum(["", "mastery", "athletic", "mind-body"]).optional(),
  featured: z.boolean().optional(),
  is_listed: z.boolean().optional(),
  position: z.number().int().min(0).max(999).optional(),
});
export type Merch = z.input<typeof merchSchema>;

/** Catalog card and placement fields (legacy admin "Pricing, offers & placement"). Card copy lives in columns; badge, offer, CTA, vertical and "featured on Home" in programs.meta. */
export async function saveProgramMerch(programId: string, input: Merch): Promise<Result> {
  await studioAdmin();
  const p = merchSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "));
  const m = p.data;
  return write("update", "programs", async (db) => {
    const { data: row, error: e1 } = await db.from("programs").select("meta").eq("id", programId).single();
    if (e1 || !row) return { error: e1?.message ?? "Program not found" };
    const meta = { ...((row as { meta: Record<string, unknown> }).meta ?? {}) };
    const put = (k: string, v: unknown) => { if (v === "" || v === undefined || v === false) delete meta[k]; else meta[k] = v; };
    put("cta_label", m.cta_label?.trim()); put("badge", m.badge?.trim()); put("offer", m.offer?.trim()); put("vertical", m.vertical); put("featured", m.featured);
    const cols: Record<string, unknown> = { meta };
    if (m.summary !== undefined) cols.summary = m.summary.trim() || null;
    if (m.is_listed !== undefined) cols.is_listed = m.is_listed;
    if (m.position !== undefined) cols.position = m.position;
    const { error } = await db.from("programs").update(cols).eq("id", programId);
    return { id: programId, detail: { merch: Object.keys(m) }, error: error?.message };
  });
}

const homeCopy = z.object({ hero_eyebrow: z.string().max(60), featured_slug: z.string().max(80).regex(/^[a-z0-9-]*$/, "Featured program: a program slug"), enrolled_title: z.string().max(60) });
const programsCopy = z.object({ title: z.string().min(1).max(60), intro: z.string().max(400), flagship_badge: z.string().max(40), flagship_title: z.string().max(60), flagship_copy: z.string().max(400) });

/** Home and Programs page copy (legacy admin "Main copy"), stored in site_settings `home` and `programs_page`. */
export async function saveSiteCopy(key: "home" | "programs_page", value: Record<string, unknown>): Promise<Result> {
  await studioAdmin();
  const p = key === "home" ? homeCopy.safeParse(value) : key === "programs_page" ? programsCopy.safeParse(value) : null;
  if (!p) return fail("Unknown copy block.");
  if (!p.success) return fail(p.error.issues.map((i) => i.message).join(" · "));
  return write("update", "site_settings", async (db) => {
    const slug = "featured_slug" in p.data ? p.data.featured_slug : "";
    if (slug) {
      const { data } = await db.from("programs").select("id").eq("slug", slug).maybeSingle();
      if (!data) return { error: `No program with the slug "${slug}".` };
    }
    const { error } = await db.from("site_settings").upsert({ key, value: p.data, updated_at: new Date().toISOString() });
    return { id: key, error: error?.message };
  });
}

/** Move a retreat application through the pipeline, with an optional note for the team. */
export async function setApplicationStatus(applicationId: string, status: string, note: string): Promise<Result> {
  await studioAdmin();
  if (!(APPLICATION_STATUS as readonly string[]).includes(status)) return fail("Unknown status.");
  if (note.length > 2000) return fail("Keep the note under 2,000 characters.");
  return write("update", "run_applications", async (db) => {
    const cols: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (note.trim()) cols.admin_note = note.trim();
    const { error } = await db.from("run_applications").update(cols).eq("id", applicationId);
    return { id: applicationId, detail: { status }, error: error?.message };
  });
}

/** UTC instant for a wall-clock time in an IANA time zone (DST-aware). */
function zonedUtc(day: string, hhmm: string, tz: string): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const offsetAt = (t: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!) - t;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t);
}

type Schedule = { times: string[]; weekdays: number[]; timezone: string; minutes?: number };

/** The coaching program's schedule (programs.meta.schedule: Tue–Sat, 07:00–14:00 Pacific). */
async function coachingSchedule(db: Db): Promise<Schedule | null> {
  const { data } = await db.from("programs").select("meta").eq("slug", "coaching").maybeSingle();
  const s = (data as { meta?: { schedule?: Schedule } } | null)?.meta?.schedule;
  return s && Array.isArray(s.times) && Array.isArray(s.weekdays) && s.timezone ? s : null;
}

/** Open the next N weeks of slots from Mike's schedule. Skips times that already have a slot. */
export async function openScheduleWeeks(weeks: number): Promise<Result> {
  await studioAdmin();
  const n = Math.round(weeks);
  if (!(n >= 1 && n <= 12)) return fail("Choose between 1 and 12 weeks.");
  return write("bulk_create", "coaching_slots", async (db) => {
    const s = await coachingSchedule(db);
    if (!s) return { error: "The coaching program has no schedule (programs.meta.schedule)." };
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: s.timezone }).format(new Date());
    const start = new Date(`${today}T00:00:00Z`);
    const wanted: string[] = [];
    for (let i = 1; i <= n * 7; i++) {
      const d = new Date(start.getTime() + i * 864e5);
      if (!s.weekdays.includes(d.getUTCDay())) continue;
      const day = d.toISOString().slice(0, 10);
      for (const t of s.times) wanted.push(zonedUtc(day, t, s.timezone).toISOString());
    }
    const { data: have } = await db.from("coaching_slots").select("starts_at").gte("starts_at", wanted[0] ?? new Date().toISOString());
    const taken = new Set(((have ?? []) as { starts_at: string }[]).map((r) => new Date(r.starts_at).toISOString()));
    const rows = wanted.filter((w) => !taken.has(w)).map((starts_at) => ({ starts_at, duration_minutes: s.minutes ?? 60, is_open: true }));
    if (!rows.length) return { detail: { count: 0, weeks: n } };
    const { error } = await db.from("coaching_slots").insert(rows);
    return { detail: { count: rows.length, weeks: n }, error: error?.message };
  });
}
