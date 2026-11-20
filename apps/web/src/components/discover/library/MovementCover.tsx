import { MovementFigure, type MoveName } from "@/components/graphics";

/** Sky by level: dawn for On Ramp, daylight through the phases, warm dusk for Phase 3. */
const SKY: Record<string, string> = { "on-ramp": "dawn", "phase-1": "day", "phase-2": "noon", "phase-3": "dusk" };

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Designed, text-free cover for a library video (Summit cut-paper daylight): sky, Mount Shasta, the sun
 * and the athlete doing the movement the video teaches. Used wherever a video has no clean frame, so
 * no cover ever carries baked-in text. Static (animation only in the player context).
 */
export function MovementCover({ move, seed, level, size = 132, animated = false }: { move: MoveName; seed: string; level?: string | null; size?: number; animated?: boolean }) {
  const h = hash(seed);
  const sunX = 74 + (h % 14); // 74–87% across, below the level badge
  const flip = h % 2 === 0;
  return (
    <span className="w1-mc" data-sky={SKY[level ?? ""] ?? "day"} aria-hidden style={{ ["--sun-x" as string]: `${sunX}%` }}>
      <span className="w1-mc-sun" />
      <svg className="w1-mc-mtn" viewBox="0 0 400 120" preserveAspectRatio="none" style={flip ? { transform: "scaleX(-1)" } : undefined}>
        <path className="w1-mc-far" d="M0 92 C40 84 70 70 104 72 C130 74 150 62 176 66 C210 72 236 86 270 82 C310 78 350 70 400 76 V120 H0Z" />
        <path className="w1-mc-peak" d="M60 120 C110 104 150 82 182 52 C196 38 206 26 218 24 C230 22 240 32 252 44 C282 74 322 98 372 120Z" />
        <path className="w1-mc-snow" d="M196 38 C206 26 212 22 218 24 C226 22 236 30 246 40 C238 44 232 40 226 46 C220 40 214 46 206 42 C202 44 198 42 196 38Z" />
      </svg>
      <span className="w1-mc-ground" />
      <span className="w1-mc-fig">
        <MovementFigure move={move} size={size} animated={animated} />
      </span>
    </span>
  );
}
