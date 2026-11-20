import type { ReactNode } from "react";
import { Check, ChevronLeft, Info } from "lucide-react";
import { buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export type StepperOption = { value: string; label: string };
export type StepperQuestion = {
  id: string;
  question: string;
  options: StepperOption[];
  note?: { title?: string; body?: string; points?: string[] };
};

/**
 * One-question-at-a-time choice form: progress rail, question, options,
 * optional help note, Back button and a caller-supplied action slot.
 *
 * Fully controlled — the parent owns `answers` and `step`, so the same
 * stepper serves any KBL form (readiness, tools, intake) without changes.
 */
export function QuestionStepper({
  questions,
  answers,
  step,
  onStepChange,
  onAnswer,
  action,
  autoAdvance = true,
  label = "Question",
}: {
  questions: StepperQuestion[];
  answers: Record<string, string>;
  step: number;
  onStepChange: (step: number) => void;
  /** Called with the question id and chosen value. */
  onAnswer: (questionId: string, value: string) => void;
  /** Rendered beside Back — e.g. a submit button or a "locked" hint. */
  action?: ReactNode;
  /** Move to the next question automatically after a choice. */
  autoAdvance?: boolean;
  label?: string;
}) {
  if (!questions.length) return null;
  const index = Math.min(Math.max(step, 0), questions.length - 1);
  const current = questions[index];

  function choose(value: string) {
    onAnswer(current.id, value);
    if (autoAdvance && index < questions.length - 1) {
      window.setTimeout(() => onStepChange(index + 1), 140);
    }
  }

  return (
    <div className="animate-step-in">
      <div className="flex items-center gap-2" aria-hidden>
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              answers[q.id] ? "bg-success" : i === index ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <div key={current.id} className="animate-step-in mt-4">
        <p className="eyebrow text-primary">
          {label} {index + 1} of {questions.length}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
          {current.question}
        </h3>

        <div className="mt-4 space-y-2" role="radiogroup" aria-label={current.question}>
          {current.options.map((option) => {
            const active = answers[current.id] === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.value)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-foreground/25",
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

        {current.note && <QuestionNote note={current.note} />}
      </div>

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onStepChange(Math.max(0, index - 1))}
          className={cn(buttonStyles.outline, "disabled:opacity-40")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        {action}
      </div>
    </div>
  );
}

export function QuestionNote({ note }: { note: NonNullable<StepperQuestion["note"]> }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
      <p className="flex items-start gap-2 text-xs font-semibold text-foreground">
        <Info className="mt-[0.1rem] h-3.5 w-3.5 shrink-0 text-primary" />
        {note.title ?? "Consider this before you answer"}
      </p>
      {note.body && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note.body}</p>
      )}
      {note.points && (
        <ul className="mt-2 space-y-1.5">
          {note.points.map((point) => (
            <li key={point} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
