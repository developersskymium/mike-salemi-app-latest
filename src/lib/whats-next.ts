import { dayLabel } from "@/content/program";
import type { ReadinessBand } from "@/content/average-day";
import type { DayLocation } from "@/content/program";

/**
 * End-of-day recommendation.
 *
 * The next step is chosen from two real signals: where the athlete is in the
 * program (the next unfinished day) and how today's Training Readiness
 * Assessment landed. A red assessment steers the day after into recovery
 * rather than straight into the next workout.
 */
export type NextAction = {
  label: string;
  to: string;
  params?: Record<string, string>;
};

export type NextRecommendation = {
  eyebrow: string;
  title: string;
  detail: string;
  tone: "primary" | "calm";
  primary: NextAction;
  secondary?: NextAction;
};

export function recommendNext(input: {
  next: DayLocation | undefined;
  band: ReadinessBand["id"] | null;
  daysLeftInPhase: number;
}): NextRecommendation {
  const { next, band, daysLeftInPhase } = input;

  if (!next) {
    return {
      eyebrow: "Level complete",
      title: "You've finished this level",
      detail: "Collect your certificate and pick the level you want to run next.",
      tone: "primary",
      primary: { label: "See your progress", to: "/account" },
      secondary: { label: "Browse the program", to: "/hub" },
    };
  }

  const label = dayLabel(next.day);
  const nextLabel = next.day.title.toLocaleLowerCase().startsWith(label.toLocaleLowerCase())
    ? next.day.title
    : `${label} — ${next.day.title}`;

  if (next.day.pageType) {
    return {
      eyebrow: "What's next",
      title: nextLabel,
      detail:
        next.day.pageType === "overview"
          ? "Watch the overview and review the schedule before starting the next training block."
          : "Review your next steps, retest your stretches and prepare for the next phase.",
      tone: "primary",
      primary: {
        label: `Open ${label}`,
        to: "/immersion/day/$dayId",
        params: { dayId: next.day.id },
      },
    };
  }

  if (band === "red") {
    return {
      eyebrow: "What's next",
      title: "Recover before you load up again",
      detail: `Today's assessment came back red, so give yourself a genuine recovery window. When you feel reset, ${nextLabel} is waiting.`,
      tone: "calm",
      primary: {
        label: "Open the stretch test",
        to: "/tools/$toolSlug",
        params: { toolSlug: "stretch-test" },
      },
      secondary: {
        label: `Go to ${dayLabel(next.day)}`,
        to: "/immersion/day/$dayId",
        params: { dayId: next.day.id },
      },
    };
  }

  if (band === "amber") {
    return {
      eyebrow: "What's next",
      title: nextLabel,
      detail: `You scaled today, so start tomorrow with the assessment again and let it set the load. ${daysLeftInPhase > 0 ? `${daysLeftInPhase} day${daysLeftInPhase === 1 ? "" : "s"} left in this phase.` : "This phase wraps with the next day."}`,
      tone: "primary",
      primary: {
        label: `Start ${dayLabel(next.day)}`,
        to: "/immersion/day/$dayId",
        params: { dayId: next.day.id },
      },
    };
  }

  return {
    eyebrow: "What's next",
    title: nextLabel,
    detail:
      daysLeftInPhase > 0
        ? `${daysLeftInPhase} day${daysLeftInPhase === 1 ? "" : "s"} left in this phase. Keep the run going while the momentum is with you.`
        : "This is the last day of the phase — finish it and the next phase opens.",
    tone: "primary",
    primary: {
      label: `Start ${dayLabel(next.day)}`,
      to: "/immersion/day/$dayId",
      params: { dayId: next.day.id },
    },
  };
}
