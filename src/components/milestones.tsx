import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { dayOrder } from "@/content/program";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, PartyPopper, RotateCcw, ArrowRight, History, CheckCircle2 } from "lucide-react";
import { issueCertificate } from "@/lib/achievements.functions";
import { useRestartCourse, type ProgressRow } from "@/hooks/use-progress";
import { milestoneCopy, type Milestone } from "@/lib/milestones";
import type { Course } from "@/content/program";
import { buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

/**
 * The banner shown wherever the app says "continue" — dashboards, level pages,
 * the day footer. It replaces "up next" language when a phase or level closes.
 */
export function MilestoneCallout({
  milestone,
  rows,
  className,
}: {
  milestone: Milestone;
  rows?: ProgressRow[];
  className?: string;
}) {
  const copy = milestoneCopy(milestone);
  if (!milestone || !copy) return null;
  const levelDone = milestone.kind !== "phase-complete";

  return (
    <div
      className={cn(
        "animate-pop overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex flex-col items-center px-6 pb-8 pt-8 text-center sm:px-10 sm:pt-10">
        {/* Celebration mark */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-primary bg-card shadow-sm">
            {levelDone ? (
              <Award className="h-6 w-6 text-primary" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>

        {/* Eyebrow */}
        <p className="eyebrow text-primary">{copy.eyebrow}</p>

        {/* Title */}
        <h3 className="mt-2 font-display text-2xl font-semibold italic leading-tight text-foreground sm:text-3xl">
          {copy.title}
        </h3>

        {/* Body */}
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.body}</p>

        {/* Actions */}
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5 sm:max-w-sm">
          {levelDone ? (
            <CertificateButton course={milestone.course} />
          ) : milestone.next ? (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: milestone.next.day.id }}
              className={cn(buttonStyles.primary, "w-full py-3 text-sm")}
            >
              {copy.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}

          {levelDone && milestone.kind === "level-complete" && milestone.next && (
            <Link
              to="/immersion/day/$dayId"
              params={{ dayId: milestone.next.day.id }}
              className={cn(buttonStyles.outline, "w-full py-3 text-sm")}
            >
              Move up to {milestone.nextCourse?.level ?? "the next level"}
            </Link>
          )}

          {levelDone && <RestartLevelButton course={milestone.course} rows={rows} variant="ghost" />}
        </div>
      </div>

      {/* Bottom accent */}
      <div className="flex h-1.5 w-full">
        <div className="h-full flex-1 bg-primary" />
        <div className="h-full flex-1 bg-primary/60" />
        <div className="h-full flex-1 bg-primary/30" />
      </div>
    </div>
  );
}

export function CertificateButton({ course, className }: { course: Course; className?: string }) {
  const queryClient = useQueryClient();
  const issue = useServerFn(issueCertificate);
  const mutation = useMutation({
    mutationFn: () => issue({ data: { courseId: course.id, title: course.title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["achievements"] }),
  });

  return (
    <Link
      to="/certificate/$courseId"
      params={{ courseId: course.id }}
      onClick={() => {
        if (!mutation.isPending) mutation.mutate();
      }}
      className={cn(buttonStyles.primary, "w-full py-3 text-sm", className)}
    >
      <Award className="h-4 w-4" /> Get your certificate
    </Link>
  );
}

/**
 * Restarting wipes the live progress for one level but keeps a permanent record
 * of the run that just ended, so nothing the athlete did is ever forgotten.
 */
export function RestartLevelButton({
  course,
  rows,
  className,
  label,
  variant = "outline",
}: {
  course: Course;
  rows?: ProgressRow[];
  className?: string;
  label?: string;
  variant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const restart = useRestartCourse();
  const navigate = useNavigate();
  const firstDayId = dayOrder.find((d) => d.course.id === course.id)?.day.id;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "ghost" ? buttonStyles.ghost : buttonStyles.outline,
          "w-full py-3 text-sm",
          className,
        )}
      >
        <RotateCcw className="h-4 w-4" /> {label ?? "Restart this level"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-black/45 backdrop-blur-sm sm:place-items-center">
          <div className="animate-sheet-up w-full rounded-t-[1.75rem] border border-hairline bg-elevated p-5 sm:max-w-lg sm:rounded-[1.75rem]">
            <p className="eyebrow text-primary">Restart {course.level}</p>
            <h3 className="mt-1.5 text-lg font-semibold text-foreground">Start {course.title} again?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You'll begin from day one and train the level like the first time. Here's exactly what
              changes.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-hairline bg-surface/60 p-3.5">
                <p className="eyebrow flex items-center gap-1.5 text-destructive">
                  <RotateCcw className="h-3.5 w-3.5" /> Resets
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>Day completion for this level</li>
                  <li>Lesson completion for this level</li>
                  <li>Your current position in the level</li>
                  <li>Your streak for this level</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface/60 p-3.5">
                <p className="eyebrow flex items-center gap-1.5 text-primary">
                  <Award className="h-3.5 w-3.5" /> Remembered
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>Certificates you've earned</li>
                  <li>Badges and XP</li>
                  <li>Saved tool results and workout plans</li>
                  <li>This run, archived in Past runs</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(buttonStyles.outline, "flex-1 justify-center px-4 py-2.5 text-sm")}
              >
                Keep my progress
              </button>
              <button
                type="button"
                disabled={restart.isPending}
                onClick={() =>
                  restart.mutate(
                    { courseId: course.id, rows },
                    {
                      onSuccess: () => {
                        setOpen(false);
                        toast.success(`${course.level} restarted`, {
                          description: "Your finished run is saved in Past runs.",
                        });
                        if (firstDayId) {
                          navigate({ to: "/immersion/day/$dayId", params: { dayId: firstDayId } });
                        }
                      },
                    },
                  )
                }
                className={cn(
                  buttonStyles.primary,
                  "flex-1 justify-center px-4 py-2.5 text-sm disabled:opacity-50",
                )}
              >
                {restart.isPending ? "Resetting…" : "Restart level"}
              </button>
            </div>
            {restart.isError && (
              <p className="mt-2 text-xs text-destructive">That didn't go through. Try again.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Read-only record of previous runs through a level. */
export function AttemptHistory({
  attempts,
  className,
}: {
  attempts: {
    id: string;
    course_id: string;
    attempt_index: number;
    archived_at: string;
    completed_at: string | null;
    lessons_completed: number;
    lessons_total: number;
    days_completed: number;
    days_total: number;
  }[];
  className?: string;
}) {
  if (!attempts.length) return null;
  return (
    <div className={cn("rounded-3xl border border-hairline bg-surface/50 p-4", className)}>
      <p className="eyebrow flex items-center gap-1.5 text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Previous runs
      </p>
      <ul className="mt-3 space-y-2.5">
        {attempts.map((a) => (
          <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">
              Run {a.attempt_index} · {a.days_completed}/{a.days_total} days
              {a.completed_at ? " · finished" : " · restarted early"}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(a.archived_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
