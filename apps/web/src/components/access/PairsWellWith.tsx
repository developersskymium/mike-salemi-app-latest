import { OfferCard } from "@/components/commerce/OfferCard";
import { loadOffer } from "@/lib/loaders/commerce";

/**
 * "Pairs well with" (spec 11 · program page #7): one quiet card per program page, chosen by the
 * offers engine (rules `viewing` the program, never the program itself, never one the member already has),
 * with its reason. Dismissible (hidden 30 days), ≤3 views per 14 days. Renders nothing when there's no fit.
 *
 *   <PairsWellWith program={program.slug} />
 */
export async function PairsWellWith({ program, className }: { program: string; className?: string }) {
  const view = await loadOffer("program_page", { program_id: program });
  if (!view) return null;
  return <OfferCard view={view} placement="program_page" variant="compact" className={className} />;
}
