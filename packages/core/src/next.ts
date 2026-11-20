/**
 * End-of-day "What's next" guidance. Port of legacy src/lib/whats-next.ts,
 * generalised to any day program: chosen from the next lesson in the path and
 * how today's readiness assessment landed. Returns plain data (no routes).
 */
import { isLessonComplete, nextLesson, trainingDaysLeftInSection } from "./progression";
import type { BandColour, CompletedSteps, Curriculum, Lesson, Uuid } from "./types";

export type NextActionTarget =
  | { kind: "lesson"; lessonId: Uuid }
  | { kind: "tool"; toolSlug: string }
  | { kind: "progress" }
  | { kind: "catalog" };

export type NextAction = { label: string } & NextActionTarget;

export interface NextRecommendation {
  eyebrow: string;
  title: string;
  detail: string;
  tone: "primary" | "calm";
  primary: NextAction;
  secondary?: NextAction;
}

export interface NextLabels {
  /** Word for a lesson ("Day", "Lesson"). */
  lessonLabel?: string;
  /** Word for a section, lower-case in sentences ("phase", "week", "module"). */
  sectionLabel?: string;
  /** Word for the path, lower-case ("level", "course"). */
  pathLabel?: string;
}

/** "Day 12" for training days, the page title for overview/transition pages. */
export function lessonLabel(lesson: Pick<Lesson, "title" | "pageType" | "dayNumber">, word = "Day"): string {
  if (lesson.pageType || lesson.dayNumber == null) return lesson.title;
  return `${word} ${lesson.dayNumber}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function recommendNext(input: {
  next: Pick<Lesson, "id" | "title" | "pageType" | "dayNumber"> | null | undefined;
  band: BandColour | null;
  /** Training days still to do in the current section, excluding today. */
  daysLeftInSection: number;
  labels?: NextLabels;
}): NextRecommendation {
  const { next, band, daysLeftInSection } = input;
  const word = input.labels?.lessonLabel ?? "Day";
  const section = input.labels?.sectionLabel ?? "phase";
  const pathWord = input.labels?.pathLabel ?? "level";

  if (!next) {
    return {
      eyebrow: `${cap(pathWord)} complete`,
      title: `You've finished this ${pathWord}`,
      detail: `Collect your certificate and pick the ${pathWord} you want to run next.`,
      tone: "primary",
      primary: { label: "See your progress", kind: "progress" },
      secondary: { label: "Browse the program", kind: "catalog" },
    };
  }

  const label = lessonLabel(next, word);
  const nextLabel = next.title.toLocaleLowerCase().startsWith(label.toLocaleLowerCase()) ? next.title : `${label} — ${next.title}`;
  const open = (verb: string): NextAction => ({ label: `${verb} ${label}`, kind: "lesson", lessonId: next.id });

  if (next.pageType) {
    return {
      eyebrow: "What's next",
      title: nextLabel,
      detail:
        next.pageType === "overview"
          ? "Watch the overview and review the schedule before starting the next training block."
          : `Review your next steps, retest your stretches and prepare for the next ${section}.`,
      tone: "primary",
      primary: open("Open"),
    };
  }

  if (band === "red") {
    return {
      eyebrow: "What's next",
      title: "Recover before you load up again",
      detail: `Today's assessment came back red, so give yourself a genuine recovery window. When you feel reset, ${nextLabel} is waiting.`,
      tone: "calm",
      primary: { label: "Open the stretch test", kind: "tool", toolSlug: "stretch-test" },
      secondary: open("Go to"),
    };
  }

  if (band === "amber") {
    return {
      eyebrow: "What's next",
      title: nextLabel,
      detail: `You scaled today, so start tomorrow with the assessment again and let it set the load. ${
        daysLeftInSection > 0
          ? `${plural(daysLeftInSection, word.toLocaleLowerCase())} left in this ${section}.`
          : `This ${section} wraps with the next ${word.toLocaleLowerCase()}.`
      }`,
      tone: "primary",
      primary: open("Start"),
    };
  }

  return {
    eyebrow: "What's next",
    title: nextLabel,
    detail:
      daysLeftInSection > 0
        ? `${plural(daysLeftInSection, word.toLocaleLowerCase())} left in this ${section}. Keep the run going while the momentum is with you.`
        : `This is the last ${word.toLocaleLowerCase()} of the ${section} — finish it and the next ${section} opens.`,
    tone: "primary",
    primary: open("Start"),
  };
}

/** Convenience: guidance at the end of `lessonId`, from the curriculum and today's band. */
export function nextForLesson(
  curriculum: Curriculum,
  lessonId: Uuid,
  completed: CompletedSteps,
  band: BandColour | null,
): NextRecommendation {
  const labels: NextLabels = {
    lessonLabel: curriculum.program.lessonLabel || "Day",
    sectionLabel: (curriculum.program.sectionLabel || "Phase").toLocaleLowerCase(),
    pathLabel: curriculum.path?.kind === "level" ? "level" : "course",
  };
  // After the final lesson, guidance only says "complete" when the whole path really is.
  let next = nextLesson(curriculum, lessonId);
  if (!next) next = curriculum.lessons.find((l) => l.id !== lessonId && !isLessonComplete(l, completed)) ?? null;
  return recommendNext({ next, band, daysLeftInSection: trainingDaysLeftInSection(curriculum, lessonId, completed), labels });
}
