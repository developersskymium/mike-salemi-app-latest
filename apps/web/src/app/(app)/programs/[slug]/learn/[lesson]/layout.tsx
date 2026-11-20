import type { ReactNode } from "react";
// The day stylesheets load once for the segment, shared by its loading UI and its page.
import "@/components/training/day-styles";

export default function DayLayout({ children }: { children: ReactNode }) {
  return children;
}
