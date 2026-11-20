import { OfferForm } from "@/components/studio/OfferForm";
import { PageHead } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadOffer } from "@/lib/studio/loaders";

export default async function NewOffer() {
  await studioAdmin();
  const d = await loadOffer("new");
  return (<><PageHead eyebrow={[{ label: "Offers", href: "/studio/offers" }, { label: "New" }]} title="New offer" /><OfferForm offer={null} programs={d.programs as never} plans={d.plans as never} /></>);
}
