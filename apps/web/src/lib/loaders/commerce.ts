import "server-only";
import { unstable_rethrow } from "next/navigation";
import {
  coachingPackages, getOffer, getRun, myChecklist, myExperiences, myOrders, myOrgs, mySubscription, openCoachingSlots, orgInvites,
  orgOverview, quote, runSessions,
  type ApplicationStatus, type MemberSubscription, type Offer, type OfferContext, type OfferPlacement, type Order, type OrgOverview,
  type OrgRole, type Quote, type RunStatus,
} from "@ms/api";
import { createClient, getUser } from "@/lib/supabase/server";
import { MOCK, fixture } from "@/lib/mock";
import { coverFor, isUnfitCover, focalOf } from "@/lib/covers";
import { programHref } from "@/lib/hrefs";

/* ================================================================== Offers */

export type OfferSlotPlacement = Exclude<OfferPlacement, "email" | "push">;

/** An offer ready to render: where its CTA goes and the photo to show (offer image, else the target's own media). */
export interface OfferView {
  offer: Offer;
  href: string;
  external: boolean;
  image: { url: string; alt: string; focal?: string } | null;
  /** Short line above the headline (the target's name). */
  eyebrow: string | null;
}

function offerHref(o: Offer): { href: string; external: boolean } {
  switch (o.target_kind) {
    case "program":
      return { href: `/programs/${o.target?.slug ?? o.target_ref}`, external: false };
    case "plan":
      return { href: `/pricing?plan=${encodeURIComponent(o.target?.id ?? o.target_ref)}`, external: false };
    case "coaching":
      return { href: `/coaching?package=${encodeURIComponent(o.target?.id ?? o.target_ref)}`, external: false };
    case "run":
      return { href: `/experiences/${o.target_ref}`, external: false };
    case "bundle":
      return { href: `/pricing?bundle=${encodeURIComponent(o.target_ref)}`, external: false };
    default: {
      const url = o.target?.url ?? o.target_ref;
      return { href: url, external: /^https?:\/\//.test(url) };
    }
  }
}

async function offerImage(o: Offer): Promise<OfferView["image"]> {
  if (o.image_url) return { url: o.image_url, alt: "" };
  const sb = await createClient();
  if (o.target_kind === "program" && o.target?.id) {
    const { data } = await sb
      .from("program_media")
      .select("url, alt, role, position")
      .eq("program_id", o.target.id)
      .in("role", ["hero", "card"])
      .order("position")
      .limit(1);
    const m = data?.[0];
    return m ? { url: m.url, alt: m.alt ?? "" } : null;
  }
  if (o.target_kind === "run") {
    const { data } = await sb.from("program_runs").select("details").eq("id", o.target_ref).maybeSingle();
    const cover = (data?.details as { cover?: string } | null)?.cover;
    return cover ? { url: cover, alt: "" } : null;
  }
  return null;
}

/** Program offers link straight to the page that renders (a course's journey home, not a redirect hop). */
async function programTypeOf(o: Offer): Promise<string | null> {
  if (o.target_kind !== "program" || !o.target?.id) return null;
  const sb = await createClient();
  const { data } = await sb.from("programs").select("type").eq("id", o.target.id).maybeSingle();
  return (data?.type as string | undefined) ?? null;
}

async function realOffer(placement: OfferSlotPlacement, context: OfferContext): Promise<OfferView | null> {
  const sb = await createClient();
  const offer = await getOffer(sb, placement, context);
  if (!offer) return null;
  const [image, type] = await Promise.all([offerImage(offer), programTypeOf(offer)]);
  const { href, external } = offerHref(offer);
  return { offer, href: type ? programHref(offer.target?.slug ?? offer.target_ref, type) : href, external, image, eyebrow: offer.reason ?? offer.target?.name ?? null };
}

/** Local preview: the seeded rules evaluated against the fixture persona (lib/offers-mock). */
async function mockOfferView(placement: OfferSlotPlacement, context: OfferContext): Promise<OfferView | null> {
  const { mockOffer } = await import("@/lib/offers-mock");
  const offer = await mockOffer(placement, context);
  if (!offer) return null;
  const { href, external } = offerHref(offer);
  return { offer, href, external, image: null, eyebrow: offer.reason ?? offer.target?.name ?? null };
}

/**
 * Summit photo rule for offers: a poster with lettering (or a graded/stock image) is never shown; the
 * target program's text-free photo of Mike stands in, with a focal point that keeps his face in frame.
 */
function withPhoto(view: OfferView): OfferView {
  const img = view.image;
  const slug = view.offer.target_kind === "program" ? view.offer.target?.slug ?? null : null;
  if (img && !(img.url.startsWith("/media/") && isUnfitCover(img.url))) return { ...view, image: { ...img, focal: img.focal ?? focalOf(img.url, "50% 35%") } };
  if (!img && !slug) return view;
  const c = coverFor(slug ?? "kettlebell-lifestyle");
  return { ...view, image: { url: c.src, alt: c.alt, focal: c.focal } };
}

/**
 * The best offer for a placement. In local preview it reads `fixtures/commerce-offer-<placement>.json`
 * (no file = no offer). Never throws: a failing offer simply renders nothing.
 */
export async function loadOffer(placement: OfferSlotPlacement, context: OfferContext = {}): Promise<OfferView | null> {
  try {
    const view = MOCK
      ? (await mockOfferView(placement, context)) ?? (await fixture<OfferView | null>(`commerce-offer-${placement}`).catch(() => null))
      : await realOffer(placement, context);
    return view ? withPhoto(view) : null;
  } catch (e) {
    unstable_rethrow(e); // let Next's dynamic-rendering and navigation signals through
    console.error("loadOffer", placement, e);
    return null;
  }
}

/* ================================================================= Shared */

/** Fixture lookup with optional preview variant (local preview only): `?preview=<variant>` reads `<name>-<variant>.json`. */
async function mockFixture<T>(name: string, preview?: string | null): Promise<T> {
  if (preview && /^[a-z0-9-]{1,40}$/.test(preview)) {
    try {
      return await fixture<T>(`${name}-${preview}`);
    } catch {
      /* fall through to the base fixture */
    }
  }
  return fixture<T>(name);
}

/* ================================================================ Billing */

export interface BillingData {
  subscription: MemberSubscription | null;
  /** The plan's price for the subscription's interval (null for Free or unknown). */
  planPrice: { amountCents: number; currency: string; interval: string; draftNote: string | null } | null;
  planDraftNote: string | null;
  orders: Order[];
  /** True when the member has a Stripe billing account (portal is useful). */
  provider: string | null;
  /** Set while billing is paused in Stripe (0041). `resumesAt` null = until the member resumes. */
  paused?: { planName: string; planRank: number; interval: "month" | "year"; pausedAt: string; resumesAt: string | null; accessUntil: string | null; stillOpen: boolean } | null;
}

async function realBilling(): Promise<BillingData> {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const [subscription, orders] = await Promise.all([mySubscription(sb, user.id), myOrders(sb)]);
  let planPrice: BillingData["planPrice"] = null;
  let planDraftNote: string | null = null;
  if (subscription) {
    const [{ data: price }, { data: plan }] = await Promise.all([
      sb.from("prices").select("amount_cents, currency, interval, draft_note").eq("kind", "plan").eq("ref_id", subscription.planId).eq("interval", subscription.interval).eq("is_active", true).maybeSingle(),
      sb.from("plans").select("draft_note").eq("id", subscription.planId).maybeSingle(),
    ]);
    if (price) planPrice = { amountCents: price.amount_cents, currency: price.currency, interval: price.interval, draftNote: price.draft_note };
    planDraftNote = plan?.draft_note ?? null;
  }
  const paused = await pausedSubscription(sb, user.id);
  return { subscription, planPrice, planDraftNote, orders, provider: subscription?.provider ?? paused?.provider ?? null, paused: paused?.info ?? null };
}

/** A paused Stripe subscription, if any. Returns null before migration 0041 (no paused_at column) or on any error. */
async function pausedSubscription(sb: Awaited<ReturnType<typeof getUser>>["supabase"], userId: string) {
  try {
    const { data, error } = await (sb as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("subscriptions")
      .select("interval, current_period_end, paused_at, resumes_at, provider, plans(name, rank)")
      .eq("user_id", userId)
      .not("paused_at", "is", null)
      .in("status", ["trialing", "active", "past_due"])
      .order("paused_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { interval: string; current_period_end: string | null; paused_at: string; resumes_at: string | null; provider: string; plans: { name: string; rank: number } | { name: string; rank: number }[] | null };
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return {
      provider: row.provider,
      info: {
        planName: plan?.name ?? "Your plan",
        planRank: plan?.rank ?? 0,
        interval: (row.interval === "year" ? "year" : "month") as "month" | "year",
        pausedAt: row.paused_at,
        resumesAt: row.resumes_at,
        accessUntil: row.current_period_end,
        stillOpen: Boolean(row.current_period_end && Date.parse(row.current_period_end) > Date.now()),
      },
    };
  } catch {
    return null;
  }
}

export async function loadBilling(): Promise<BillingData> {
  return MOCK ? fixture<BillingData>("commerce-billing") : realBilling();
}

/* ============================================================ Experiences */

export interface RunLocation { label?: string; city?: string; region?: string; country?: string; venue?: string; address?: string; map_query?: string }
export interface ChecklistItem { id: string; label: string; note?: string | null }
export interface RunDocument { title: string; url: string; kind?: string | null }
export interface RunDetails {
  slug?: string;
  cover?: string;
  season?: string;
  tagline?: string;
  description?: string;
  duration_label?: string;
  cta_label?: string;
  highlights?: string[];
  aftercare?: string[];
  /** `photo` and `line` are optional: a tasteful initials placeholder shows until Mike sends photos. */
  facilitators?: { name: string; role: string; line?: string; photo?: string }[];
  nights?: number;
  /** "About 1 hr from Redding airport (RDD) · …" */
  travel_time?: string;
  not_included?: string[];
  /** "Is this for me?" lines. */
  for_you?: string[];
  copy_draft_note?: string;
  faq?: { q: string; a: string }[];
  travel?: string;
  accommodation?: string;
  packing?: ChecklistItem[];
  prerequisites?: ChecklistItem[];
  checklist_note?: string;
  documents?: RunDocument[];
  help?: { email?: string; phone?: string; note?: string };
  format?: string;
  /** "Hold Your Ground" / "Primal Reset" (spec 10). */
  track?: string;
  /** Regular price shown struck through next to the draft price, e.g. "$3,100–$3,250". */
  price_compare_label?: string;
  checklist_draft_note?: string;
}
export interface GalleryPhoto { url: string; caption: string; stock?: boolean }
export interface ItineraryItem { id: string; day_index: number; starts_at: string | null; title: string; description: string | null; location: string | null }

export interface RunHub {
  run: {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string | null;
    timezone: string;
    status: RunStatus;
    capacity: number | null;
    requires_application: boolean;
    price_note: string | null;
    draft_note: string | null;
    location: RunLocation;
    details: RunDetails;
    gallery: GalleryPhoto[];
  };
  program: { id: string; slug: string; name: string; type: string };
  itinerary: ItineraryItem[];
  application: RunApplicationView | null;
  checklist: Record<string, boolean>;
  sessions: { id: string; title: string; starts_at: string; ends_at: string | null; join_url: string | null }[];
  /** Server price for booking this run (after acceptance or when no application is needed). */
  quote: Quote | null;
  /** The run's draft price row (shown before acceptance; the quote decides what is charged). */
  price: { amountCents: number; currency: string; draftNote: string | null } | null;
  /** Open times for the alignment call (step 2); empty unless the call is still to book. */
  callSlots: { id: string; starts_at: string; duration_minutes: number }[];
  /** Men of Movement: Preparation, included with a booked place; opens ~3 months before the run. */
  prepProgram: { slug: string; name: string; lessons: number; opensAt: string; open: boolean } | null;
  /** Shared photo wall (booked men only; live and after). */
  wall: { id: string; url: string; caption: string | null; by: string; mine: boolean }[];
  /** The member's retreat certificate once issued (after). */
  certificate: { id: string } | null;
  /** Places left (capacity minus accepted/booked). */
  seatsLeft: number | null;
  /** The retreat program's shared copy: the five pillars, the two tracks, the daily rhythm. */
  about: {
    pillars: string[];
    pillarsDraftNote: string | null;
    tracks: { name: string; focus: string; venue: string }[];
    tracksDraftNote: string | null;
    rhythm: string | null;
  };
}

export interface RunApplicationView {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  call_at: string | null;
  call_url: string | null;
  call_done_at: string | null;
  decided_at: string | null;
  payment_link_sent_at: string | null;
}

const PREP_SLUG = "men-of-movement";
const PREP_DAYS_BEFORE = 90;

async function realRunHub(runId: string): Promise<RunHub | null> {
  const { supabase: sb, user } = await getUser();
  const run = await getRun(sb, runId);
  if (!run) return null;
  const prog = (Array.isArray(run.programs) ? run.programs[0] : run.programs) as { id: string; slug: string; name: string; type: string } | null;
  const [app, checklist, sessions, q, priceRow, parent, prep] = await Promise.all([
    user
      ? sb.from("run_applications").select("id, status, created_at, call_at, call_url, call_done_at, decided_at, payment_link_sent_at").eq("run_id", runId).eq("user_id", user.id).neq("status", "cancelled").maybeSingle().then((r) => r.data)
      : null,
    user ? myChecklist(sb, user.id, runId).catch(() => new Map<string, boolean>()) : new Map<string, boolean>(),
    runSessions(sb, runId).catch(() => []),
    quote(sb, "run", runId).catch(() => null),
    sb.from("prices").select("amount_cents, currency, draft_note").eq("kind", "run").eq("ref_id", runId).eq("interval", "one_time").order("amount_cents").limit(1).maybeSingle().then((r) => r.data),
    sb.from("programs").select("meta").eq("id", run.program_id).maybeSingle().then((r) => r.data),
    sb.from("programs").select("id, slug, name, meta").eq("slug", PREP_SLUG).maybeSingle().then((r) => r.data),
  ]);
  const needsCall = app && (app.status === "submitted" || app.status === "call_booked") && !app.call_done_at;
  const [slots, lessons, grant] = await Promise.all([
    needsCall ? openCoachingSlots(sb, new Date(Date.now() + 2 * 3600000), new Date(Date.now() + 1000 * 60 * 60 * 24 * 28)).catch(() => []) : [],
    prep ? sb.from("lessons").select("id", { count: "exact", head: true }).eq("program_id", prep.id).then((r) => r.count ?? 0) : 0,
    prep && user && app?.status === "booked"
      ? sb.from("access_grants").select("starts_at").eq("user_id", user.id).eq("program_id", prep.id).is("revoked_at", null).order("starts_at").limit(1).maybeSingle().then((r) => r.data)
      : null,
  ]);
  const booked = app?.status === "booked";
  const [wallRows, cert, seats] = await Promise.all([
    booked
      ? sb.from("run_wall_posts" as never).select("id, path, caption, user_id, created_at").eq("run_id", runId).order("created_at", { ascending: false }).limit(60).then((r) => (r.data ?? []) as unknown as { id: string; path: string; caption: string | null; user_id: string }[])
      : [],
    user && booked ? sb.from("certificates").select("id").eq("user_id", user.id).eq("program_id", run.program_id).order("issued_at", { ascending: false }).limit(1).maybeSingle().then((r) => r.data) : null,
    sb.rpc("run_seats" as never, { p_runs: [runId] } as never).then((r) => ((r.data ?? []) as unknown as { seats_left: number | null }[])[0]?.seats_left ?? null),
  ]);
  const signed = wallRows.length
    ? await sb.storage.from("retreat-wall").createSignedUrls(wallRows.map((w) => w.path), 3600).then((r) => r.data ?? [])
    : [];
  const meta = (parent?.meta ?? {}) as { tracks?: RunHub["about"]["tracks"]; tracks_draft_note?: string; pillars_draft_note?: string; sections?: { heading: string; body: string }[] };
  const prepMeta = (prep?.meta ?? {}) as { pillars?: string[] };
  const opensAt = grant?.starts_at ?? new Date(new Date(run.starts_at).getTime() - PREP_DAYS_BEFORE * 86400000).toISOString();
  return {
    run: {
      id: run.id,
      name: run.name,
      starts_at: run.starts_at,
      ends_at: run.ends_at,
      timezone: run.timezone,
      status: run.status as RunStatus,
      capacity: run.capacity,
      requires_application: run.requires_application,
      price_note: run.price_note,
      draft_note: run.draft_note,
      location: (run.location ?? {}) as RunLocation,
      details: (run.details ?? {}) as RunDetails,
      gallery: (run.gallery ?? []) as unknown as GalleryPhoto[],
    },
    program: prog ?? { id: run.program_id, slug: "", name: "", type: "retreat" },
    itinerary: run.itinerary_items.map((i) => ({ id: i.id, day_index: i.day_index, starts_at: i.starts_at, title: i.title, description: i.description, location: i.location })),
    application: app
      ? { id: app.id, status: app.status as ApplicationStatus, applied_at: app.created_at, call_at: app.call_at, call_url: app.call_url, call_done_at: app.call_done_at, decided_at: app.decided_at, payment_link_sent_at: app.payment_link_sent_at }
      : null,
    checklist: Object.fromEntries(checklist),
    sessions: sessions.map((s) => ({ id: s.id, title: s.title, starts_at: s.starts_at, ends_at: s.ends_at, join_url: s.join_url })),
    quote: q,
    price: priceRow ? { amountCents: priceRow.amount_cents, currency: priceRow.currency, draftNote: priceRow.draft_note } : null,
    callSlots: slots.map((x) => ({ id: x.id, starts_at: x.starts_at, duration_minutes: x.duration_minutes })),
    prepProgram: prep ? { slug: prep.slug, name: prep.name, lessons, opensAt, open: Date.parse(opensAt) <= Date.now() && app?.status === "booked" } : null,
    wall: wallRows.flatMap((w, i) => (signed[i]?.signedUrl ? [{ id: w.id, url: signed[i]!.signedUrl, caption: w.caption, by: w.user_id === user?.id ? "You" : "A brother", mine: w.user_id === user?.id }] : [])),
    certificate: cert ? { id: cert.id } : null,
    seatsLeft: seats,
    about: {
      pillars: prepMeta.pillars ?? [],
      pillarsDraftNote: meta.pillars_draft_note ?? null,
      tracks: meta.tracks ?? [],
      tracksDraftNote: meta.tracks_draft_note ?? null,
      rhythm: meta.sections?.find((x) => /what it is/i.test(x.heading))?.body.match(/Mornings[^.]*\./)?.[0] ?? null,
    },
  };
}

/** Fixture defaults for the fields added in spec 12 (wall, certificate, seats, starter copy). */
function withMockExtras(hub: RunHub, mode: "live" | "after" | null): RunHub {
  const photos = hub.run.gallery.filter((g) => !g.stock);
  const wall = mode
    ? [5, 8, 3, 10, 6, 4, 7].map((n, i) => photos[n]).filter(Boolean).map((p, i) => ({ id: `w${i}`, url: p!.url, caption: i % 3 === 0 ? p!.caption : null, by: i === 1 ? "You" : ["Daniel", "Marcus", "Sam", "Jonah", "Eli", "Theo"][i % 6]!, mine: i === 1 }))
    : [];
  const d = hub.run.details;
  return {
    ...hub,
    wall: hub.wall ?? wall,
    certificate: hub.certificate ?? (mode === "after" ? { id: "preview" } : null),
    seatsLeft: hub.seatsLeft ?? 7,
    run: {
      ...hub.run,
      details: {
        ...d,
        nights: d.nights ?? 3,
        travel_time: d.travel_time ?? "About 1 hr from Redding airport (RDD) · 4 hrs from Sacramento (SMF)",
        not_included: d.not_included ?? ["Flights to Redding (RDD) or Sacramento (SMF)", "Travel insurance", "Alcohol and personal extras"],
        for_you: d.for_you,
        copy_draft_note: d.copy_draft_note ?? "Starter copy (travel time, inclusions, guide lines); awaiting Mike",
      },
    },
  };
}

/** Shifts a fixture run so `now` falls on day 2 (live) or three days after it ended (after). */
function shiftRun(hub: RunHub, mode: "live" | "after"): RunHub {
  const len = (hub.run.ends_at ? Date.parse(hub.run.ends_at) : Date.parse(hub.run.starts_at) + 3 * 86400000) - Date.parse(hub.run.starts_at);
  const start = mode === "live" ? Date.now() - 1.3 * 86400000 : Date.now() - len - 3 * 86400000;
  return {
    ...hub,
    run: { ...hub.run, status: mode === "live" ? "in_progress" : "past", starts_at: new Date(start).toISOString(), ends_at: new Date(start + len).toISOString() },
    prepProgram: hub.prepProgram ? { ...hub.prepProgram, open: true, opensAt: new Date(start - PREP_DAYS_BEFORE * 86400000).toISOString() } : null,
  };
}

/**
 * Retreat page / hub. Local preview: `commerce-run.json` (not applied) or `?preview=` submitted · call · review ·
 * accepted · booked · live · after (live/after reuse the booked fixture with the dates moved around today).
 */
export async function loadRunHub(runId: string, preview?: string | null): Promise<RunHub | null> {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  if (MOCK) {
    const mode = preview === "live" || preview === "after" ? preview : null;
    let hub = withMockExtras(await mockFixture<RunHub>("commerce-run", mode ? "booked" : preview), mode);
    if (hub.run.id !== runId) {
      // Other sample runs on the index: the base retreat, re-dated, with the card's state.
      const idx = await fixture<{ runs: { id: string; name: string; status: string; starts_at: string; ends_at: string | null; cover: string | null; track?: string | null; season: string | null; tagline: string | null; mine: string | null; seatsLeft?: number | null; draft_note: string | null }[] }>("commerce-retreats");
      const card = idx.runs.find((r) => r.id === runId);
      if (!card) return null;
      const state = card.mine ? await mockFixture<RunHub>("commerce-run", card.mine === "submitted" ? "submitted" : card.mine === "booked" ? "booked" : card.mine) : null;
      const base = withMockExtras(state ?? hub, null);
      hub = {
        ...base,
        run: { ...base.run, id: card.id, name: card.name, status: card.status as RunStatus, starts_at: card.starts_at, ends_at: card.ends_at, draft_note: card.draft_note, details: { ...base.run.details, cover: card.cover ?? base.run.details.cover, track: card.track ?? base.run.details.track, season: card.season ?? undefined, tagline: card.tagline ?? undefined } },
        seatsLeft: card.seatsLeft ?? null,
      };
      if (hub.prepProgram) hub.prepProgram = { ...hub.prepProgram, opensAt: new Date(Date.parse(card.starts_at) - PREP_DAYS_BEFORE * 86400000).toISOString(), open: card.mine === "booked" && Date.parse(card.starts_at) - PREP_DAYS_BEFORE * 86400000 <= Date.now() };
    }
    return mode ? shiftRun(hub, mode) : hub;
  }
  return realRunHub(runId);
}

/* =============================================================== Coaching */

export interface CoachingPackageView {
  id: string;
  name: string;
  description: string | null;
  sessions: number;
  duration_minutes: number;
  requires_application: boolean;
  price: { amountCents: number; currency: string; label: string | null; draftNote: string | null } | null;
}
export interface CoachingSessionView {
  id: string;
  starts_at: string;
  duration_minutes: number;
  status: "booked" | "completed" | "cancelled" | "no_show";
  meeting_url: string | null;
  member_note: string | null;
  coach_note: string | null;
  can_cancel_with_refund: boolean;
  package: string | null;
  /** Mike's one highest-priority thing after the session. */
  homework?: string | null;
  /** Member prep before the call. */
  prep?: { goals: string | null; footage_url: string | null } | null;
}
export interface CoachingData {
  packages: CoachingPackageView[];
  credits: number;
  slots: { id: string; starts_at: string; duration_minutes: number }[];
  upcoming: CoachingSessionView[];
  past: CoachingSessionView[];
  /** The member's applications to packages that need one (package id → status). */
  applications?: Record<string, string>;
  /** Mike's coaching schedule (programs.meta.schedule). */
  schedule?: { weekdays: number[]; minutes: number; timezone: string; draftNote: string | null } | null;
  faq?: { q: string; a: string }[];
  /** Executive Edge program copy (the package carries sessions and price). */
  executive?: { summary: string | null; points: string[]; priceLabel: string | null } | null;
  /** The group path that replaces group coaching (Zen Savage challenge). */
  group?: { slug: string; name: string; tagline: string | null; summary: string | null } | null;
}

async function realCoaching(): Promise<CoachingData> {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 42);
  const [pkgs, slots, exp, notes, apps, progs] = await Promise.all([
    coachingPackages(sb),
    openCoachingSlots(sb, new Date(), to),
    myExperiences(sb),
    sb.from("coaching_bookings").select("id, coach_note, homework, prep").eq("user_id", user.id),
    sb.from("coaching_applications").select("package_id, status").eq("user_id", user.id),
    sb.from("programs").select("slug, name, tagline, summary, meta, status").in("slug", ["coaching", "executive-edge", "zen-savage"]),
  ]);
  const extra = new Map((notes.data ?? []).map((n) => [n.id, n]));
  const now = Date.now();
  const sessions: CoachingSessionView[] = exp.coaching.bookings.map((b) => {
    const x = extra.get(b.id);
    const prep = (x?.prep ?? {}) as { goals?: string | null; footage_url?: string | null };
    return { ...b, coach_note: x?.coach_note ?? null, homework: x?.homework ?? null, prep: prep.goals || prep.footage_url ? { goals: prep.goals ?? null, footage_url: prep.footage_url ?? null } : null };
  });
  const prog = (slug: string) => (progs.data ?? []).find((p) => p.slug === slug);
  const coach = prog("coaching");
  const cmeta = (coach?.meta ?? {}) as { schedule?: { weekdays?: number[]; minutes?: number; timezone?: string; draft_note?: string }; faq?: { q: string; a: string }[] };
  const ee = prog("executive-edge");
  const emeta = (ee?.meta ?? {}) as { sections?: { points?: string[] }[]; price_label?: string };
  const zen = prog("zen-savage");
  return {
    packages: pkgs.map((p) => {
      const price = p.prices.find((x) => x.interval === "one_time") ?? p.prices[0];
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sessions: p.sessions,
        duration_minutes: p.duration_minutes,
        requires_application: p.requires_application,
        price: price ? { amountCents: price.amount_cents, currency: price.currency, label: price.label, draftNote: price.draft_note } : null,
      };
    }),
    credits: exp.coaching.credits_remaining,
    slots: slots.map((s) => ({ id: s.id, starts_at: s.starts_at, duration_minutes: s.duration_minutes })),
    upcoming: sessions.filter((s) => s.status === "booked" && new Date(s.starts_at).getTime() + s.duration_minutes * 60000 > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    past: sessions.filter((s) => !(s.status === "booked" && new Date(s.starts_at).getTime() + s.duration_minutes * 60000 > now)).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    applications: Object.fromEntries((apps.data ?? []).map((a) => [a.package_id, a.status])),
    schedule: cmeta.schedule
      ? { weekdays: cmeta.schedule.weekdays ?? [2], minutes: cmeta.schedule.minutes ?? 45, timezone: cmeta.schedule.timezone ?? "America/Los_Angeles", draftNote: cmeta.schedule.draft_note ?? null }
      : null,
    faq: cmeta.faq ?? [],
    executive: ee ? { summary: ee.summary, points: emeta.sections?.[0]?.points ?? [], priceLabel: emeta.price_label ?? null } : null,
    group: zen && zen.status === "published" ? { slug: zen.slug, name: zen.name, tagline: zen.tagline, summary: zen.summary } : null,
  };
}

/** Coaching. Local preview: `commerce-coaching.json` (real) or `?preview=active`. */
export async function loadCoaching(preview?: string | null): Promise<CoachingData> {
  return MOCK ? mockFixture<CoachingData>("commerce-coaching", preview) : realCoaching();
}

/* ========================================================== Organizations */

export interface OrgSummary { id: string; slug: string; name: string; logo_url: string | null; status: string; seats: number; role: OrgRole; joined_at: string }
export interface OrgInviteView { id: string; email: string; role: string; expires_at: string }
export interface MyOrgData {
  orgs: OrgSummary[];
  /** First org's dashboard (admins, owners and coaches). */
  overview: OrgOverview | null;
  invites: OrgInviteView[];
  /** For plain members: the coach assigned to them. */
  myCoach: { name: string; avatar_url: string | null } | null;
  joinLink: string | null;
}

async function realMyOrg(): Promise<MyOrgData> {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const rows = await myOrgs(sb, user.id);
  const orgs: OrgSummary[] = rows.flatMap((r) => {
    const o = (Array.isArray(r.organizations) ? r.organizations[0] : r.organizations) as { id: string; slug: string; name: string; logo_url: string | null; status: string; seats: number } | null;
    return o ? [{ ...o, role: r.role as OrgRole, joined_at: r.joined_at }] : [];
  });
  const first = orgs[0];
  if (!first) return { orgs, overview: null, invites: [], myCoach: null, joinLink: null };
  const manager = first.role === "owner" || first.role === "admin";
  const [overview, invites, me, org] = await Promise.all([
    manager || first.role === "coach" ? orgOverview(sb, first.id).catch(() => null) : null,
    manager ? orgInvites(sb, first.id).catch(() => []) : [],
    sb.from("org_members").select("coach_id").eq("org_id", first.id).eq("user_id", user.id).maybeSingle(),
    manager ? sb.from("organizations").select("join_token").eq("id", first.id).maybeSingle() : null,
  ]);
  let myCoach: MyOrgData["myCoach"] = null;
  if (me.data?.coach_id) {
    const { data } = await sb.from("profiles").select("display_name, first_name, avatar_url").eq("id", me.data.coach_id).maybeSingle();
    if (data) myCoach = { name: data.display_name || data.first_name || "Your coach", avatar_url: data.avatar_url };
  }
  const token = (org?.data as { join_token?: string | null } | null)?.join_token ?? null;
  return {
    orgs,
    overview,
    invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: i.expires_at })),
    myCoach,
    joinLink: token ? `/join/${token}` : null,
  };
}

