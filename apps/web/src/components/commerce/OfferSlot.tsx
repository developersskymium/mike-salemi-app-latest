import type { OfferContext } from "@ms/api";
import { loadOffer, type OfferSlotPlacement } from "@/lib/loaders/commerce";
import { OfferCard } from "./OfferCard";

type Props = {
  /** Where the slot sits; the offer rules match on it. */
  placement: OfferSlotPlacement;
  /** What just happened (completed phase/program, tool result) so triggered offers can match. */
  context?: OfferContext;
  /** compact: a quiet row (default on Today, Library, program page). feature: a photo card (completion moments, checkout). */
  variant?: "compact" | "feature";
  className?: string;
};

const FEATURE: OfferSlotPlacement[] = ["day_complete", "program_complete", "checkout", "tool_result"];

/**
 * Smart offer slot. Server Component: loads the single best offer for the signed-in member and renders a
 * glass offer card, or nothing at all when there is no offer. Views, clicks and dismissals are logged.
 *
 *   <OfferSlot placement="today" />
 *   <OfferSlot placement="program_complete" context={{ completed: "program", program_id }} />
 */
export async function OfferSlot({ placement, context = {}, variant, className }: Props) {
  const view = await loadOffer(placement, context);
  if (!view) return null;
  return <OfferCard view={view} placement={placement} variant={variant ?? (FEATURE.includes(placement) ? "feature" : "compact")} className={className} />;
}
