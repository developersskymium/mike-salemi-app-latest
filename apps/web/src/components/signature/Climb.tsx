import type { CSSProperties, ReactNode } from "react";
import { Climb as GfxClimb } from "@/components/graphics/Climb";
import { Avatar } from "../ui/Avatar";

/**
 * THE CLIMB — Summit's signature progress map. A level is drawn as a route up Mount Shasta's flank:
 * phases are camps, the level's last day is the summit, and the member is marked on the route.
 *
 * The art is built from clean, swappable SVG layers (sky, back range, mountain, snow, ground, trees)
 * so the illustrator can replace any layer in place via the `art` prop (or by editing CLIMB_LAYERS)
 * without touching the route, camps, labels or the "You" marker. All colours are tokens
 * (--sc-*, --warm, --surface …), so light and dark both work.
 */

export type ClimbPhase = {
  /** Camp name, e.g. "On Ramp", "Phase 1". */
  label: string;
  /** 1-based inclusive day range. */
  from: number;
  to: number;
};

export type ClimbArtProps = { W: number; H: number; id: string; outline: string };
export type ClimbLayer = (p: ClimbArtProps) => ReactNode;

const W = 1000;
/** Route anchors (the mockup's camps for four phases + summit), as functions of the height. */
const anchors = (H: number): [number, number][] => [[96, H - 30], [262, H - 62], [436, H - 108], [612, H - 160], [800, 34]];

const outlineFor = (H: number) =>
  `M0 ${H - 18} C 40 ${H - 22}, 70 ${H - 26}, 96 ${H - 30} C 160 ${H - 40}, 210 ${H - 50}, 262 ${H - 62} C 330 ${H - 80}, 390 ${H - 92}, 436 ${H - 108} C 500 ${H - 128}, 560 ${H - 146}, 612 ${H - 160} C 650 ${H - 170}, 660 ${H - 186}, 676 ${H - 182} C 700 ${H - 176}, 740 ${H - 196}, 800 34 C 850 50, 900 ${H - 160}, 1000 ${H - 128}`;

const pine = (x: number, y: number, s = 1) =>
  `M${x} ${y - 26 * s} L${x + 9 * s} ${y - 8 * s} L${x + 5 * s} ${y - 8 * s} L${x + 11 * s} ${y} L${x - 11 * s} ${y} L${x - 5 * s} ${y - 8 * s} L${x - 9 * s} ${y - 8 * s} Z`;

/** The default art layers (flat daytime cut paper). Replace any of them through `art`. */
export const CLIMB_LAYERS: Record<"sky" | "range" | "mountain" | "snow" | "ground" | "trees", ClimbLayer> = {
  sky: () => (
    <g className="cl-sky">
      <circle cx={958} cy={62} r={40} fill="var(--sc-sun2)" opacity={0.35} />
      <circle cx={958} cy={62} r={26} fill="var(--sc-sun)" className="cl-sun" />
    </g>
  ),
  range: ({ H }) => <path className="cl-range" d={`M520 ${H} C 600 ${H - 70}, 660 ${H - 90}, 700 ${H - 96} C 760 ${H - 60}, 900 ${H - 40}, 1000 ${H - 52} V ${H} Z`} fill="var(--sc-mtn2)" opacity={0.35} />,
  mountain: ({ H, id, outline }) => (
    <g className="cl-mountain">
      <defs>
        <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sc-mtn)" />
          <stop offset="1" stopColor="var(--sc-sky1)" />
        </linearGradient>
      </defs>
      <path d={`${outline} V ${H} H 0 Z`} fill={`url(#${id}-m)`} />
      <path d={outline} fill="none" stroke="var(--sc-mtn2)" strokeWidth={1.5} opacity={0.7} />
    </g>
  ),
  snow: ({ H, id, outline }) => (
    <g className="cl-snow">
      <clipPath id={`${id}-c`}>
        <path d={`${outline} V ${H} H 0 Z`} />
      </clipPath>
      <path
        clipPath={`url(#${id}-c)`}
        d="M690 0 H 920 V 78 L 902 92 L 884 80 L 868 96 L 852 84 L 838 100 L 822 86 L 806 98 L 790 84 L 774 94 L 758 82 L 742 90 L 726 76 L 690 70 Z"
        fill="var(--sc-snow)"
      />
    </g>
  ),
  ground: ({ H }) => <path className="cl-ground" d={`M0 ${H} V ${H - 12} C 120 ${H - 22}, 240 ${H - 8}, 380 ${H - 16} S 700 ${H - 4}, 1000 ${H - 14} V ${H} Z`} fill="var(--sc-ground)" />,
  trees: ({ H }) => (
    <g className="cl-trees" fill="var(--sc-tree, var(--sc-ridge))" opacity={0.85}>
      <path d={pine(26, H - 12, 1.1)} />
      <path d={pine(48, H - 14, 0.8)} />
      <path d={pine(930, H - 14, 1)} />
      <path d={pine(956, H - 12, 1.3)} />
      <path d={pine(978, H - 13, 0.85)} />
    </g>
  ),
};

type Props = {
  /** Phases in order (camps). The last day of the last phase is the summit. */
  phases: ClimbPhase[];
  /** Days complete (the member stands on the next day). */
  done: number;
  /** Total days (defaults to the last phase's `to`). */
  total?: number;
  /** The member's name/avatar for the marker. */
  member?: { name: string; avatarUrl?: string | null };
  /** Marker text, default "You · Day N". */
  youLabel?: string;
  /** Summit label, default "Summit" + "Day N". */
  summitLabel?: string;
  /** Camp labels under the route (off on phones). */
  labels?: boolean;
  /** viewBox height (the width is 1000). 236 on Home, 250 on phones. */
  height?: number;
  /** Override any art layer (the illustrator's upgrade path). */
  art?: Partial<typeof CLIMB_LAYERS>;
  /** Stable id for gradients (several climbs on one page). */
  id?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

const lerp = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

/** A camp position for phase i of n, along the four anchor segments. */
function campAt(H: number, i: number, n: number): [number, number] {
  const a = anchors(H);
  const t = (i / n) * (a.length - 1);
  const k = Math.min(a.length - 2, Math.floor(t));
  return lerp(a[k]!, a[k + 1]!, t - k);
}

export function Climb({ phases, done, total, member, youLabel, summitLabel = "Summit", labels = true, height, id, label, className, style }: Props) {
  // Rendered by the polished illustration (components/graphics/Climb); this keeps the older API working.
  const list = phases.length ? phases : [{ label: "Start", from: 1, to: Math.max(1, total ?? 1) }];
  const T = total ?? list[list.length - 1]!.to;
  const initials = member?.name ? member.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : undefined;
  return (
    <GfxClimb
      totalDays={T}
      currentDay={Math.min(T, Math.max(1, done + 1))}
      completedDays={Math.min(T, done)}
      phases={list.map((p) => ({ startDay: p.from, label: p.label, sub: `Days ${p.from}–${p.to}` }))}
      variant={height && height >= 250 ? "compact" : "full"}
      labels={labels}
      youLabel={youLabel}
      avatar={member?.avatarUrl || initials}
      summitLabel={summitLabel}
      title={label ?? id}
      className={className}
      style={style}
    />
  );
}
