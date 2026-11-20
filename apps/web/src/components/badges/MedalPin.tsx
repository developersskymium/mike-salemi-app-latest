import type { CSSProperties } from "react";
import { Medal, MEDAL_TIERS } from "@/components/graphics";
import { medalArt } from "@/components/you/MedalArt";
import type { MedalTier } from "./catalog";

/**
 * The enamel medal (components/graphics Medal) with an optional per-program enamel colour.
 * Medal.css reads --gfx-<tier>-enamel* from any ancestor, so the colour is set on a wrapper.
 */
export function MedalPin({ tier, icon, family, color, size = 64, locked, animated, title, className }: { tier: MedalTier; icon?: string | null; family?: string | null; color?: string | null; size?: number; locked?: boolean; animated?: boolean; title?: string; className?: string }) {
  const style = color
    ? ({
        [`--gfx-${tier}-enamel-hi`]: `color-mix(in srgb, ${color} 72%, #fff)`,
        [`--gfx-${tier}-enamel`]: color,
        [`--gfx-${tier}-enamel-lo`]: `color-mix(in srgb, ${color} 62%, #000)`,
      } as CSSProperties)
    : undefined;
  return (
    <span className={className} style={{ display: "inline-grid", lineHeight: 0, ...style }}>
      <Medal tier={MEDAL_TIERS.includes(tier) ? tier : "bronze"} size={size} locked={locked} animated={animated} title={title ?? ""}>
        {medalArt(icon, family)}
      </Medal>
    </span>
  );
}
