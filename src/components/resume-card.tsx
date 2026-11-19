import { dayLabel } from "@/content/program";
import { Link } from "@tanstack/react-router";
import { History, ArrowRight } from "lucide-react";
import { useResumePosition } from "@/hooks/use-day-state";
import { useSession } from "@/hooks/use-session";
import { useStructureOverlay } from "@/hooks/use-structure-overlay";
import { Reveal } from "@/components/motion-kit";

function relative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * "Pick up where you left off" — the athlete's last level, phase, day and
 * sub-lesson, restored from their autosaved position.
 */
export function ResumeCard({ to = "immersion" }: { to?: "immersion" | "self-guided" }) {
  const { user } = useSession();
  const { position } = useResumePosition(Boolean(user));
  const { lessonsFor } = useStructureOverlay(Boolean(user));

  if (!position) return null;
  const { location, activeLessonId, updatedAt } = position;
  const { course, phase, day } = location;
  const lessons = lessonsFor(day);
  const stepIndex = activeLessonId ? lessons.findIndex((l) => l.id === activeLessonId) : -1;
  const step = stepIndex >= 0 ? lessons[stepIndex] : undefined;

  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Pick up where you left off
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-primary transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:scale-110">
          <History className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-3 block min-w-0">
        <span className="block truncate text-lg font-semibold leading-tight text-foreground">
          {step ? step.title : day.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {course.level} · {phase.label} · {dayLabel(day)}
          {step ? ` · step ${stepIndex + 1} of ${lessons.length}` : ""}
        </span>
      </span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        Resume <ArrowRight className="h-4 w-4" />
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {relative(updatedAt)}
        </span>
      </span>
    </>
  );

  const className =
    "pressable group flex flex-col rounded-2xl border border-hairline bg-elevated p-4 sm:p-5";

  return (
    <Reveal>
      {to === "self-guided" ? (
        <Link to="/self-guided/day/$dayId" params={{ dayId: day.id }} className={className}>
          {body}
        </Link>
      ) : (
        <Link to="/immersion/day/$dayId" params={{ dayId: day.id }} className={className}>
          {body}
        </Link>
      )}
    </Reveal>
  );
}
