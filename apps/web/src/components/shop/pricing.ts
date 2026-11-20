import type { ShopNeed, ShopProduct, ShopVariant } from "@/lib/loaders/shop";

/**
 * Display pricing only. The database re-prices every line at checkout (private.shop_quote):
 * member price for Pro/Max members, flat shipping under the free-shipping line.
 */
export const unitCents = (v: ShopVariant, member: boolean) => (member && v.member_price_cents != null ? v.member_price_cents : v.price_cents);

export const NEEDS: { id: ShopNeed; label: string; line: string }[] = [
  { id: "start", label: "Start here", line: "Your first bell and the plan to use it." },
  { id: "level-up", label: "Level up", line: "Pairs, heavier tools, the next phase." },
  { id: "recover", label: "Recover", line: "For the days in between." },
  { id: "wear", label: "Wear", line: "What Mike trains in." },
];

/** Bundle contents for one bundle variant, priced from the catalogue, and the saving against buying them separately. */
export function bundleFor(p: ShopProduct, v: ShopVariant | undefined, products: ShopProduct[], member: boolean) {
  if (!p.bundle.length || !v) return null;
  const parts = p.bundle
    .filter((b) => !b.for || b.for === v.key)
    .map((b) => {
      const prod = products.find((x) => x.slug === b.slug);
      const pv = prod?.variants.find((x) => x.key === b.key);
      return prod && pv ? { product: prod, variant: pv, qty: b.qty } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const separate = parts.reduce((s, x) => s + unitCents(x.variant, member) * x.qty, 0);
  const saving = Math.max(0, separate - unitCents(v, member));
  return { parts, separate, saving };
}

/** Biggest bundle saving across variants (for cards). */
export function bestSaving(p: ShopProduct, products: ShopProduct[], member: boolean) {
  return Math.max(0, ...p.variants.map((v) => bundleFor(p, v, products, member)?.saving ?? 0));
}

/** Nearest competition weight we sell for a selector size (e.g. 9 → 8). */
export function nearestBell(kg: number, weights: number[]) {
  return weights.reduce((best, w) => (Math.abs(w - kg) < Math.abs(best - kg) || (Math.abs(w - kg) === Math.abs(best - kg) && w < best) ? w : best), weights[0] ?? kg);
}
