import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Info,
  PlayCircle,
  RotateCcw,
  Sun,
} from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { Pill, Poster, ProgressRing, SectionHeading } from "@/components/media";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { buttonStyles } from "@/components/ui-kit";
import {
  AVERAGE_DAY_ID,
  averageDaySections,
  readinessSteps,
  type AverageDaySection,
} from "@/content/average-day";
import { findDay } from "@/content/program";
import { isReadinessComplete, resolveReadiness } from "@/content/readiness-table";
import { CircuitTable } from "@/components/readiness";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/self-guided/average-day")({
  head: () => ({
    meta: [
      { title: "An Average Day — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Walk through an average Kettlebell Lifestyle training day: readiness assessment, morning routine, warm up, kettlebell prep, workout and post-training stretching.",
      },
      { property: "og:title", content: "An Average Day — Kettlebell Lifestyle" },
      {
        property: "og:description",
        content:
          "Readiness check, morning routine, warm up, kettlebell prep, workout and stretching in one flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AverageDayPage,
});

function AverageDayPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [scored, setScored] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const exampleDay = findDay(AVERAGE_DAY_ID);
  const result = useMemo(
    () =>
      isReadinessComplete(answers) && exampleDay
        ? resolveReadiness(answers, exampleDay.day.id)
        : null,
    [answers, exampleDay],
  );
  const answeredAll = readinessSteps.every((s) => answers[s.id]);

  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell>
      <div className="spotlight relative overflow-hidden border-b border-hairline">
        <Container className="relative py-5 sm:py-7">
          <Link
            to="/self-guided"
            className="tap inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Self-Guided
          </Link>

          <div className="command-panel grain animate-blur-in relative mt-5 overflow-hidden p-7 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="primary">
                <Sun className="h-3 w-3" /> Average day
              </Pill>
              <Pill>{averageDaySections.length} blocks</Pill>
              <Pill>Readiness assessment included</Pill>
            </div>
            <h1 className="mt-8 max-w-4xl text-3xl text-foreground sm:text-4xl">
              An average day in KBL.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              This is how a full training day runs, start to finish. Check in with your readiness
              first, then move through the morning routine, warm up, kettlebell prep, workout and
              stretching.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              This example follows Level I, Phase II, Workout III. Try the assessment to see how
              your answers adapt that workout.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {averageDaySections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollTo(section.id)}
                  className="pressable eyebrow rounded-full border border-hairline bg-card px-4 py-2 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6 sm:py-8">
        {/* Readiness assessment */}
        <section className="command-panel animate-rise overflow-hidden p-7 sm:p-9">
          <SectionHeading
            eyebrow="Before you train"
            title="Training Readiness Assessment"
            description="Five honest questions. Your answers set the intensity for the rest of the day."
          />

          {!scored || !result ? (
            <div className="mt-7">
              <div className="flex items-center gap-4">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 [transition-timing-function:var(--ease-out-soft)]"
                    style={{
                      width: `${(step / readinessSteps.length) * 100}%`,
                      background: "var(--gradient-primary)",
                    }}
                  />
                </div>
                <span className="numeric shrink-0 text-xs text-muted-foreground">
                  {step + 1} / {readinessSteps.length}
                </span>
              </div>

              <ReadinessStepCard
                key={readinessSteps[step].id}
                index={step}
                answer={answers[readinessSteps[step].id]}
                onAnswer={(value) =>
                  setAnswers((prev) => ({ ...prev, [readinessSteps[step].id]: value }))
                }
              />

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!answers[readinessSteps[step].id]}
                  onClick={() => {
                    if (step < readinessSteps.length - 1) setStep((s) => s + 1);
                    else setScored(true);
                  }}
                  className={buttonStyles.primary}
                >
                  {step === readinessSteps.length - 1 ? "See my readiness" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className={buttonStyles.ghost}
                  >
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-pop mt-7 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <ProgressRing
                percent={Math.round((result.score / result.max) * 100)}
                size={132}
                stroke={10}
                label={`${result.score}/${result.max}`}
                sublabel="Fatigue · lower is better"
              />
              <div className="min-w-0">
                <Pill tone={result.band.id === "green" ? "success" : "primary"}>
                  <ClipboardCheck className="h-3 w-3" />{" "}
                  {result.band.id === "green"
                    ? "Green light"
                    : result.band.id === "amber"
                      ? "Scale it back"
                      : "Recover today"}
                </Pill>
                <h3 className="mt-3 text-lg text-foreground sm:text-xl">{result.band.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {result.band.summary}
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {result.band.advice.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-xl border border-hairline bg-background/40 p-3 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => scrollTo(averageDaySections[0].id)}
                    className={buttonStyles.primary}
                  >
                    Start the day <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScored(false);
                      setStep(0);
                      setAnswers({});
                    }}
                    className={buttonStyles.ghost}
                  >
                    <RotateCcw className="h-4 w-4" /> Retake
                  </button>
                </div>
              </div>
            </div>
          )}

          {scored && result?.table && (
            <div className="mt-6">
              <p className="mb-3 text-sm text-muted-foreground">
                Example workout: {exampleDay?.course.level} · {exampleDay?.phase.label} ·{" "}
                {exampleDay?.day.title}
              </p>
              <CircuitTable table={result.table} />
            </div>
          )}
          {!scored && answeredAll && (
            <p className="mt-4 text-xs text-muted-foreground">
              All five answered — jump ahead any time.
            </p>
          )}
        </section>

        {/* Day blocks */}
        <div className="mt-12 space-y-7">
          {averageDaySections.map((section, index) => (
            <DayBlock
              key={section.id}
              section={section}
              index={index}
              refCallback={(el) => {
                sectionRefs.current[section.id] = el;
              }}
            />
          ))}
        </div>
      </Container>
    </AppShell>
  );
}

