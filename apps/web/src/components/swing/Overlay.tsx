import type { CheckStatus } from "@ms/core";

type P = { x: number; y: number };
export type OverlayPoints = Record<"ear" | "shoulder" | "hip" | "knee" | "ankle", P>;

/**
 * Mike's four teaching lines over a set-up, never the 33 raw points: the stick (hip → head, the
 * back line), the shin line, the hip band (knee to shoulder height) and the head line.
 * Coordinates are normalised (0–1); `aspect` is the frame's width ÷ height.
 */
export function SetupOverlay({
  points,
  aspect,
  status,
  mirror,
  live,
  fit = "frame",
  className,
}: {
  points: OverlayPoints;
  aspect: number;
  status?: Partial<Record<"back" | "shin" | "hip" | "head", CheckStatus>>;
  mirror?: boolean;
  /** Live preview: thinner lines, no labels. */
  live?: boolean;
  /** frame = the whole camera frame (live); body = zoom to the body (scorecard, history). */
  fit?: "frame" | "body";
  className?: string;
}) {
  const W = 100 * aspect;
  const H = 100;
  const at = (p: P) => ({ x: (mirror ? 1 - p.x : p.x) * W, y: p.y * H });
  const ear = at(points.ear);
  const sh = at(points.shoulder);
  const hip = at(points.hip);
  const knee = at(points.knee);
  const ankle = at(points.ankle);
  // The stick follows the back (hip → shoulder) and runs on to head height, so the head line shows
  // how far the head leaves it.
  const bx = sh.x - hip.x;
  const by = sh.y - hip.y;
  const back = Math.hypot(bx, by) || 1;
  const reach = (Math.hypot(ear.x - hip.x, ear.y - hip.y) * 1.08) / back;
  const stickEnd = { x: hip.x + bx * reach, y: hip.y + by * reach };
  const stickStart = { x: hip.x - bx * 0.1, y: hip.y - by * 0.1 };
  // Hip band: knee height to shoulder height, around the hip.
  const top = Math.min(sh.y, knee.y);
  const bottom = Math.max(sh.y, knee.y);
  const bandX = hip.x - 7;
  const bandW = 14;
  const tone = (s?: CheckStatus) => (s === "adjust" ? "adjust" : s === "cant" ? "cant" : s === "good" ? "good" : "neutral");
  const sw = live ? 0.7 : 0.9;
  let box = `0 0 ${W} ${H}`;
  if (fit === "body") {
    const xs = [ear.x, sh.x, hip.x, knee.x, ankle.x, stickEnd.x];
    const ys = [ear.y, sh.y, hip.y, knee.y, ankle.y, stickEnd.y];
    const pad = 8;
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    box = `${x0} ${y0} ${Math.max(...xs) - x0 + pad} ${Math.max(...ys) - y0 + pad}`;
  }
  return (
    <svg className={`sw-overlay ${className ?? ""}`} viewBox={box} preserveAspectRatio={fit === "body" ? "xMidYMid meet" : "xMidYMid slice"} aria-hidden>
      <rect className="sw-ov-band" data-tone={tone(status?.hip)} x={bandX} y={top} width={bandW} height={Math.max(0.5, bottom - top)} rx={1.2} />
      <line className="sw-ov-line" data-tone={tone(status?.back)} x1={stickStart.x} y1={stickStart.y} x2={stickEnd.x} y2={stickEnd.y} strokeWidth={sw * 1.6} />
      <line className="sw-ov-line" data-tone={tone(status?.shin)} x1={ankle.x} y1={ankle.y} x2={knee.x} y2={knee.y} strokeWidth={sw * 1.4} />
      <line className="sw-ov-line sw-ov-thin" data-tone="neutral" x1={knee.x} y1={knee.y} x2={hip.x} y2={hip.y} strokeWidth={sw} />
      <line className="sw-ov-line" data-tone={tone(status?.head)} x1={sh.x} y1={sh.y} x2={ear.x} y2={ear.y} strokeWidth={sw * 1.4} />
      {[ear, sh, hip, knee, ankle].map((p, i) => (
        <circle key={i} className="sw-ov-dot" cx={p.x} cy={p.y} r={live ? 0.9 : 1.1} />
      ))}
    </svg>
  );
}

/** Mike's words as quoted text: inner straight quotes become single curly ones (the words stay exact). */
export const cueText = (cue: string) => cue.replace(/"([^"]+)"/g, "‘$1’");
