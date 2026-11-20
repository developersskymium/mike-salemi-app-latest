import "server-only";
import { mySubscription, myOrders } from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { stripeConfigured } from "@/lib/stripe";
import { normalizeMatrix, type SettingsHub, type TrainingProfile, type Units } from "./model";

/** Loose client for tables newer than the generated types (training_profiles 0025, member_settings 0030). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;

export async function session() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  return { sb: supabase as Loose, user };
}

/** Everything Settings shows, in one parallel read. */
export async function loadSettingsHub(): Promise<SettingsHub> {
  if (MOCK) return { ...(await fixture<SettingsHub>("settings-hub")), billing: { ...(await fixture<SettingsHub>("settings-hub")).billing, paymentsLive: stripeConfigured() } };
  const { sb, user } = await session();
  const [profile, tp, ms, np, sub, orders, plans, prices, reqs, bookings, retreats] = await Promise.all([
    sb.from("profiles").select("display_name, first_name, avatar_url, timezone, preferences, created_at").eq("id", user.id).maybeSingle(),
    sb.from("training_profiles").select("data, sources").eq("user_id", user.id).maybeSingle(),
    sb.from("member_settings").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("notification_prefs").select("reminder_time, quiet_start, quiet_end").eq("user_id", user.id).maybeSingle(),
    mySubscription(sb, user.id).catch(() => null),
    myOrders(sb).catch(() => []),
    sb.from("plans").select("id, name, rank").eq("is_active", true).order("rank"),
    sb.from("prices").select("ref_id, amount_cents, currency, interval").eq("kind", "plan").eq("is_active", true),
    sb.from("account_requests").select("id, kind, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    sb.from("coaching_bookings").select("id, starts_at").eq("user_id", user.id).eq("status", "booked").gt("starts_at", new Date().toISOString()).order("starts_at").limit(20),
    sb.from("run_applications").select("program_runs(name)").eq("user_id", user.id).eq("status", "booked"),
  ]);
  const p = profile.data ?? {};
  const name = p.display_name || p.first_name || user.email?.split("@")[0] || "Member";
  const s = ms.data;
  const priceRows = (prices.data ?? []) as { ref_id: string; amount_cents: number; currency: string; interval: string }[];
  const price = (id: string, iv: string) => priceRows.find((r) => r.ref_id === id && r.interval === iv) ?? null;
  const subPrice = sub ? price(sub.planId, sub.interval) : null;
  return {
    account: {
      name,
      firstName: p.first_name || name.split(" ")[0]!,
      email: user.email ?? "",
      createdAt: p.created_at ?? null,
      autoplay: (p.preferences?.autoplay as boolean | undefined) ?? true,
      avatarUrl: p.avatar_url ?? null,
    },
    profile: (tp.data?.data ?? {}) as TrainingProfile,
    profileSources: (tp.data?.sources ?? {}) as Record<string, string>,
    settings: {
      units: (s?.units as Units) ?? "kg",
      ownedBells: ((s?.owned_bells ?? []) as (number | string)[]).map(Number),
      matrix: normalizeMatrix(s?.notify_matrix),
      reducedMotion: Boolean(s?.reduced_motion),
    },
    reminders: { time: np.data?.reminder_time ?? null, quietStart: np.data?.quiet_start ?? null, quietEnd: np.data?.quiet_end ?? null, timezone: p.timezone ?? "UTC" },
    billing: {
      plan: sub ? { id: sub.planId, name: sub.planName, rank: sub.planRank } : null,
      status: sub?.status ?? null,
      interval: sub?.interval ?? null,
      amountCents: subPrice?.amount_cents ?? null,
      currency: subPrice?.currency ?? "usd",
      renewsOn: sub?.currentPeriodEnd ?? null,
      ending: Boolean(sub && (sub.cancelAtPeriodEnd || sub.status === "cancelled")),
      provider: sub?.provider ?? null,
      paymentsLive: stripeConfigured(),
      plans: ((plans.data ?? []) as { id: string; name: string; rank: number }[]).map((pl) => ({ ...pl, monthCents: price(pl.id, "month")?.amount_cents ?? null, yearCents: price(pl.id, "year")?.amount_cents ?? null })),
      invoices: orders.map((o) => ({ id: o.id, reference: o.reference, date: o.created_at, totalCents: o.total_cents, currency: o.currency, status: o.status, label: o.items.map((i) => i.name).join(", ") || "Order" })),
    },
    deletion: {
      coachingSessions: ((bookings.data ?? []) as { id: string; starts_at: string }[]).map((b) => ({ id: b.id, startsAt: b.starts_at })),
      retreats: ((retreats.data ?? []) as { program_runs: { name: string } | { name: string }[] | null }[])
        .map((r) => (Array.isArray(r.program_runs) ? r.program_runs[0]?.name : r.program_runs?.name))
        .filter((n): n is string => Boolean(n)),
    },
    requests: ((reqs.data ?? []) as { id: string; kind: string; status: string; created_at: string }[]).map((r) => ({ id: r.id, kind: r.kind, status: r.status, createdAt: r.created_at })),
  };
}

/** Onboarding needs only the name and whatever profile already exists (prefill). */
export async function loadOnboardingStart(): Promise<{ firstName: string; profile: TrainingProfile; done: boolean }> {
  if (MOCK) return { firstName: "Daniel", profile: {}, done: false };
  const { sb, user } = await session();
  const [p, tp] = await Promise.all([
    sb.from("profiles").select("first_name, display_name, onboarding").eq("id", user.id).maybeSingle(),
    sb.from("training_profiles").select("data").eq("user_id", user.id).maybeSingle(),
  ]);
  const name = p.data?.first_name || p.data?.display_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  return { firstName: name, profile: (tp.data?.data ?? {}) as TrainingProfile, done: Boolean(p.data?.onboarding?.completed_at) };
}

export interface FirstWeek {
  showWelcome: boolean;
  checklist: { first_session: boolean; reminder_time: boolean; home_screen: boolean; dismissed: boolean };
  completedSessions: number;
  installPrompted: boolean;
}

/** First-week state for Home (welcome video once, checklist, install prompt after first session). */
export async function loadFirstWeek(): Promise<FirstWeek> {
  if (MOCK) return { showWelcome: true, checklist: { first_session: false, reminder_time: true, home_screen: false, dismissed: false }, completedSessions: 0, installPrompted: false };
  const { sb, user } = await session();
  const [ms, np, done] = await Promise.all([
    sb.from("member_settings").select("checklist, welcome_seen_at, install_prompt_at").eq("user_id", user.id).maybeSingle(),
    sb.from("notification_prefs").select("reminder_time").eq("user_id", user.id).maybeSingle(),
    sb.from("step_progress").select("step_id", { count: "exact", head: true }).eq("user_id", user.id).not("completed_at", "is", null),
  ]);
  const c = (ms.data?.checklist ?? {}) as Record<string, string>;
  const completed = done.count ?? 0;
  return {
    showWelcome: !ms.data?.welcome_seen_at,
    checklist: { first_session: completed > 0 || Boolean(c.first_session), reminder_time: Boolean(c.reminder_time || np.data?.reminder_time), home_screen: Boolean(c.home_screen), dismissed: Boolean(c.dismissed) },
    completedSessions: completed,
    installPrompted: Boolean(ms.data?.install_prompt_at),
  };
}

/** Mike's 30-s welcome clip (site_settings key `welcome_video` = {"vimeo": "<id>"}); null shows a photo note instead. */
export async function loadWelcomeVideo(): Promise<string | null> {
  if (MOCK) return null;
  try {
    const { sb } = await session();
    const { data } = await sb.from("site_settings").select("value").eq("key", "welcome_video").maybeSingle();
    const id = data?.value?.vimeo;
    return typeof id === "string" && /^\d{5,12}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