function ReadinessStepCard({
  index,
  answer,
  onAnswer,
}: {
  index: number;
  answer?: string;
  onAnswer: (value: string) => void;
}) {
  const step = readinessSteps[index];
  return (
    <div className="animate-pop mt-6">
      <h3 className="text-lg font-semibold text-foreground sm:text-xl">{step.question}</h3>
      <div className="stagger mt-4 grid gap-2.5">
        {step.options.map((option) => {
          const selected = answer === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onAnswer(option.value)}
              className={cn(
                "pressable flex items-start gap-3 rounded-2xl border p-4 text-left",
                selected
                  ? "border-primary bg-elevated"
                  : "border-hairline bg-card hover:border-primary/50 hover:bg-elevated",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="text-sm font-semibold text-foreground">{option.label}</span>
            </button>
          );
        })}
      </div>

      {step.note && (
        <div className="mt-6 rounded-2xl border border-hairline bg-background/40 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" /> {step.note.title ?? "Consider this"}
          </p>
          {step.note.body && <p className="mt-2 text-sm text-muted-foreground">{step.note.body}</p>}
          {step.note.points && (
            <ul className="mt-2.5 space-y-1.5">
              {step.note.points.map((point) => (
                <li key={point} className="text-sm text-muted-foreground">
                  · {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DayBlock({
  section,
  index,
  refCallback,
}: {
  section: AverageDaySection;
  index: number;
  refCallback: (el: HTMLElement | null) => void;
}) {
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const playing = activeClip ?? section.vimeoId;
  const playingTitle =
    section.clips?.find((clip) => clip.vimeoId === activeClip)?.title ?? section.title;

  return (
    <section ref={refCallback} id={section.id} className="scroll-mt-24">
      <SectionHeading eyebrow={section.eyebrow} title={section.title} description={section.blurb} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {playing ? (
            <VimeoPlayer vimeoId={playing} title={playingTitle} autoplay={Boolean(activeClip)} />
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-hairline bg-card text-center text-sm text-muted-foreground">
              <span className="px-6">
                <PlayCircle className="mx-auto mb-2 h-6 w-6 text-primary" />
                Pick a movement from the list to play its video.
              </span>
            </div>
          )}

          {section.notes && (
            <div className="mt-4 rounded-2xl border border-hairline bg-background/40 p-5">
              <p className="eyebrow text-primary">Notes</p>
              <p className="mt-2 text-sm text-muted-foreground">{section.notes}</p>
              {section.recommendation && (
                <ol className="mt-3 space-y-1.5">
                  {section.recommendation.map((item, i) => (
                    <li key={item} className="text-sm font-semibold text-foreground">
                      {i + 1}. {item}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {section.clips && section.clips.length > 0 && (
          <aside className="min-w-0">
            <p className="eyebrow text-muted-foreground">Associated videos</p>
            <div className="stagger mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              {section.clips.map((clip) => {
                const selected = Boolean(clip.vimeoId) && activeClip === clip.vimeoId;
                return (
                  <button
                    key={clip.title}
                    type="button"
                    disabled={!clip.vimeoId}
                    onClick={() => clip.vimeoId && setActiveClip(clip.vimeoId)}
                    className={cn(
                      "group pressable grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border p-2 text-left",
                      selected ? "border-primary bg-elevated" : "border-hairline bg-card",
                      clip.vimeoId ? "hover:border-primary/60" : "opacity-70",
                    )}
                  >
                    <Poster
                      vimeoId={clip.vimeoId ?? `${section.id}-${clip.title}`}
                      alt={clip.title}
                      size="sm"
                      state={clip.vimeoId ? (selected ? "active" : "default") : "locked"}
                      className="rounded-xl"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {clip.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {clip.vimeoId ? "Play clip" : "Video coming soon"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {index < averageDaySections.length - 1 && <div className="mt-12 h-px w-full bg-hairline" />}
    </section>
  );
}