/** Member + admin organization view. Local preview: `commerce-org.json` (real) or `?preview=admin`. */
export async function loadMyOrg(preview?: string | null): Promise<MyOrgData> {
  return MOCK ? mockFixture<MyOrgData>("commerce-org", preview) : realMyOrg();
}

/** Coach view of one org by slug. */
export async function loadOrgBySlug(slug: string, preview?: string | null): Promise<OrgOverview | null> {
  if (MOCK) {
    const d = await mockFixture<MyOrgData>("commerce-org", preview ?? "admin").catch(() => null);
    return d?.overview && d.overview.org.slug === slug ? d.overview : null;
  }
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const { data } = await sb.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return orgOverview(sb, data.id).catch(() => null);
}

/** Public join page: what a token is. Members can't read other orgs, so the name shows only when visible to the viewer. */
export interface JoinInfo { kind: "invite" | "link"; orgName: string | null; signedIn: boolean; alreadyMember: boolean }

export async function loadJoin(token: string): Promise<JoinInfo> {
  if (MOCK) return fixture<JoinInfo>("commerce-join");
  const { supabase: sb, user } = await getUser();
  // Invite tokens are 16 random bytes (32 hex), org join links 12 bytes (24 hex).
  const kind: JoinInfo["kind"] = token.length === 24 ? "link" : "invite";
  if (!user) return { kind, orgName: null, signedIn: false, alreadyMember: false };
  const { data: byLink } = await sb.from("organizations").select("id, name").eq("join_token", token).maybeSingle();
  if (byLink) {
    const { data: m } = await sb.from("org_members").select("status").eq("org_id", byLink.id).eq("user_id", user.id).maybeSingle();
    return { kind: "link", orgName: byLink.name, signedIn: true, alreadyMember: m?.status === "active" };
  }
  return { kind: "invite", orgName: null, signedIn: true, alreadyMember: false };
}

/* =============================================================== Checkout */

/** One of the member's orders (pending included, so the success page can wait for the webhook). */
export async function loadOrder(orderId: string | undefined): Promise<Order | null> {
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  if (MOCK) return fixture<Order | null>("commerce-order").catch(() => null);
  const { supabase: sb, user } = await getUser();
  if (!user) return null;
  const orders = await myOrders(sb, { includePending: true }).catch(() => []);
  return orders.find((o) => o.id === orderId) ?? null;
}
