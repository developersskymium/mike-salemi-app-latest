import "server-only";
import { getOffer, type Offer, type OfferContext, type OfferPlacement } from "@ms/api";
import { createClient } from "@/lib/supabase/server";
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
    console.error("loadOffer", placement, e);
    return null;
  }
}
