"use client";

import { useState, useTransition } from "react";
import { Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { rateGear } from "@/lib/actions/shop";

/** "Rate your gear": five stars, saved on tap (the database checks you bought it). */
export function RateGear({ productId, name, initial }: { productId: string; name: string; initial: number }) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  const [, start] = useTransition();
  const toast = useToast();
  const set = (n: number) => {
    haptic(6);
    const prev = value;
    setValue(n);
    start(async () => {
      const r = await rateGear(productId, n);
      if (r.ok) toast(prev ? "Rating updated" : "Thanks. Your rating helps other members choose.", { tone: "success", icon: "check" });
      else {
        setValue(prev);
        toast("That rating didn't save. Try again.", { icon: "close" });
      }
    });
  };
  const shown = hover || value;
  return (
    <div className="shp-rate">
      <span className="lq-t13">{value ? "Your rating" : "Rate your gear"} · <span className="lq-c2">{name}</span></span>
      <span className="shp-rate-stars" role="radiogroup" aria-label={`Rate ${name}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            className="shp-rate-star"
            data-on={n <= shown ? "" : undefined}
            onMouseEnter={() => setHover(n)}
            onClick={() => set(n)}
          >
            <Icon name="star" size="sm" />
          </button>
        ))}
      </span>
    </div>
  );
}
