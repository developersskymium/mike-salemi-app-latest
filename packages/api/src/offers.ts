import type { DB } from "./client";

export type OfferPlacement =
  | "today"
  | "program_page"
  | "day_complete"
  | "program_complete"
  | "library"
  | "tool_result"
  | "checkout"
  | "email"
  | "push";

/** What just happened, so completion- and tool-triggered offers can match. */
export type OfferContext =
  | { completed: "phase" | "path" | "program"; program_id?: string; path_id?: string }
  | { tool_id: string; result?: string }
  /** The program page being viewed (Pairs well with); never offers that same program. */
  | { program_id: string }
  | Record<string, never>;

export interface Offer {
  id: string;
  placement: string;
  headline: string;
  body: string | null;
  cta_label: string;
  image_url: string | null;
  target_kind: "program" | "plan" | "bundle" | "run" | "coaching" | "resource" | "url";
  target_ref: string;
  priority: number;
  coupon_code: string | null;
  /** Why this offer, now ("Because you finished a free series"). 0024. */
  reason?: string | null;
  /** program {id, slug, name} | plan {id, name} | coaching {id, name} | url {url} | null */
  target: { id?: string; slug?: string; name?: string; url?: string } | null;
}

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;
function rpc(sb: DB, fn: string, args?: Record<string, unknown>): RpcResult {
  return (sb as unknown as { rpc: (f: string, a?: Record<string, unknown>) => RpcResult }).rpc(fn, args);
}

/** The single best smart offer for this placement, or null. Log a 'view' when you show it. */
export async function getOffer(sb: DB, placement: OfferPlacement, context: OfferContext = {}): Promise<Offer | null> {
  const { data, error } = await rpc(sb, "get_offer", { p_placement: placement, p_context: context });
  if (error) throw new Error(`getOffer: ${error.message}`);
  return (data as Offer | null) ?? null;
}

/** view (counted once a day) | click | dismiss (hides the offer for its cooldown). Conversions are logged by the server. */
export async function logOfferEvent(sb: DB, offerId: string, placement: OfferPlacement, event: "view" | "click" | "dismiss") {
  const { error } = await rpc(sb, "log_offer_event", { p_offer: offerId, p_placement: placement, p_event: event });
  if (error) throw new Error(`logOfferEvent: ${error.message}`);
}
