import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ClipboardList,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { useWorkoutTables } from "@/hooks/use-workout-tables";
import { saveWorkoutTable } from "@/lib/achievements.functions";
import { readinessSteps } from "@/content/average-day";
import {
  isReadinessComplete,
  readinessSelections,
  resolveReadiness,
  WORKOUT_TABLES,
  type ReadinessResult,
  type WorkoutTable,
} from "@/content/readiness-table";
import type { DayLocation, Lesson } from "@/content/program";
import { useDayState } from "@/hooks/use-day-state";
import { cn } from "@/lib/utils";

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
  const complete = isReadinessComplete(answers);
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
    const firstUnanswered = readinessSteps.findIndex((s) => !draft[s.id]);
    setStep(firstUnanswered === -1 ? readinessSteps.length - 1 : firstUnanswered);
  }, [day.id, dayState.isLoading, dayState.draftAnswers]);

  const showSaved = saved.complete && !redo;
  const allAnswered = readinessSteps.every((s) => answers[s.id]);
  const current = readinessSteps[Math.min(step, readinessSteps.length - 1)];
  const preview = allAnswered ? resolveReadiness(answers, day.id) : null;

  function choose(value: string) {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    writeDraft(day.id, next);
    dayState.autosave({ activeLessonId: lessonId, draftAnswers: next });
    if (step < readinessSteps.length - 1) window.setTimeout(() => setStep((s) => s + 1), 140);
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
        <BandCard result={saved.result} />
        <SelectionRecap answers={saved.answers ?? {}} />
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
    <div className="animate-step-in">
      {/* progress rail */}
      <div className="flex items-center gap-2">
        {readinessSteps.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              answers[s.id] ? "bg-success" : i === step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <div key={current.id} className="animate-step-in mt-4">
        <p className="eyebrow text-primary">
          Question {step + 1} of {readinessSteps.length}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
          {current.question}
        </h3>

        <div className="mt-4 space-y-2">
          {current.options.map((option) => {
            const active = answers[current.id] === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/25",
                )}
              >
                <span className="min-w-0 text-sm font-semibold text-foreground">
                  {option.label}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {current.note && (
          <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
            <p className="flex items-start gap-2 text-xs font-semibold text-foreground">
              <Info className="mt-[0.1rem] h-3.5 w-3.5 shrink-0 text-primary" />
              {current.note.title ?? "Consider this before you answer"}
            </p>
            {current.note.body && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {current.note.body}
              </p>
            )}
            {current.note.points && (
              <ul className="mt-2 space-y-1.5">
                {current.note.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          className={cn(buttonStyles.outline, "disabled:opacity-40")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        {allAnswered ? (
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
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result + table                                                      */
/* ------------------------------------------------------------------ */

const BAND_TONE: Record<string, { dot: string; text: string; ring: string }> = {
  green: { dot: "bg-success", text: "text-success", ring: "border-success/40 bg-success/5" },
  amber: { dot: "bg-warning", text: "text-warning", ring: "border-warning/40 bg-warning/5" },
  red: {
    dot: "bg-destructive",
    text: "text-destructive",
    ring: "border-destructive/40 bg-destructive/5",
  },
};

function BandCard({ result }: { result: ReadinessResult }) {
  const tone = BAND_TONE[result.band.id] ?? BAND_TONE.green;
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", tone.ring)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
            Readiness result
          </p>
          <h3 className={cn("mt-1.5 text-base font-semibold", tone.text)}>{result.band.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {result.band.summary}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-foreground">
            {result.score}
            <span className="text-sm text-muted-foreground">/{result.max}</span>
          </p>
          <p className="eyebrow text-muted-foreground">Fatigue score</p>
          <p className="text-[0.625rem] text-muted-foreground">Lower is better</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {result.guidance.map((line) => (
          <li key={line} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <Check className="mt-[0.1rem] h-3 w-3 shrink-0 text-primary" strokeWidth={3} />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelectionRecap({ answers }: { answers: Record<string, string> }) {
  const rows = readinessSelections(answers);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <p className="eyebrow border-b border-border px-4 py-3 text-muted-foreground">
        What you selected
      </p>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
          >
            <span className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              {row.question}
            </span>
            <span className="shrink-0 text-right text-xs font-semibold text-foreground">
              {row.answer}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

  if (!result.table) {
    return (
      <div role="status" className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="font-semibold text-foreground">{result.band.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{result.band.summary}</p>
        <a href="/library" className="mt-4 inline-flex text-sm font-semibold text-primary">
          Open recovery and stretching videos
        </a>
      </div>
    );
  }

  // Just the table — the assessment step already shows the result and recap.
  return (
    <div className="animate-step-in">
      <CircuitTable table={result.table} />
    </div>
  );
}

/** The workout table: circuit badges, rest direction signs, reps/sets/tempo. */
export function CircuitTable({ table }: { table: WorkoutTable }) {
  const separators = table.separators ?? [];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-workout-table={table.id}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="sr-only">{table.title}</caption>
          <thead>
            <tr className="bg-primary/10 text-[0.625rem] uppercase tracking-[0.12em] text-foreground">
              <th scope="col" className="px-4 py-3 font-bold">
                Type
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Exercise
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Rest
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Intensity
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Reps
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Sets
              </th>
              <th scope="col" className="px-4 py-3 font-bold">
                Tempo
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const next = table.rows[i + 1];
              const separator =
                !next || next.circuit !== row.circuit
                  ? separators.find((s) => s.after === row.circuit)
                  : undefined;
              return (
                <Fragment key={`${table.id}-${i}`}>
                  <tr className={cn("border-t border-border", i % 2 === 1 && "bg-muted/30")}>
                    <td className="px-4 py-3">
                      <CircuitBadge circuit={row.circuit} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.exercise}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-semibold",
                          row.restDir === "up" ? "text-primary" : "text-foreground",
                        )}
                      >
                        {row.restArrow === false ||
                        (!row.rest && row.restArrow !== true) ? null : row.restDir === "up" ? (
                          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
                        )}
                        {row.rest}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.intensity}</td>
                    <td className="px-4 py-3 text-foreground">{row.reps}</td>
                    <td className="px-4 py-3 text-foreground">{row.sets}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.tempo}</td>
                  </tr>
                  {separator && (
                    <tr className="border-t border-border">
                      <td
                        colSpan={7}
                        className="px-4 py-3 text-center text-xs font-semibold text-primary"
                      >
                        {separator.label}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {table.notes && (
        <p className="whitespace-pre-line border-t border-border p-4 text-sm leading-relaxed text-foreground">
          {table.notes}
        </p>
      )}
      {table.images?.map((image) => (
        <img
          key={image.url}
          src={image.url}
          alt={image.alt}
          className="m-4 h-auto max-w-[calc(100%_-_2rem)] rounded-lg"
          loading="lazy"
        />
      ))}
    </div>
  );
}

/** Circuit marker: the bracketed C1 / C2 sign used in the program tables. */
function CircuitBadge({ circuit }: { circuit: string }) {
  return (
    <span className="relative inline-block px-[0.3rem] py-[0.15rem] font-mono text-[0.8125rem] font-bold leading-none tracking-tight text-success">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3px] border-2 border-success [clip-path:polygon(0_0,35%_0,35%_12%,12%_12%,12%_88%,35%_88%,35%_100%,0_100%,0_0,100%_0,100%_100%,65%_100%,65%_88%,88%_88%,88%_12%,65%_12%,65%_0,100%_0)]"
      />
      {circuit}
    </span>
  );
}
