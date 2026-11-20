import "server-only";
import { studioLoader, rows, type Db, type Row } from "./db";

const by = <T extends Row>(xs: T[], k: string) => {
  const m = new Map<string, T[]>();
  for (const x of xs) { const key = String(x[k]); m.set(key, [...(m.get(key) ?? []), x]); }
  return m;
};
const count = async (q: PromiseLike<{ count?: number | null }>) => (await q).count ?? 0;

export const loadDashboard = studioLoader("studio-dashboard", async (db) => {
  const [programs, videos, needsKey, members, offers, apps, audit] = await Promise.all([
    count(db.from("programs").select("id", { count: "exact", head: true })),
    count(db.from("videos").select("id", { count: "exact", head: true })),
    count(db.from("videos").select("id", { count: "exact", head: true }).eq("needs_key", true)),
    count(db.from("profiles").select("id", { count: "exact", head: true })),
    count(db.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true)),
    count(db.from("run_applications").select("id", { count: "exact", head: true }).eq("status", "submitted")),
    rows(db.from("audit_log").select("*").order("id", { ascending: false }).limit(8)),
  ]);
  const drafts = await rows(db.from("programs").select("id,name,status,draft_note").neq("status", "published").order("position"));
  return { programs, videos, needsKey, members, offers, apps, audit, drafts };
});

export const loadPrograms = studioLoader("studio-programs", async (db) => {
  const [programs, modes, media] = await Promise.all([
    rows(db.from("programs").select("*").order("position").order("name")),
    rows(db.from("program_modes").select("*")),
    rows(db.from("program_media").select("*").order("position")),
  ]);
  const m = by(modes, "program_id"), im = by(media, "program_id");
  return programs.map((p): Row => ({ ...p, modes: (m.get(p.id) ?? []).map((x) => x.mode), image: (im.get(p.id) ?? [])[0]?.url ?? null }));
});

export const loadProgram = studioLoader("studio-program", async (db, id: string) => {
  const { data: program } = await db.from("programs").select("*").eq("id", id).maybeSingle();
  if (!program) return null;
  const [modes, media, paths, resources, plans, prices, benefits, intakes, inclusions] = await Promise.all([
    rows(db.from("program_modes").select("*").eq("program_id", id)),
    rows(db.from("program_media").select("*").eq("program_id", id).order("position")),
    rows(db.from("program_paths").select("*").eq("program_id", id).order("position")),
    rows(db.from("resources").select("*").eq("program_id", id).order("position")),
    rows(db.from("plans").select("*").order("rank")),
    rows(db.from("prices").select("*").eq("ref_id", id)),
    rows(db.from("plan_program_benefits").select("*").eq("program_id", id)),
    rows(db.from("intake_forms").select("*").eq("program_id", id)),
    rows(db.from("program_inclusions").select("*").eq("parent_program_id", id)),
  ]);
  // Catalog card counts skip intro ("Start here") sections, like the member app.
  const [secs, less] = await Promise.all([
    rows(db.from("sections").select("id,meta,parent_id").eq("program_id", id)),
    rows(db.from("lessons").select("id,section_id").eq("program_id", id)),
  ]);
  const intro = new Set(secs.filter((x) => x.meta?.intro === true).map((x) => x.id));
  const counts = { sections: secs.filter((x) => !intro.has(x.id) && !x.parent_id).length, lessons: less.filter((l) => !intro.has(l.section_id)).length };
  return { program: program as Row, modes, media, paths, resources, plans, prices, benefits, intakes, inclusions, counts };
});

/** Home and Programs page copy (site_settings) plus what their previews need. */
export const loadSiteCopy = studioLoader("studio-site-copy", async (db) => {
  const [settings, programs, media] = await Promise.all([
    rows(db.from("site_settings").select("key,value").in("key", ["home", "programs_page"])),
    rows(db.from("programs").select("id,slug,name,status").eq("status", "published").order("position")),
    rows(db.from("program_media").select("program_id,role,url").order("position")),
  ]);
  const v = (k: string) => (settings.find((x) => x.key === k)?.value ?? {}) as Record<string, string>;
  const kbl = programs.find((p) => p.slug === "kettlebell-lifestyle");
  const kblMedia = media.filter((m) => m.program_id === kbl?.id);
  return {
    home: { hero_eyebrow: "", featured_slug: "", enrolled_title: "Your enrolled programs", ...v("home") },
    programsPage: { title: "Programs", intro: "", flagship_badge: "Flagship program", flagship_title: "Kettlebell Lifestyle", flagship_copy: "", ...v("programs_page") },
    programs: programs.map((p) => ({ slug: p.slug as string, name: p.name as string })),
    flagshipImage: (kblMedia.find((m) => m.role === "hero") ?? kblMedia.find((m) => m.role === "card"))?.url ?? null,
  };
});

