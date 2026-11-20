import type { ReactNode } from "react";

/** Engraving art (24px grid, same strokes as the icon set) for each badge icon in the database. */
const ART: Record<string, ReactNode> = {
  flame: <path d="M12 21c-3.7 0-6.2-2.5-6.2-5.8 0-3.5 2.7-5.3 3.7-8.6.9 1.4 1.8 2.3 2.9 2.7.4-2.1 1.3-4.1 2.7-5.8.4 3.4 3.1 5.8 3.1 10.4 0 3.8-2.5 7.1-6.2 7.1z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.6" />
      <path d="M3.5 9.6h17M8 3v3.6M16 3v3.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  sparkles: <path d="M12 3.5c.5 4.2 2.3 6 6.5 6.5-4.2.5-6 2.3-6.5 6.5-.5-4.2-2.3-6-6.5-6.5 4.2-.5 6-2.3 6.5-6.5z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r=".8" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4.5h9v4.8a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 6.5H4.8a2.6 2.6 0 0 0 2.9 3.6M16.5 6.5h2.7a2.6 2.6 0 0 1-2.9 3.6" />
      <path d="M12 13.8v3.4M8.5 20h7M9.6 20l.6-2.8h3.6l.6 2.8" />
    </>
  ),
  heart: <path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z" />,
  people: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 18.5c.9-2.8 3-4.3 5.5-4.3s4.6 1.5 5.5 4.3" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M15.5 14.3c2.4-.3 4.3.9 5 3.7" />
    </>
  ),
};

/** undefined → the Medal's default kettlebell engraving (e.g. "dumbbell"). */
export const medalArt = (icon: string | null | undefined) => (icon ? ART[icon] : undefined);
