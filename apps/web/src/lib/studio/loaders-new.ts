import "server-only";
import { studioLoader, rows, type Row } from "./db";
import { profileNames } from "./loaders";

/** Studio screens for the Nov 20 content: home note + picks, coaching, retreats, account requests, shop orders, badge perks. */

const setting = (list: Row[], key: string) => (list.find((x) => x.key === key)?.value ?? null) as Row | null;

export const loadHomeContent = studioLoader("studio-home-content", async (db) => {
  const [settings, videos] = await Promise.all([
    rows(db.from("site_settings").select("key,value,updated_at").in("key", ["home_mike_note", "library_picks"])),
    rows(db.from("videos").select("id,title,provider_id,thumbnail_url,duration_seconds,category").order("title")),
  ]);
  const note = setting(settings, "home_mike_note") ?? {};
  const picks = setting(settings, "library_picks") ?? {};
  const ids: string[] = Array.isArray(picks.ids) ? picks.ids.filter((x: unknown): x is string => typeof x === "string") : [];
  const byId = new Map(videos.map((v) => [v.id as string, v]));
  return {
    note: { text: String(note.text ?? ""), photo: String(note.photo ?? ""), week_of: String(note.week_of ?? ""), enabled: note.enabled !== false },
    noteUpdated: (settings.find((x) => x.key === "home_mike_note")?.updated_at ?? null) as string | null,
    picks: { month: String(picks.month ?? ""), videos: ids.map((id) => byId.get(id) ?? { id, title: "Missing video", missing: true }) },
    videos: videos.map((v) => ({ id: v.id as string, title: v.title as string, category: (v.category ?? null) as string | null, thumb: (v.thumbnail_url ?? null) as string | null, seconds: (v.duration_seconds ?? null) as number | null })),
  };
});

export const loadCoachingAdmin = studioLoader("studio-coaching-admin", async (db) => {
  const [messages, bookings, live, podcast] = await Promise.all([
    rows(db.from("coaching_messages").select("id,member_id,from_coach,body,created_at,read_at").order("created_at", { ascending: false }).limit(500)),
    rows(db.from("coaching_bookings").select("id,user_id,starts_at,status,homework,coach_note").order("starts_at", { ascending: false }).limit(200)),
    rows(db.from("coaching_live_sessions").select("*").order("starts_at", { ascending: false })),
    rows(db.from("podcast_episodes").select("*").order("position").order("published_on", { ascending: false })),
  ]);
  const people = await profileNames(db, [...messages.map((m) => m.member_id), ...bookings.map((b) => b.user_id)]);
  const threads = new Map<string, Row>();
  for (const m of messages) {
    const t = threads.get(m.member_id) ?? { member_id: m.member_id, who: people.get(m.member_id) ?? String(m.member_id).slice(0, 8), last: m, count: 0, unread: 0, waiting: !m.from_coach };
    t.count++;
    if (!m.from_coach && !m.read_at) t.unread++;
    threads.set(m.member_id, t);
  }
  return {
    threads: [...threads.values()].sort((a, b) => Number(b.waiting) - Number(a.waiting) || String(b.last.created_at).localeCompare(String(a.last.created_at))),
    bookings: bookings.map((b): Row => ({ ...b, who: people.get(b.user_id) ?? String(b.user_id).slice(0, 8) })),
    live, podcast,
  };
});

export const loadThread = studioLoader("studio-thread", async (db, memberId: string) => {
  const [messages, people] = await Promise.all([
    rows(db.from("coaching_messages").select("*").eq("member_id", memberId).order("created_at")),
    profileNames(db, [memberId]),
  ]);
  return { who: people.get(memberId) ?? memberId.slice(0, 8), messages };
});