/** Readiness check-ins members submitted (legacy "KBL form entries"), newest first, optionally one form. */
export const loadEntries = studioLoader("studio-entries", async (db, formId: string | null) => {
  let q = db.from("readiness_results").select("*").order("created_at", { ascending: false }).limit(200);
  if (formId) q = q.eq("form_id", formId);
  const [entries, forms] = await Promise.all([rows(q), rows(db.from("forms").select("id,title,max_score").order("title"))]);
  const lessonIds = [...new Set(entries.map((e) => e.lesson_id).filter(Boolean))] as string[];
  const lessons = lessonIds.length ? await rows(db.from("lessons").select("id,title,day_number,program_id").in("id", lessonIds)) : [];
  const people = await profileNames(db, entries.map((e) => e.user_id));
  const fm = new Map(forms.map((f) => [f.id, f])), lm = new Map(lessons.map((l) => [l.id, l]));
  const used = new Set(entries.map((e) => e.form_id));
  return {
    forms: forms.map((f) => ({ id: f.id as string, title: f.title as string, used: used.has(f.id) })),
    entries: entries.map((e): Row => ({ ...e, who: people.get(e.user_id) ?? String(e.user_id).slice(0, 8), form: fm.get(e.form_id)?.title ?? e.form_id, max: fm.get(e.form_id)?.max_score ?? null, lesson: lm.get(e.lesson_id) ?? null })),
  };
});

/** Full tree for one program: paths, sections (nested via parent_id), lessons, steps (only the selected lesson's steps). */
export const loadCurriculum = studioLoader("studio-curriculum", async (db, programId: string, lessonId: string | null, stepId: string | null) => {
  const [paths, sections, lessons, forms, tables] = await Promise.all([
    rows(db.from("program_paths").select("id,name,short_name,kind,position").eq("program_id", programId).order("position")),
    rows(db.from("sections").select("*").eq("program_id", programId).order("position")),
    rows(db.from("lessons").select("*").eq("program_id", programId).order("position")),
    rows(db.from("forms").select("id,title").order("title")),
    rows(db.from("workout_tables").select("id,title").order("title")),
  ]);
  const lesson = lessons.find((l) => l.id === lessonId) ?? null;
  const steps = lesson ? await rows(db.from("steps").select("*").eq("lesson_id", lesson.id).order("position")) : [];
  const step = steps.find((s) => s.id === stepId) ?? null;
  const clips = step ? await rows(db.from("step_videos").select("*").eq("step_id", step.id).order("position")) : [];
  const vids = [step?.video_id, ...clips.map((c) => c.video_id)].filter(Boolean);
  const videos = vids.length ? await rows(db.from("videos").select("*").in("id", vids as string[])) : [];
  return { paths, sections, lessons, lesson, steps, step, clips, videos, forms, tables };
});

export const loadReadiness = studioLoader("studio-readiness", async (db) => {
  const [forms, tables, bands] = await Promise.all([
    rows(db.from("forms").select("*").order("title")),
    rows(db.from("workout_tables").select("id,title,rows,notes,updated_at").order("title")),
    rows(db.from("form_bands").select("form_id")),
  ]);
  const bc = by(bands, "form_id");
  return { forms: forms.map((f): Row => ({ ...f, bands: bc.get(f.id)?.length ?? 0 })), tables: tables.map((t) => ({ id: t.id, title: t.title, updated_at: t.updated_at, rowCount: Array.isArray(t.rows) ? t.rows.length : 0 })) };
});

export const loadForm = studioLoader("studio-form", async (db, id: string) => {
  const { data: form } = await db.from("forms").select("*").eq("id", id).maybeSingle();
  if (!form) return null;
  const [questions, bands, tables] = await Promise.all([
    rows(db.from("form_questions").select("*").eq("form_id", id).order("position")),
    rows(db.from("form_bands").select("*").eq("form_id", id).order("position")),
    rows(db.from("workout_tables").select("id,title").order("title")),
  ]);
  return { form: form as Row, questions, bands, tables };
});

export const loadTable = studioLoader("studio-table", async (db, id: string) => {
  const { data } = await db.from("workout_tables").select("*").eq("id", id).maybeSingle();
  return (data as Row | null) ?? null;
});

