/** The five tabs, identical on web now and the phone apps later. */
export const TABS = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/programs", label: "Programs", icon: "programs" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/you", label: "You", icon: "you" },
] as const;

export type TabIcon = (typeof TABS)[number]["icon"];
