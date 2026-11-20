import "server-only";
import type { DB } from "@ms/api";
import { MOCK, mockable } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * Public site data that the catalog loaders don't carry: the standalone (à-la-carte) price of each
 * program, used for the "plan vs buying separately" value meters, and coaching session prices.
 * Prices are read from the active `prices` rows (public read); nothing is computed for checkout here.
 */
export type ListPrice = { programId: string; amountCents: number; currency: string; label: string | null; draftNote: string | null };
export type PublicPrices = { programs: ListPrice[]; coaching: ListPrice[] };

export const loadPublicPrices = mockable("public-prices", async (sb: DB): Promise<PublicPrices> => {
  const { data } = await sb
    .from("prices")
    .select("kind, ref_id, amount_cents, currency, label, draft_note")
    .in("kind", ["program", "coaching"])
    .eq("interval", "one_time")
    .eq("is_active", true)
    .order("amount_cents");
  const rows = (data ?? []).map((r) => ({ kind: r.kind as string, p: { programId: String(r.ref_id), amountCents: r.amount_cents, currency: r.currency, label: r.label, draftNote: r.draft_note } }));
  return { programs: rows.filter((r) => r.kind === "program").map((r) => r.p), coaching: rows.filter((r) => r.kind === "coaching").map((r) => r.p) };
});

/** Empty prices when the table can't be read: the value meters simply hide. */
export async function publicPrices(sb: DB): Promise<PublicPrices> {
  return loadPublicPrices(sb).catch(() => ({ programs: [], coaching: [] }));
}

/**
 * The visitor for public pages. Local mock preview is always "signed in" for the member app; the
 * marketing pages show the visitor state there so they can be reviewed as a newcomer sees them.
 */
export async function publicViewer() {
  const { supabase, user } = await getUser();
  return { supabase, signedIn: MOCK ? false : Boolean(user) };
}