export const loadLibrary = studioLoader("studio-library", async (db, q: string, onlyMissing: boolean) => {
  let vq = db.from("videos").select("*").order("title").limit(60);
  if (q) vq = vq.or(`title.ilike.%${q.replace(/[,%()]/g, " ")}%,provider_id.ilike.%${q.replace(/[,%()]/g, " ")}%`);
  if (onlyMissing) vq = vq.eq("needs_key", true);
  const [videos, missing, tags, total] = await Promise.all([
    rows(vq),
    rows(db.from("videos").select("id,title,provider_id,privacy_hash,needs_key").eq("needs_key", true).order("title")),
    rows(db.from("tags").select("*").order("namespace").order("name")),
    count(db.from("videos").select("id", { count: "exact", head: true })),
  ]);
  return { videos, missing, tags, total };
});

export const loadCommerce = studioLoader("studio-commerce", async (db) => {
  const [plans, prices, programs, benefits, coupons] = await Promise.all([
    rows(db.from("plans").select("*").order("rank")),
    rows(db.from("prices").select("*").order("kind").order("amount_cents")),
    rows(db.from("programs").select("id,name,status,catalog_group,is_free").order("position")),
    rows(db.from("plan_program_benefits").select("*")),
    rows(db.from("coupons").select("*").order("code")),
  ]);
  const names = new Map<string, string>([...programs.map((p) => [p.id, p.name] as [string, string]), ...plans.map((p) => [p.id, p.name] as [string, string])]);
  return { plans, prices: prices.map((p): Row => ({ ...p, refName: names.get(p.ref_id) ?? p.ref_id })), programs, benefits, coupons };
});

export const loadOffers = studioLoader("studio-offers", async (db) => {
  const [offers, events] = await Promise.all([rows(db.from("offers").select("*").order("priority")), rows(db.from("offer_events").select("offer_id,event"))]);
  const perf = new Map<string, Record<string, number>>();
  for (const e of events) { const r = perf.get(e.offer_id) ?? {}; r[e.event] = (r[e.event] ?? 0) + (e.n ?? 1); perf.set(e.offer_id, r); }
  return offers.map((o): Row => ({ ...o, perf: { view: 0, click: 0, convert: 0, dismiss: 0, ...(perf.get(o.id) ?? {}) } }));
});

export const loadOffer = studioLoader("studio-offer", async (db, id: string) => {
  const [{ data: offer }, programs, plans, coupons] = await Promise.all([
    db.from("offers").select("*").eq("id", id).maybeSingle(),
    rows(db.from("programs").select("id,name").order("name")),
    rows(db.from("plans").select("id,name").order("rank")),
    rows(db.from("coupons").select("id,code")),
  ]);
  return { offer: (offer as Row | null) ?? null, programs, plans, coupons };
});

export const loadExperiences = studioLoader("studio-experiences", async (db) => {
  const [runs, programs, packages, slots, bookings, apps, itinerary] = await Promise.all([
    rows(db.from("program_runs").select("*").order("starts_at", { ascending: false })),
    rows(db.from("programs").select("id,name,type,slug,meta")),
    rows(db.from("coaching_packages").select("*").order("position")),
    rows(db.from("coaching_slots").select("*").order("starts_at")),
    rows(db.from("coaching_bookings").select("*").order("starts_at", { ascending: false })),
    rows(db.from("run_applications").select("*").order("created_at", { ascending: false })),
    rows(db.from("itinerary_items").select("run_id")),
  ]);
  const pn = new Map(programs.map((p) => [p.id, p.name]));
  const ic = by(itinerary, "run_id"), ac = by(apps, "run_id");
  const people = await profileNames(db, [...bookings.map((b) => b.user_id), ...apps.map((a) => a.user_id)]);
  const coach = programs.find((p) => p.slug === "coaching") as Row | undefined;
  const now = new Date().toISOString();
  return {
    schedule: (coach?.meta?.schedule ?? null) as { times: string[]; weekdays: number[]; timezone: string } | null,
    openAhead: slots.filter((s) => s.is_open && s.starts_at > now).length,
    runs: runs.map((r): Row => ({ ...r, programName: pn.get(r.program_id) ?? "", itineraryCount: ic.get(r.id)?.length ?? 0, applicationCount: ac.get(r.id)?.length ?? 0 })),
    packages, slots, programs,
    bookings: bookings.map((b): Row => ({ ...b, who: people.get(b.user_id) ?? b.user_id })),
    applications: apps.map((a): Row => ({ ...a, who: people.get(a.user_id) ?? a.user_id, runName: runs.find((r) => r.id === a.run_id)?.name ?? "" })),
  };
});

