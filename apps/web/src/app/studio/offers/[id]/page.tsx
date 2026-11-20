import { notFound } from "next/navigation";
import { OfferForm } from "@/components/studio/OfferForm";
import { PageHead, Panel, Stat } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadOffer, loadOffers } from "@/lib/studio/loaders";

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const [d, all] = await Promise.all([loadOffer(id), loadOffers()]);
  if (!d.offer) notFound();
  const perf = all.find((o) => o.id === id)?.perf ?? { view: 0, click: 0, convert: 0, dismiss: 0 };
  return (
    <>
      <PageHead eyebrow={[{ label: "Offers", href: "/studio/offers" }, { label: d.offer.name }]} title={d.offer.name} />
      <div className="st-grid st-g4" style={{ marginBottom: 16 }}><Stat n={perf.view} label="Views" /><Stat n={perf.click} label="Clicks" /><Stat n={perf.convert} label="Conversions" /><Stat n={perf.dismiss} label="Dismissed" /></div>
      <OfferForm offer={d.offer} programs={d.programs as never} plans={d.plans as never} />
    </>
  );
}
