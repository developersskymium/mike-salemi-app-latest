import { Kettlebell } from "@/components/graphics";

/**
 * Mike's competition bell(s): same size at every weight, colour-coded by kg, the weight cast on the bell.
 * Never text baked into an image.
 */
export function BellArt({ weights, size = 120, className }: { weights: number[]; size?: number; className?: string }) {
  const list = weights.slice(0, 3);
  return (
    <span className={`shp-bellart${className ? ` ${className}` : ""}`} aria-hidden>
      {list.map((w, i) => (
        <Kettlebell key={`${w}-${i}`} variant="competition" weight={w} size={list.length > 1 ? Math.round(size * 0.82) : size} />
      ))}
    </span>
  );
}