export const loadRun = studioLoader("studio-run", async (db, id: string) => {
  const { data: run } = await db.from("program_runs").select("*").eq("id", id).maybeSingle();
  if (!run) return null;
  const [itinerary, sessions, apps] = await Promise.all([
    rows(db.from("itinerary_items").select("*").eq("run_id", id).order("day_index").order("position")),
    rows(db.from("run_sessions").select("*").eq("run_id", id).order("position")),
    rows(db.from("run_applications").select("*").eq("run_id", id).order("created_at", { ascending: false })),
  ]);
  const people = await profileNames(db, apps.map((a) => a.user_id));
  return { run: run as Row, itinerary, sessions, applications: apps.map((a): Row => ({ ...a, who: people.get(a.user_id) ?? a.user_id })) };
});

async function profileNames(db: Db, ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  const ps = uniq.length ? await rows(db.from("profiles").select("id,display_name,first_name").in("id", uniq)) : [];
  return new Map(ps.map((p) => [p.id as string, (p.display_name ?? p.first_name ?? p.id) as string]));
}

export const loadMembers = studioLoader("studio-members", async (db, q: string) => {
  let pq = db.from("profiles").select("id,display_name,first_name,created_at,timezone").order("created_at", { ascending: false }).limit(50);
  if (q) pq = pq.or(`display_name.ilike.%${q.replace(/[,%()]/g, " ")}%,first_name.ilike.%${q.replace(/[,%()]/g, " ")}%`);
  const [profiles, subs, total] = await Promise.all([rows(pq), rows(db.from("subscriptions").select("user_id,plan_id,status")), count(db.from("profiles").select("id", { count: "exact", head: true }))]);
  const sm = by(subs, "user_id");
  return { total, members: profiles.map((p): Row => ({ ...p, plan: (sm.get(p.id) ?? []).find((s) => s.status === "active")?.plan_id ?? "free" })) };
});

export const loadMember = studioLoader("studio-member", async (db, id: string) => {
  const { data: profile } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  const [enrollments, grants, subs, orders, programs, roles, progress] = await Promise.all([
    rows(db.from("enrollments").select("*").eq("user_id", id).order("started_at", { ascending: false })),
    rows(db.from("access_grants").select("*").eq("user_id", id).order("created_at", { ascending: false })),
    rows(db.from("subscriptions").select("*").eq("user_id", id).order("created_at", { ascending: false })),
    rows(db.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false })),
    rows(db.from("programs").select("id,name,type").order("name")),
    rows(db.from("user_roles").select("role").eq("user_id", id)),
    count(db.from("step_progress").select("step_id", { count: "exact", head: true }).eq("user_id", id)),
  ]);
  return { profile: profile as Row, enrollments, grants, subs, orders, programs, roles, progress };
});

export const loadOrgs = studioLoader("studio-orgs", async (db) => {
  const [orgs, members] = await Promise.all([rows(db.from("organizations").select("*").order("name")), rows(db.from("org_members").select("org_id,removed_at"))]);
  const mc = by(members.filter((m) => !m.removed_at), "org_id");
  return orgs.map((o): Row => ({ ...o, used: mc.get(o.id)?.length ?? 0 }));
});

export const loadOrg = studioLoader("studio-org", async (db, id: string) => {
  const { data: org } = await db.from("organizations").select("*").eq("id", id).maybeSingle();
  if (!org) return null;
  const [members, invites, links, programs] = await Promise.all([
    rows(db.from("org_members").select("*").eq("org_id", id).order("joined_at")),
    rows(db.from("org_invites").select("*").eq("org_id", id).order("expires_at", { ascending: false })),
    rows(db.from("org_programs").select("*").eq("org_id", id)),
    rows(db.from("programs").select("id,name")),
  ]);
  const people = await profileNames(db, members.map((m) => m.user_id));
  const pn = new Map(programs.map((p) => [p.id, p.name]));
  return { org: org as Row, members: members.map((m): Row => ({ ...m, who: people.get(m.user_id) ?? m.user_id })), invites, programs: links.map((l) => pn.get(l.program_id) ?? l.program_id) };
});

export const loadNotices = studioLoader("studio-notices", async (db) => rows(db.from("notices").select("*").order("position")));
export const loadSettings = studioLoader("studio-settings", async (db) => rows(db.from("site_settings").select("*").order("key")));
export const loadAudit = studioLoader("studio-audit", async (db) => rows(db.from("audit_log").select("*").order("id", { ascending: false }).limit(100)));
