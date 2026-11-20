import type { SVGProps } from "react";

/** Trace icon set: 24px grid, 1.6px open strokes with round caps, ending in a light point. */
const PATHS = {
  today: (
    <>
      <path d="M3 18A9 9 0 0 1 21 18" />
      <path className="lq-icon-lit" d="M3 18A9 9 0 0 1 14 9.3" />
    </>
  ),
  programs: (
    <>
      <path d="M4.5 4.5A10 10 0 0 0 19.5 4.5" />
      <path className="lq-icon-lit" d="M4.5 4.5A10 10 0 0 0 12 9.6" />
      <path d="M12 13.5v7" />
    </>
  ),
  kettlebell: (
    <>
      <path d="M8.6 10.9 8.1 8a2.3 2.3 0 0 1 2.3-2.7h3.2A2.3 2.3 0 0 1 15.9 8l-.5 2.9" />
      <circle cx="12" cy="15" r="5.7" />
    </>
  ),
  library: (
    <>
      <rect x="3" y="7.5" width="15" height="12" rx="3" />
      <path d="M7 4.5h10.5a3 3 0 0 1 3 3V15" />
      <path d="M9.3 11v5l4.2-2.5z" fill="currentColor" />
    </>
  ),
  plan: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="4" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.6" />
      <path d="M3.5 9.6h17M8 3v3.6M16 3v3.6" />
    </>
  ),
  you: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3.1" />
      <path d="M6.4 18.2c1.3-2 3.3-3.1 5.6-3.1s4.3 1.1 5.6 3.1" />
    </>
  ),
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevron: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown: <path d="M5.5 9.5 12 16l6.5-6.5" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  play: <path d="M8 5.6v12.8a.9.9 0 0 0 1.4.8l10-6.4a.9.9 0 0 0 0-1.6l-10-6.4A.9.9 0 0 0 8 5.6z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M6.5 6v12" />
      <path d="M18 6.8v10.4a.8.8 0 0 1-1.2.7L9.6 12.7a.8.8 0 0 1 0-1.4l7.2-5.2a.8.8 0 0 1 1.2.7z" fill="currentColor" />
    </>
  ),
  next: (
    <>
      <path d="M17.5 6v12" />
      <path d="M6 6.8v10.4a.8.8 0 0 0 1.2.7l7.2-5.2a.8.8 0 0 0 0-1.4L7.2 6.1A.8.8 0 0 0 6 6.8z" fill="currentColor" />
    </>
  ),
  check: <path d="M5.5 12.5 10 17l8.5-9.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="3" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  flame: <path d="M12 21c-3.7 0-6.2-2.5-6.2-5.8 0-3.5 2.7-5.3 3.7-8.6.9 1.4 1.8 2.3 2.9 2.7.4-2.1 1.3-4.1 2.7-5.8.4 3.4 3.1 5.8 3.1 10.4 0 3.8-2.5 7.1-6.2 7.1z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3 1.8" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.2" r="7.6" />
      <path d="M12 9.2v4.2l2.6 1.6M9.8 3h4.4" />
    </>
  ),
  steps: (
    <>
      <path d="M9.5 7h10.5M9.5 12h10.5M9.5 17h10.5" />
      <path d="M4.8 7h.01M4.8 12h.01M4.8 17h.01" strokeWidth="2.6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.6" />
      <path d="M16 16l4.2 4.2" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </>
  ),
  bookmark: <path d="M7 3.8h10a1.2 1.2 0 0 1 1.2 1.2v15.2L12 16.3l-6.2 3.9V5A1.2 1.2 0 0 1 7 3.8z" />,
  share: (
    <>
      <path d="M12 14.5V3.5M8 7l4-3.8L16 7" />
      <path d="M8.5 10H7a2.5 2.5 0 0 0-2.5 2.5v6A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-6A2.5 2.5 0 0 0 17 10h-1.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      <circle cx="12" cy="12" r="6.6" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  sparkle: <path d="M12 3.5c.5 4.2 2.3 6 6.5 6.5-4.2.5-6 2.3-6.5 6.5-.5-4.2-2.3-6-6.5-6.5 4.2-.5 6-2.3 6.5-6.5z" />,
  ring: (
    <>
      <circle cx="12" cy="12" r="8.4" opacity=".3" />
      <path d="M12 3.6a8.4 8.4 0 0 1 8.2 10.2" />
      <circle cx="12" cy="12" r="4.4" opacity=".3" />
      <path d="M12 7.6a4.4 4.4 0 0 1 4.3 5.3" />
    </>
  ),
  down: <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />,
  repeat: (
    <>
      <path d="M16.5 3.5 19.5 6.5l-3 3" />
      <path d="M4.5 11V9.6A3 3 0 0 1 7.5 6.5h12" />
      <path d="M7.5 20.5 4.5 17.5l3-3" />
      <path d="M19.5 13v1.4a3 3 0 0 1-3 3.1h-12" />
    </>
  ),
  moon: <path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1z" />,
  mountain: (
    <>
      <path d="M2.8 19 9.5 8.5l3.8 5.8 2.3-3.2L21.2 19z" />
      <path d="M8 10.9l1.5 1.2 1.3-1.1" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.4h3.2L12 5.3v13.4l-4.8-4.1H4z" fill="currentColor" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  fullscreen: <path d="M4 9V4.5h4.5M20 9V4.5h-4.5M4 15v4.5h4.5M20 15v4.5h-4.5" />,
  airplay: (
    <>
      <path d="M7 17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M8.5 20.5h7L12 16z" fill="currentColor" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 18.5c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M15.5 14.3c2.4-.3 4.3.9 5 3.7" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-13 14z" />
      <path d="M5 19 13 11" />
    </>
  ),
  wind: <path d="M3.5 9h11a2.8 2.8 0 1 0-2.8-2.8M3.5 14h15a2.8 2.8 0 1 1-2.8 2.8M3.5 11.5h7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
    </>
  ),
  display: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2.6" />
      <path d="M9 20.5h6M12 17v3.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/**
 * Trace iconography: open shapes ending in a light point. The point is the only coloured part
 * (and a lit stroke on active tabs).
 */
const POINTS: Partial<Record<IconName, [number, number]>> = {
  today: [14, 9.3],
  programs: [12, 9.6],
  library: [20.5, 15],
  plan: [12, 13.5],
  calendar: [12, 15],
  check: [18.5, 7.5],
  flame: [12, 17],
  clock: [15, 13.8],
  timer: [14.6, 15],
  mountain: [9.5, 8.5],
  search: [20.2, 20.2],
  ring: [20.2, 13.8],
  bell: [12, 5.5],
  leaf: [13, 11],
  compass: [15.5, 8.5],
};

export type IconSize = "xs" | "sm" | "md" | "tab" | "lg";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: IconSize;
  /** Accessible name; omit for decorative icons. */
  label?: string;
  /** The light point at the end of the stroke (default on, off at xs). */
  point?: boolean;
};

export function Icon({ name, size = "md", label, point, className, ...rest }: IconProps) {
  const key = name;
  const pt = (point ?? size !== "xs") ? POINTS[key] : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ? `lq-icon ${className}` : "lq-icon"}
      data-size={size === "md" ? undefined : size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[key]}
      {pt && <circle className="lq-icon-pt" cx={pt[0]} cy={pt[1]} r={1.7} />}
    </svg>
  );
}
