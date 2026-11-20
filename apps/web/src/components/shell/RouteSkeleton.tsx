"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Loading UI that matches the DESTINATION, not the folder the loading.tsx sits in.
 *
 * Why: `programs/loading.tsx` and `programs/[slug]/loading.tsx` wrap every route below them. Opening a
 * lesson from Home, the catalog or another program mounts those outer boundaries first, so the member
 * used to see the catalog skeleton, then the program skeleton (a 520px hero block that reads exactly
 * like Home's), then the day skeleton, then the day: the "flash of the homepage" before every lesson.
 * The URL has already changed when a loading boundary shows, so we pick the skeleton from the
 * pathname: every stage of the navigation draws the same final layout.
 */
export type RouteSkeletons = {
  /** /programs */
  catalog?: ReactNode;
  /** /programs/<slug> */
  program: ReactNode;
  /** /programs/<slug>/learn|guide/<lesson> */
  day: ReactNode;
  /** /programs/<slug>/course */
  course: ReactNode;
  /** /programs/<slug>/course/<lesson> */
  lesson: ReactNode;
  /** /programs/<slug>/session/... */
  session: ReactNode;
};

export function pickSkeleton(pathname: string, s: RouteSkeletons): ReactNode {
  const parts = pathname.split("/").filter(Boolean); // ["programs", slug, kind, id]
  if (parts[0] !== "programs") return s.program;
  if (parts.length === 1) return s.catalog ?? s.program;
  const kind = parts[2];
  if (kind === "learn" || kind === "guide") return s.day;
  if (kind === "course") return parts.length > 3 ? s.lesson : s.course;
  if (kind === "session") return s.session;
  return s.program;
}

export function RouteSkeleton(props: RouteSkeletons) {
  const pathname = usePathname() ?? "";
  return <>{pickSkeleton(pathname, props)}</>;
}
