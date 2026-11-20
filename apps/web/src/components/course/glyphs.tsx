import type { SVGProps } from "react";

/** Course-specific line glyphs (the shared Icon set has no headphones/doc/download). 24px grid, 1.8 stroke, currentColor. */
type G = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const Headphones = (p: G) => (
  <svg {...base} {...p}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3.5" y="14" width="4" height="6.5" rx="1.6" /><rect x="16.5" y="14" width="4" height="6.5" rx="1.6" /></svg>
);
export const Doc = (p: G) => (
  <svg {...base} {...p}><path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z" /><path d="M14 3v4h4M9 12.5h6M9 16h4" /></svg>
);
export const Download = (p: G) => (
  <svg {...base} {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></svg>
);
export const External = (p: G) => (
  <svg {...base} {...p}><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></svg>
);
export const Info = (p: G) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.6v.2" /></svg>
);
export const ListTree = (p: G) => (
  <svg {...base} {...p}><path d="M4 5h6M8 12h8M8 19h8M5 5v14M5 12h2M5 19h2" /></svg>
);
export const PanelClose = (p: G) => (
  <svg {...base} {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15M15.5 10l-2 2 2 2" /></svg>
);
export const PanelOpen = (p: G) => (
  <svg {...base} {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15M13.5 10l2 2-2 2" /></svg>
);
export const Spark = (p: G) => (
  <svg {...base} {...p}><path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8z" /></svg>
);
export const Check = (p: G) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="M5.5 12.5 10 17l8.5-9.5" /></svg>
);
export const PlayFill = (p: G) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z" /></svg>
);
export const Clipboard = (p: G) => (
  <svg {...base} {...p}><rect x="5.5" y="4.5" width="13" height="16.5" rx="2" /><path d="M9 4.5V3.5h6v1M9 11.5l2 2 4-4M9 17h6" /></svg>
);
export const Arrow = ({ dir = "right", ...p }: G & { dir?: "left" | "right" }) => (
  <svg {...base} {...p}>{dir === "right" ? <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" /> : <path d="M19 12H5M10.5 6.5 5 12l5.5 5.5" />}</svg>
);
export const Chevron = (p: G) => (
  <svg {...base} strokeWidth={2} {...p}><path d="m7 9.5 5 5 5-5" /></svg>
);
export const Search = (p: G) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const X = (p: G) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
);
export const Lock = (p: G) => (
  <svg {...base} {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
);
export const Back = (p: G) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
);
