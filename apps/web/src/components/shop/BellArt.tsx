import { Kettlebell } from "@/components/graphics";

/**
 * Product visual for bells without a product photo: the cast competition bell(s) in their real colours
 * on a quiet well. Never text baked into an image; the weight is cast on the bell like the real thing.
 */
export function BellArt({ weights, size = 120, className }: { weights: number[]; size?: number; className?: string }) {
  const list = weights.slice(0, 3);
  return (
    <span className={`shp-bellart${className ? ` ${className}` : ""}`} aria-hidden>
      {list.map((w, i) => (
        <Kettlebell key={`${w}-${i}`} weight={w} colorCoded size={Math.round(size * (list.length > 1 ? 0.62 + (i / Math.max(1, list.length - 1)) * 0.38 : 1))} />
      ))}
    </span>
  );
}

/** Weights to draw for a product: bundle/pair/single bells. */
export function bellWeights(p: { slug: string; variants: { key: string; weight_kg: number | null }[]; bundle: { for?: string; slug: string; key: string }[] }, variantKey?: string): number[] {
  const kb = p.bundle.filter((b) => b.slug === "competition-kettlebell" && (!b.for || !variantKey || b.for === variantKey));
  if (kb.length) {
    const forKey = variantKey ?? kb[0]?.for;
    return kb.filter((b) => !b.for || b.for === forKey).map((b) => Number.parseInt(b.key, 10)).filter(Boolean);
  }
  const v = (variantKey && p.variants.find((x) => x.key === variantKey)) || p.variants.find((x) => x.weight_kg === 16) || p.variants[0];
  if (!v?.weight_kg) return [];
  return p.slug.includes("pair") ? [v.weight_kg, v.weight_kg] : [v.weight_kg];
}
