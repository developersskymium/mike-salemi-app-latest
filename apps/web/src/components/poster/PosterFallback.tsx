import "./poster.css";

/** Stable 0..1 from any id (Vimeo id, slug): varies the composition, never the colour. */
function unit(seed: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Designed poster for a video or program without a photo (domain-restricted Vimeo videos until the API
 * backfill runs, programs without artwork). Monochrome per the design system: a soft Glacier glow, the
 * Mount Shasta ridge line and the title — composition varies by seed, so a grid never looks repeated.
 * Fills its positioned parent. Pass `compact` for thumbnails (no title).
 */
export function PosterFallback({ seed, title, duration, compact }: { seed: string; title?: string; duration?: string | null; compact?: boolean }) {
  const x = 15 + unit(seed) * 70;
  const y = 10 + unit(seed, 7) * 50;
  const shift = Math.round(unit(seed, 13) * 120);
  return (
    <span className="pf" data-compact={compact ? "" : undefined} style={{ ["--pf-x" as string]: `${x}%`, ["--pf-y" as string]: `${y}%` }} role="img" aria-label={title ? `${title} (no preview image)` : "No preview image"}>
      <svg className="pf-ridge" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <path d={`M${-shift} 112 L${58 - shift} 92 L${96 - shift} 100 L${142 - shift} 70 L${170 - shift} 78 L${214 - shift} 22 L${232 - shift} 16 L${248 - shift} 28 L${262 - shift} 24 L${300 - shift} 66 L${330 - shift} 58 L${362 - shift} 84 L${400 - shift} 76 L${458 - shift} 96 L${520 - shift} 80 L${560 - shift} 104`} />
      </svg>
      <span className="pf-play" aria-hidden><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg></span>
      {!compact && title && <span className="pf-title">{title}</span>}
      {duration && <span className="pf-dur lq-num">{duration}</span>}
    </span>
  );
}
