/** Mount Shasta silhouette line art (the retreat's horizon), used behind travel and empty prepare states. */
export function Ridge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 140" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d="M0 132 L58 108 L96 116 L142 84 L170 92 L214 28 L232 22 L248 34 L262 30 L300 78 L330 70 L362 98 L400 90" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d="M214 28 L224 44 L232 38 L240 50 L248 34" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".7" vectorEffect="non-scaling-stroke" />
      <path d="M0 136 L400 136" stroke="currentColor" strokeWidth="1" opacity=".5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