export const loadRetreatsAdmin = studioLoader("studio-retreats-admin", async (db) => {
  const [leads, wall, runs, programs] = await Promise.all([
    rows(db.from("retreat_leads").select("*").order("created_at", { ascending: false }).limit(300)),
    rows(db.from("run_wall_posts").select("*").order("created_at", { ascending: false }).limit(200)),
    rows(db.from("program_runs").select("id,name,program_id,starts_at,status,details").order("starts_at")),
    rows(db.from("programs").select("id,name,slug,type,meta").eq("type", "retreat").order("position")),
  ]);
  const people = await profileNames(db, wall.map((w) => w.user_id));
  // Private bucket: sign short-lived links for moderation (absent in local preview).
  const signed = new Map<string, string>();
  const store = (db as unknown as { storage?: { from: (b: string) => { createSignedUrls: (p: string[], s: number) => Promise<{ data: { path: string | null; signedUrl: string }[] | null }> } } }).storage;
  if (store && wall.length) {
    const { data } = await store.from("retreat-wall").createSignedUrls(wall.map((w) => w.path), 3600);
    for (const x of data ?? []) if (x.path) signed.set(x.path, x.signedUrl);
  }
  const rn = new Map(runs.map((r) => [r.id as string, r.name as string]));
  const retreatIds = new Set(programs.map((p) => p.id));
  return {
    leads: leads.map((l): Row => ({ ...l, status: l.status ?? (l.handled_at ? "contacted" : "new"), runName: l.run_id ? rn.get(l.run_id) ?? "" : "" })),
    wall: wall.map((w): Row => ({ ...w, src: signed.get(w.path) ?? (String(w.path).startsWith("/") || /^https?:/.test(w.path) ? w.path : null), who: people.get(w.user_id) ?? String(w.user_id).slice(0, 8), runName: rn.get(w.run_id) ?? "" })),
    runs: runs.filter((r) => retreatIds.has(r.program_id)).map((r): Row => ({ ...r, facilitators: Array.isArray(r.details?.facilitators) ? r.details.facilitators : [] })),
    programs: programs.map((p): Row => ({ id: p.id, name: p.name, testimonial: p.meta?.testimonial ?? null })),
  };
});

export const loadAccountRequests = studioLoader("studio-account-requests", async (db, status: string) => {
  let q = db.from("account_requests").select("*").order("created_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  const list = await rows(q);
  const people = await profileNames(db, list.map((r) => r.user_id));
  return list.map((r): Row => ({ ...r, who: people.get(r.user_id) ?? String(r.user_id).slice(0, 8) }));
});

export const loadShopOrders = studioLoader("studio-shop-orders", async (db, filter: string) => {
  let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "to_ship") q = q.eq("status", "paid").is("shipped_at", null);
  else if (filter) q = q.eq("fulfillment", filter);
  const orders = await rows(q);
  const ids = orders.map((o) => o.id);
  const items = ids.length ? await rows(db.from("order_items").select("order_id,kind,name,quantity").in("order_id", ids)) : [];
  const people = await profileNames(db, orders.map((o) => o.user_id).filter(Boolean));
  return orders.map((o): Row => ({ ...o, who: o.user_id ? people.get(o.user_id) ?? String(o.user_id).slice(0, 8) : "Guest", items: items.filter((i) => i.order_id === o.id) }));
});

export const loadBadgePerks = studioLoader("studio-badge-perks", async (db) => {
  const [badges, videos] = await Promise.all([
    rows(db.from("badges").select("id,name,description,tier,family,perk,position").order("position")),
    rows(db.from("videos").select("id,title,category").order("title")),
  ]);
  return {
    badges: badges.filter((b) => b.perk?.kind === "bonus_video"),
    other: badges.filter((b) => b.perk && b.perk.kind !== "bonus_video").length,
    plain: badges.filter((b) => !b.perk).map((b) => ({ id: b.id as string, name: b.name as string })),
    videos: videos.map((v) => ({ id: v.id as string, title: v.title as string, category: (v.category ?? null) as string | null })),
  };
});
