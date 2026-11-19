import { dayLabel } from "@/content/program";
import { libraryVideos } from "@/content/library";
import type { summarise } from "@/hooks/use-progress";

export type Summary = ReturnType<typeof summarise>;

export type StatusContext = {
  /** Small uppercase label — where you are. */
  eyebrow: string;
  /** The main line — the most useful fact for this page. */
  title: string;
  /** Optional 0-100 meter rendered under the title. */
  meter?: number;
  /** Optional short meter caption. */
  meterLabel?: string;
  /** Contextual primary action. */
  cta?: { label: string; to: string; params?: Record<string, string> };
  /** Screen-reader summary for the whole bar. */
  announce: string;
};

/** Routes where the bar would fight the content for attention. */
export function statusBarHidden(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/immersion/day/") ||
    pathname.startsWith("/self-guided/day/") ||
    pathname.startsWith("/certificate/")
  );
}

/**
 * Per-section copy. The bar should describe the page you're on — never the
 * training thread, which was the confusing part: "21 days finished" meant
 * nothing on Retreats or Shop.
 */
const SECTIONS: Array<[string, { eyebrow: string; title: string }]> = [
  ["/self-guided/schedule", { eyebrow: "Self-Guided", title: "Plan your training week" }],
  ["/library", { eyebrow: "Library", title: "Every video, filter to find it" }],
  ["/tools/kettlebell-selector", { eyebrow: "Tool", title: "Find the right bell weight" }],
  ["/tools/stretch-test", { eyebrow: "Tool", title: "Check where you're tight" }],
  ["/tools", { eyebrow: "Tools", title: "Answer a few questions, get a plan" }],
  ["/saves", { eyebrow: "Saves", title: "Results and plans you kept" }],
  ["/mtk", { eyebrow: "Course", title: "Mastering the Kettlebell" }],
  ["/retreats", { eyebrow: "Retreats", title: "Train in person with Mike" }],
  ["/coaching", { eyebrow: "Coaching", title: "One-to-one time with Mike" }],
  ["/shop", { eyebrow: "Shop", title: "Gear and guides" }],
  ["/programs", { eyebrow: "Programs", title: "Other ways to train" }],
  ["/referrals", { eyebrow: "Referrals", title: "Share it, earn rewards" }],
  ["/account", { eyebrow: "Account", title: "Your profile and preferences" }],
  ["/structure", { eyebrow: "Structure", title: "Program outline" }],
];

function section(pathname: string) {
  return SECTIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * Maps where you are + how far you've come into the three pieces of copy the
 * status bar shows. Pure: no hooks, no fetching, easy to extend per section.
 *
 * Rule: progress meters only appear where progress is the subject of the page
 * (Immersion, Self-Guided). Everywhere else the bar describes the page and
 * offers one way back into today's session.
 */
export function statusContext(pathname: string, s: Summary): StatusContext {
  const current = s.currentDay;
  const dayCompletion = current ? s.dayCompletion(current.day.id) : undefined;
  const dayPercent =
    dayCompletion && dayCompletion.total
      ? Math.round((dayCompletion.done / dayCompletion.total) * 100)
      : 0;

  const resume = current
    ? {
        label: dayCompletion?.done
          ? `Resume ${dayLabel(current.day)}`
          : `Start ${dayLabel(current.day)}`,
        to: "/immersion/day/$dayId",
        params: { dayId: current.day.id },
      }
    : undefined;

  // Immersion (and the app home) — the training thread itself.
  if (pathname === "/" || pathname.startsWith("/immersion")) {
    if (s.allComplete) {
      return {
        eyebrow: "Immersion",
        title: "Program complete — every day is done",
        meter: 100,
        meterLabel: "100%",
        cta: { label: "Review your levels", to: "/immersion" },
        announce: "Immersion program complete.",
      };
    }
    if (!current) {
      return {
        eyebrow: "Immersion",
        title: "Day 1 is waiting",
        cta: { label: "Start training", to: "/immersion" },
        announce: "Immersion, ready to start.",
      };
    }
    return {
      eyebrow: `Today · ${current.course.level}`,
      title: dayCompletion?.done
        ? `${current.day.title} — ${dayCompletion.total - dayCompletion.done} lessons left`
        : current.day.title,
      meter: dayPercent,
      meterLabel: dayCompletion
        ? `${dayCompletion.done} of ${dayCompletion.total} lessons`
        : undefined,
      cta: resume,
      announce: `${dayLabel(current.day)}, ${dayPercent} percent of today complete.`,
    };
  }

  // Everything else keeps a way back into today's session.
  const backToToday = resume
    ? { label: `Today · ${dayLabel(current!.day)}`, to: resume.to, params: resume.params }
    : { label: "Start training", to: "/immersion" };

  if (pathname.startsWith("/self-guided") && !pathname.startsWith("/self-guided/schedule")) {
    const course = s.currentCourse;
    const c = course ? s.courseCompletion(course.id) : undefined;
    return {
      eyebrow: "Self-Guided",
      title: course ? `${course.title} — jump to any day` : "Pick a level to explore",
      meter: c?.percent,
      meterLabel: c ? `${c.days} of ${c.daysTotal} days done` : undefined,
      cta: backToToday,
      announce: course
        ? `Self guided, ${course.title}, ${c?.percent ?? 0} percent complete.`
        : "Self guided.",
    };
  }

  if (pathname.startsWith("/library")) {
    return {
      eyebrow: "Library",
      title: `${libraryVideos.length} videos — search or filter`,
      cta: backToToday,
      announce: `Library, ${libraryVideos.length} videos.`,
    };
  }

  const hit = section(pathname);
  if (hit) {
    return {
      eyebrow: hit.eyebrow,
      title: hit.title,
      cta: backToToday,
      announce: `${hit.eyebrow}. ${hit.title}.`,
    };
  }

  return {
    eyebrow: "Kettlebell Lifestyle",
    title: current ? `${dayLabel(current.day)} is next` : "Welcome back",
    cta: backToToday,
    announce: "Kettlebell Lifestyle.",
  };
}

/** Plain page title for the top bar — no progress, no CTA. */
export function pageTitle(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/immersion")) return "Immersion";
  if (pathname.startsWith("/self-guided/schedule")) return "Schedule";
  if (pathname.startsWith("/self-guided")) return "Self-Guided";
  const hit = section(pathname);
  if (hit) return hit.eyebrow === "Tool" || hit.eyebrow === "Course" ? hit.title : hit.eyebrow;
  return "Kettlebell Lifestyle";
}
