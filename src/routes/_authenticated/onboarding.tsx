import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Info, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Container } from "@/components/app-shell";
import { Pill } from "@/components/media";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { OptionRow, StepRail, StepScene, StepTitle } from "@/components/form-kit";

import {
  intakeSteps,
  scoreIntake,
  type IntakeAnswers,
  type IntakeQuestion,
  type IntakeRecommendation,
} from "@/content/onboarding";
import { getIntake, saveIntake } from "@/lib/onboarding.functions";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Intake Questionnaire — Mike Salemi App" },
      {
        name: "description",
        content:
          "Answer a short intake questionnaire so we can place you in the right level and tailor your training priorities.",
      },
      { property: "og:title", content: "Intake Questionnaire — Mike Salemi App" },
      {
        property: "og:description",
        content: "Tell us about your kettlebell experience, fitness and lifestyle to personalise your program.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const { session } = useSession();
  const fetchIntake = useServerFn(getIntake);
  const existing = useQuery({
    queryKey: ["intake"],
    queryFn: () => fetchIntake(),
    enabled: Boolean(session),
    staleTime: 30_000,
  });

  if (existing.isLoading) {
    return (
      <AppShell>
        <Container className="py-10">
          <div className="command-panel grid place-items-center p-8 text-muted-foreground">
            <Spinner className="h-6 w-6" />
          </div>
        </Container>
      </AppShell>
    );
  }

  return (
    <Wizard
      initialAnswers={(existing.data?.answers as IntakeAnswers) ?? {}}
      alreadyComplete={Boolean(existing.data?.completed_at)}
    />
  );
}

function Wizard({
  initialAnswers,
  alreadyComplete,
}: {
  initialAnswers: IntakeAnswers;
  alreadyComplete: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const persist = useServerFn(saveIntake);

  const [answers, setAnswers] = useState<IntakeAnswers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(alreadyComplete);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = intakeSteps.length;
  const current = intakeSteps[step];
  const percent = finished ? 100 : Math.round((step / total) * 100);
  const recommendation: IntakeRecommendation = useMemo(() => scoreIntake(answers), [answers]);

  function setAnswer(question: IntakeQuestion, value: string) {
    setError(null);
    setAnswers((prev) => {
      if (question.type === "multi") {
        const list = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : [];
        const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: value };
    });
  }

  function isSelected(question: IntakeQuestion, value: string) {
    const answer = answers[question.id];
    return question.type === "multi" ? Array.isArray(answer) && answer.includes(value) : answer === value;
  }

  const missingRequired = current?.questions.some((q) => {
    if (!q.required) return false;
    const answer = answers[q.id];
    return Array.isArray(answer) ? answer.length === 0 : !answer;
  });

  async function next() {
    if (missingRequired) {
      setError("Please answer this question to continue.");
      return;
    }
    if (step < total - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    await complete();
  }

  async function complete() {
    setSaving(true);
    try {
      await persist({
        data: {
          answers,
          recommendation: { ...recommendation },
          completed: true,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["intake"] });
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Questionnaire saved");
    } catch {
      toast.error("Couldn't save your answers. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {!finished ? (
        <StepScene
          header={
            <div className="glass sticky top-0 z-20 border-b border-hairline">
              <div className="mx-auto w-full max-w-[36rem] px-4 py-3 sm:px-6">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep((s) => s - 1)}
                      className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Previous step"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      to="/immersion"
                      className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Back to dashboard"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  )}
                  <p className="truncate text-center text-sm font-semibold text-foreground">Intake</p>
                  <span className="numeric text-xs text-muted-foreground">
                    {step + 1}/{total}
                  </span>
                </div>
                <div className="mt-3">
                  <StepRail total={total} current={step} />
                </div>
              </div>
            </div>
          }
          footer={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={next}
                disabled={saving}
                className={cn(buttonStyles.primary, "flex-1")}
              >
                {saving ? <Spinner /> : null}
                {step === total - 1 ? "See my plan" : "Continue"}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          }
        >
          <div key={current.id} className="seq space-y-8">
            <StepTitle eyebrow={current.eyebrow} title={current.title} help={current.intro} />

            {current.questions.map((question) => (
              <div key={question.id}>
                {(
                  <h3 className="mb-3 text-[0.9375rem] font-semibold text-foreground">
                    {question.label}
                    {question.required && <span className="ml-1 text-primary">*</span>}
                  </h3>
                )}
                {question.help && (
                  <p className="mb-3 text-sm text-muted-foreground">{question.help}</p>
                )}
                <div className="grid gap-2">
                  {question.options.map((option) => (
                    <OptionRow
                      key={option.value}
                      selected={isSelected(question, option.value)}
                      multi={question.type === "multi"}
                      label={option.label}
                      description={option.description}
                      bullets={option.bullets}
                      onClick={() => setAnswer(question, option.value)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {current.note && (
              <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Info className="h-4 w-4 text-primary" /> {current.note.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {current.note.points.map((point) => (
                    <li key={point} className="text-sm text-muted-foreground">
                      · {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        </StepScene>
      ) : (
        <Container className="py-10 sm:py-14">
          <section className="animate-step-in mx-auto max-w-[36rem]">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="primary">
                <Sparkles className="h-3 w-3" /> Your plan
              </Pill>
              <Pill>{recommendation.courseLabel}</Pill>
            </div>
            <h1 className="mt-5 text-2xl text-foreground sm:text-3xl">{recommendation.headline}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{recommendation.summary}</p>

            <ul className="mt-7 space-y-2">
              {recommendation.priorities.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/immersion/$courseSlug",
                    params: { courseSlug: recommendation.courseSlug },
                  })
                }
                className={buttonStyles.primary}
              >
                Start {recommendation.courseLabel} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinished(false);
                  setStep(0);
                }}
                className={buttonStyles.ghost}
              >
                <RotateCcw className="h-4 w-4" /> Review answers
              </button>
            </div>
          </section>
        </Container>
      )}
    </AppShell>
  );
}

