import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import {
  AnswerRecap,
  CircuitTable,
  QuestionStepper,
  ReadinessResultCard,
  RecoveryNotice,
} from "@/components/kbl";
import { useWorkoutTables } from "@/hooks/use-workout-tables";
import { saveWorkoutTable } from "@/lib/achievements.functions";
import { formSelections, isFormComplete, kblFormForDay } from "@/content/kbl-forms";
import {
  resolveReadiness,
  WORKOUT_TABLES,
  type ReadinessResult,
} from "@/content/readiness-table";
import type { DayLocation, Lesson } from "@/content/program";
import { useDayState } from "@/hooks/use-day-state";
import { cn } from "@/lib/utils";

export { CircuitTable } from "@/components/kbl";

/* ------------------------------------------------------------------ */
/* Saved state                                                         */
/* ------------------------------------------------------------------ */

/** The latest saved Training Readiness Assessment for a day, if any. */
export function useDayReadiness(dayId: string, enabled = true) {
  const tables = useWorkoutTables(enabled);
  const row = useMemo(
    () => (tables.data ?? []).find((t) => t.day_id === dayId),
    [tables.data, dayId],
  );
  const answers = (row?.answers ?? null) as Record<string, string> | null;
  const form = kblFormForDay(dayId);
  const complete = Boolean(form && isFormComplete(form, answers));
  return {
    isLoading: tables.isLoading,
    row: row ?? null,
    answers,
    complete,
    result: complete && answers ? resolveReadiness(answers, dayId) : null,
  };
}

const DRAFT_PREFIX = "kbl:readiness-draft:";

function readDraft(dayId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_PREFIX + dayId) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function writeDraft(dayId: string, answers: Record<string, string>) {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + dayId, JSON.stringify(answers));
  } catch {
    /* private mode — the form simply starts fresh */
  }
}

/* ------------------------------------------------------------------ */
/* The assessment itself                                               */
/* ------------------------------------------------------------------ */

export function ReadinessAssessment({
  location,
  lessonId,
  onSaved,
}: {
  location: DayLocation;
  lessonId: string;
  /** Fired after the answers are stored, so the day can mark the step done. */
  onSaved?: (result: ReadinessResult) => void;
}) {
  const { day, phase, course } = location;
  const queryClient = useQueryClient();
  const save = useServerFn(saveWorkoutTable);
  const saved = useDayReadiness(day.id);

  const form = kblFormForDay(day.id);
  const questions = form?.questions ?? [];

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [redo, setRedo] = useState(false);

  // In-progress answers survive a refresh locally and follow the user across
  // devices through the autosaved day state.
  const dayState = useDayState(course.id, day.id);
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || dayState.isLoading) return;
    hydrated.current = true;
    const draft = { ...readDraft(day.id), ...(dayState.draftAnswers ?? {}) };
    setAnswers(draft);
    writeDraft(day.id, draft);
    const firstUnanswered = questions.findIndex((q) => !draft[q.id]);
    setStep(firstUnanswered === -1 ? Math.max(questions.length - 1, 0) : firstUnanswered);
  }, [day.id, dayState.isLoading, dayState.draftAnswers, questions]);

  if (!form) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        There is no Training Readiness Assessment on this day.
      </p>
    );
  }

  const showSaved = saved.complete && !redo;
  const allAnswered = isFormComplete(form, answers);
  const preview = allAnswered ? resolveReadiness(answers, day.id) : null;

  function answer(questionId: string, value: string) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    writeDraft(day.id, next);
    dayState.autosave({ activeLessonId: lessonId, draftAnswers: next });
  }

  async function submit() {
    if (!preview) return;
    setSaving(true);
    try {
      await save({
        data: {
          courseId: course.id,
          phaseId: phase.id,
          dayId: day.id,
          lessonId,
          answers,
          table: {
            tableId: preview.table?.id ?? null,
            score: preview.score,
            band: preview.band.id,
            outcome: preview.outcome,
            sourceFormId: preview.sourceFormId,
            version: 2,
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["workout-tables"] });
      setRedo(false);
      toast.success("Readiness logged — your workout table is ready.");
      onSaved?.(preview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your assessment.");
    } finally {
      setSaving(false);
    }
  }

  if (showSaved && saved.result) {
    return (
      <div className="animate-step-in space-y-5">
        <ReadinessResultCard result={saved.result} />
        <AnswerRecap rows={formSelections(form, saved.answers ?? {})} />
        <button
          type="button"
          onClick={() => {
            setRedo(true);
            setStep(0);
          }}
          className={cn(buttonStyles.outline, "w-full")}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retake today's assessment
        </button>
      </div>
    );
  }

  return (
    <QuestionStepper
      questions={questions}
      answers={answers}
      step={step}
      onStepChange={setStep}
      onAnswer={answer}
      action={
        allAnswered ? (
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cn(buttonStyles.primary, "w-full disabled:opacity-50")}
          >
            {saving ? <Spinner className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            Submit and open my workout table
          </button>
        ) : (
          <p className="inline-flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Your workout table unlocks when this is done
          </p>
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Result + table                                                      */
/* ------------------------------------------------------------------ */

/** Results summary + the workout table, shown under the Workout sub-lesson. */
const STATIC_TABLES = WORKOUT_TABLES;

/** True when today actually contains a Training Readiness Assessment step. */
export function dayHasReadiness(location: DayLocation) {
  return location.day.lessons.some((l) => l.special === "readiness");
}

export function WorkoutCircuitPanel({
  location,
  lesson,
  onGoToAssessment,
}: {
  location: DayLocation;
  lesson?: Lesson;
  onGoToAssessment?: () => void;
}) {
  const { day } = location;
  const hasAssessment = dayHasReadiness(location);
  const readiness = useDayReadiness(day.id, hasAssessment);

  // Days without an assessment (e.g. On Ramp) show the source table directly.
  if (!hasAssessment) {
    const table = lesson?.tableId ? STATIC_TABLES[lesson.tableId] : undefined;
    if (!table) return null;
    return (
      <div className="animate-step-in">
        <CircuitTable table={table} />
      </div>
    );
  }

  if (readiness.isLoading) {
    return (
      <div className="grid place-items-center rounded-2xl border border-border bg-card py-10">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!readiness.complete || !readiness.result) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-background text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-foreground">Your workout table is locked</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Finish the Training Readiness Assessment at the top of today and today's table appears
          right here.
        </p>
        {onGoToAssessment && (
          <button
            type="button"
            onClick={onGoToAssessment}
            className={cn(buttonStyles.primary, "mt-4")}
          >
            <ClipboardList className="h-4 w-4" />
            Go to the assessment
          </button>
        )}
      </div>
    );
  }

  const result = readiness.result;

  if (!result.table) return <RecoveryNotice result={result} />;

  // Just the table — the assessment step already shows the result and recap.
  return (
    <div className="animate-step-in">
      <CircuitTable table={result.table} />
    </div>
  );
}
