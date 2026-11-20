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

/* ================================================================== Offers */

export type OfferSlotPlacement = Exclude<OfferPlacement, "email" | "push">;

/** An offer ready to render: where its CTA goes and the photo to show (offer image, else the target's own media). */
export interface OfferView {
  offer: Offer;
  href: string;
  external: boolean;
  image: { url: string; alt: string } | null;
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

async function realOffer(placement: OfferSlotPlacement, context: OfferContext): Promise<OfferView | null> {
  const sb = await createClient();
  const offer = await getOffer(sb, placement, context);
  if (!offer) return null;
  const { href, external } = offerHref(offer);
  return { offer, href, external, image: await offerImage(offer), eyebrow: offer.target?.name ?? null };
}

/**
 * The best offer for a placement. In local preview it reads `fixtures/commerce-offer-<placement>.json`
 * (no file = no offer). Never throws: a failing offer simply renders nothing.
 */
export async function loadOffer(placement: OfferSlotPlacement, context: OfferContext = {}): Promise<OfferView | null> {
  try {
    if (MOCK) return await fixture<OfferView | null>(`commerce-offer-${placement}`).catch(() => null);
    return await realOffer(placement, context);
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
  return { subscription, planPrice, planDraftNote, orders, provider: subscription?.provider ?? null };
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
  facilitators?: { name: string; role: string }[];
  faq?: { q: string; a: string }[];
  travel?: string;
  accommodation?: string;
  packing?: ChecklistItem[];
  prerequisites?: ChecklistItem[];
  checklist_note?: string;
  documents?: RunDocument[];
  help?: { email?: string; phone?: string; note?: string };
  format?: string;
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
  application: { id: string; status: ApplicationStatus; applied_at: string } | null;
  checklist: Record<string, boolean>;
  sessions: { id: string; title: string; starts_at: string; ends_at: string | null; join_url: string | null }[];
  /** Server price for booking this run (after acceptance or when no application is needed). */
  quote: Quote | null;
}

async function realRunHub(runId: string): Promise<RunHub | null> {
  const { supabase: sb, user } = await getUser();
  const run = await getRun(sb, runId);
  if (!run) return null;
  const prog = (Array.isArray(run.programs) ? run.programs[0] : run.programs) as { id: string; slug: string; name: string; type: string } | null;
  const [exp, checklist, sessions, q] = await Promise.all([
    user ? myExperiences(sb).catch(() => null) : null,
    user ? myChecklist(sb, user.id, runId).catch(() => new Map<string, boolean>()) : new Map<string, boolean>(),
    runSessions(sb, runId).catch(() => []),
    quote(sb, "run", runId).catch(() => null),
  ]);
  const mine = exp?.runs.find((r) => r.run_id === runId) ?? null;
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
    application: mine ? { id: mine.application_id, status: mine.status, applied_at: mine.applied_at } : null,
    checklist: Object.fromEntries(checklist),
    sessions: sessions.map((s) => ({ id: s.id, title: s.title, starts_at: s.starts_at, ends_at: s.ends_at, join_url: s.join_url })),
    quote: q,
  };
}

/** Retreat hub. Local preview: `commerce-run.json` (real run, member not booked) or `?preview=booked`. */
export async function loadRunHub(runId: string, preview?: string | null): Promise<RunHub | null> {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return null;
  if (MOCK) {
    const hub = await mockFixture<RunHub>("commerce-run", preview);
    return hub.run.id === runId ? hub : null;
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
}
export interface CoachingData {
  packages: CoachingPackageView[];
  credits: number;
  slots: { id: string; starts_at: string; duration_minutes: number }[];
  upcoming: CoachingSessionView[];
  past: CoachingSessionView[];
}

async function realCoaching(): Promise<CoachingData> {
  const { supabase: sb, user } = await getUser();
  if (!user) throw new Error("not signed in");
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 42);
  const [pkgs, slots, exp, notes] = await Promise.all([
    coachingPackages(sb),
    openCoachingSlots(sb, new Date(), to),
    myExperiences(sb),
    sb.from("coaching_bookings").select("id, coach_note").eq("user_id", user.id),
  ]);
  const noteById = new Map((notes.data ?? []).map((n) => [n.id, n.coach_note]));
  const now = Date.now();
  const sessions: CoachingSessionView[] = exp.coaching.bookings.map((b) => ({ ...b, coach_note: noteById.get(b.id) ?? null }));
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
