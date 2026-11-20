import "server-only";
import { getCatalog, myEnrollments, programOutlineStats, quote, type CatalogProgram, type DB, type OutlineStat } from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { pickContinue } from "@/lib/continue";
import { introLessonIds, labelPastIntro } from "./intro-lessons";
import { dayProgress, withTrainingDays } from "./day-progress";

/* Home dashboard data (legacy /home): every program with the member's state, retreats, featured hero, journey. */

export type Enrollment = Awaited<ReturnType<typeof myEnrollments>>[number];

export interface HomeSettings {
  /** Eyebrow over the featured hero for members without a program (site_settings.home.heroEyebrow). */
  heroEyebrow: string | null;
  /** Program slug featured for new members (site_settings.home.featuredSlug). */
  featuredSlug: string | null;
  /** Title of the "Your programs" rail (site_settings.home.enrolledTitle). */
  enrolledTitle: string | null;
}

export interface HomeRun {
  id: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  price_note: string | null;
  program_slug: string;
  program_name: string;
  image: { url: string; alt: string } | null;
}

/** One phase/section of the member's current path with progress (the hero's journey track). */
export interface JourneySection {
  title: string;
  total: number;
  done: number;
  /** Training days (lessons with a day number) in the section, and how many are done (The Climb). */
  days?: number;
  daysDone?: number;
}

export interface HomeRaw {
  settings: HomeSettings;
  catalog: CatalogProgram[];
  enrollments: Enrollment[];
  outline: OutlineStat[];
  /** Lessons in intro sections (0015), so "Continue" skips them; absent in older preview fixtures. */
  introLessonIds?: string[] | null;
  /** Server-quoted price (cents) for locked programs that can be bought. */
  prices: Record<string, number>;
  runs: HomeRun[];
  journey: { enrollmentId: string; sections: JourneySection[] } | null;
  readiness: { score: number; band: string; band_name: string | null; created_at: string }[];
  checklist: { reminders: boolean; intake: boolean; toolResults: number };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

async function settings(sb: DB): Promise<HomeSettings> {
  const { data } = await sb.from("site_settings").select("value").eq("key", "home").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, unknown>;
  return { heroEyebrow: str(v.heroEyebrow), featuredSlug: str(v.featuredSlug), enrolledTitle: str(v.enrolledTitle) };
}

async function prices(sb: DB, catalog: CatalogProgram[]): Promise<Record<string, number>> {
  const locked = catalog.filter((p) => p.access === "locked" && p.lessonCount > 0);
  const quotes = await Promise.all(locked.map((p) => quote(sb, "program", p.id).catch(() => null)));
  const out: Record<string, number> = {};
  quotes.forEach((q, i) => {
    if (q && q.state === "purchasable" && q.amount_cents > 0) out[locked[i]!.id] = q.amount_cents;
  });
  return out;
}

async function runs(sb: DB): Promise<HomeRun[]> {
  const { data } = await sb
    .from("program_runs")
    .select("id, name, status, starts_at, ends_at, location, price_note, gallery, programs(slug, name, status, program_media(role, url, alt, position))")
    .neq("status", "draft")
    .order("starts_at")
    .limit(12);
  const now = new Date().toISOString();
  const rows = (data ?? []).map((r) => {
    const p = r.programs as unknown as { slug: string; name: string; status: string; program_media: { role: string; url: string; alt: string; position: number }[] } | null;
    const gallery = (Array.isArray(r.gallery) ? r.gallery : []) as { url?: string; caption?: string; stock?: boolean }[];
    const own = gallery.find((g) => g.url && !g.stock);
    const media = [...(p?.program_media ?? [])].sort((a, b) => a.position - b.position);
    const m = media.find((x) => x.role === "card") ?? media.find((x) => x.role === "hero") ?? media[0];
    const loc = (r.location ?? {}) as { city?: string; region?: string };
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      place: [loc.city, loc.region].filter(Boolean).join(", ") || null,
      price_note: r.price_note,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      image: own?.url ? { url: own.url, alt: own.caption ?? r.name } : m ? { url: m.url, alt: m.alt || r.name } : null,
      published: p?.status === "published",
    };
  });
  const live = rows.filter((r) => r.published);
  const upcoming = live.filter((r) => (r.ends_at ?? r.starts_at) >= now);
  // Past retreats are hidden everywhere members browse (spec 11 #15); the rows stay for history.
  return upcoming.filter((r) => r.status !== "past").slice(0, 8).map((r): HomeRun => ({
    id: r.id, name: r.name, status: r.status, starts_at: r.starts_at, ends_at: r.ends_at, place: r.place,
    price_note: r.price_note, program_slug: r.program_slug, program_name: r.program_name, image: r.image,
  }));
}

/** The Climb on Today: the shared training-day counts (lib/loaders/day-progress), per phase. */
async function journey(e: Enrollment | undefined): Promise<HomeRaw["journey"]> {
  if (!e) return null;
  const d = await dayProgress(e.program_id, e.path_id ?? null);
  if (!d) return null;
  const sections = d.sections.map((s) => ({ title: s.title, total: s.total, done: s.done, days: s.days, daysDone: s.daysDone }));
  return sections.length > 1 ? { enrollmentId: e.enrollment_id, sections } : null;
}

async function realHome(): Promise<HomeRaw> {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const sb = supabase as unknown as DB;
  const [catalog, enrollments, outline, home, runList, rr, np, intake, tools, intro] = await Promise.all([
    getCatalog(sb, { listedOnly: true }),
    myEnrollments(sb).then(withTrainingDays),
    programOutlineStats(sb),
    settings(sb),
    runs(sb),
    sb.from("readiness_results").select("score, band, band_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(7),
    sb.from("notification_prefs").select("reminders_enabled").eq("user_id", user.id).maybeSingle(),
    sb.from("intake_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("tool_results").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    introLessonIds(sb),
  ]);
  const [priceMap, path, labelled] = await Promise.all([prices(sb, catalog), journey(pickContinue(enrollments, intro)), labelPastIntro(sb, enrollments, intro)]);
  return {
    settings: home,
    catalog,
    enrollments: labelled,
    outline,
    introLessonIds: intro,
    prices: priceMap,
    runs: runList,
    journey: path,
    readiness: (rr.data ?? []).map((r) => ({ score: Number(r.score ?? 0), band: String(r.band ?? ""), band_name: r.band_name ?? null, created_at: r.created_at })),
    checklist: {
      reminders: Boolean((np.data as { reminders_enabled?: boolean } | null)?.reminders_enabled),
      intake: (intake.count ?? 0) > 0,
      toolResults: tools.count ?? 0,
    },
  };
}

/** Home data. In preview mode `variant` "new" shows a member without programs (featured hero), "live" a real member's enrollments. */
export async function loadHome(variant?: string): Promise<HomeRaw> {
  if (MOCK) {
    const raw = await fixture<HomeRaw>(variant === "new" ? "today-home-new" : variant === "live" ? "today-home-live" : "today-home");
    return { ...raw, enrollments: await withTrainingDays(raw.enrollments) };
  }
  return realHome();
}
