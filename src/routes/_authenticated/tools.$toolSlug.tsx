import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Container } from "@/components/app-shell";
import { Pill } from "@/components/media";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { OptionRow, StepScene, StepTitle } from "@/components/form-kit";
import { Reveal } from "@/components/motion-kit";
import {
  AnswerRecap,
  AnsweredSoFar,
  BandScale,
  ResultSection,
  ScoreDial,
  ToolIntro,
  ToolStepHeader,
} from "@/components/tool-kit";


import { VimeoPlayer } from "@/components/VimeoPlayer";
import { scoreTool, tools, type ToolConfig } from "@/content/tools";
import { KettlebellGlyph } from "@/components/kettlebell-svg";
import {
  kettlebellSelectorMeta,
  resolveKettlebell,
  selectorSteps,
  type KettlebellAnswers,
} from "@/content/kettlebell-selector";

import { getToolResults, saveToolResult } from "@/lib/progress.functions";
import { celebrate } from "@/components/celebrate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools/$toolSlug")({
  loader: ({ params }) => {
    const tool = tools.find((t) => t.slug === params.toolSlug);
    if (!tool) throw notFound();
    return { title: tool.title, tagline: tool.tagline, description: tool.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable — Kettlebell Lifestyle" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${loaderData.title} — Kettlebell Lifestyle` },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: `${loaderData.title} — Kettlebell Lifestyle` },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ToolRoute,
});

function ToolRoute() {
  const { toolSlug } = Route.useParams();
  const tool = tools.find((t) => t.slug === toolSlug);
  if (!tool) return null;
  if (tool.id === "kettlebell-selector") return <KettlebellFlow key={toolSlug} />;
  return <ToolRunner key={toolSlug} tool={tool} />;
}

/* ------------------------------------------------------------------ */
/* Kettlebell Selector — chart-driven, illustrated result              */
/* ------------------------------------------------------------------ */

function KettlebellFlow() {
  const [answers, setAnswers] = useState<KettlebellAnswers>({});
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useServerFn(saveToolResult);
  const loadResults = useServerFn(getToolResults);
  const queryClient = useQueryClient();

  const resultsQuery = useQuery({
    queryKey: ["tool-results"],
    queryFn: () => loadResults({}),
  });

  const previous = useMemo(() => {
    const row = (resultsQuery.data ?? []).find((r) => r.tool_id === "kettlebell-selector");
    if (!row) return null;
    const stored = (row.result ?? {}) as { title?: string };
    return {
      title: stored.title ?? "Saved kettlebell set",
      takenAt: new Date(row.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  }, [resultsQuery.data]);

  const total = selectorSteps.length;
  const finished = step >= total;
  const current = selectorSteps[Math.min(step, total - 1)];
  const result = useMemo(() => (finished ? resolveKettlebell(answers) : null), [finished, answers]);

  const answeredRows = useMemo(
    () =>
      selectorSteps
        .map((s, index) => {
          const value = (answers as Record<string, string>)[s.id];
          const option = value ? s.options(answers).find((o) => o.value === value) : undefined;
          return option ? { id: s.id as string, question: s.question, answer: option.label, index } : null;
        })
        .filter((row): row is { id: string; question: string; answer: string; index: number } => row !== null),
    [answers],
  );

  function choose(value: string) {
    setAnswers((a) => ({ ...a, [current.id]: value }) as KettlebellAnswers);
    window.setTimeout(() => setStep((s) => s + 1), 150);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setStarted(false);
    setSaved(false);
  }

  async function persist() {
    if (!result) return;
    setSaving(true);
    try {
      await save({
        data: {
          toolId: "kettlebell-selector",
          answers: answers as Record<string, string>,
          result: {
            score: result.scenario,
            title: result.headline,
            detail: { bells: result.bells.map((b) => b.label) },
          },
        },
      });
      setSaved(true);
      toast.success("Your kettlebell set is saved");
      celebrate({
        id: `tool-kettlebell-selector-${Date.now()}`,
        eyebrow: "Assessment complete",
        title: result.headline,
        body: "Your kettlebell set is saved to your account and on its way to your inbox.",
        action: { label: "See all your results", to: "/tools" },
      });
      queryClient.invalidateQueries({ queryKey: ["tool-results"] });
    } catch {
      toast.error("Couldn't save that result");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- intro ---------------- */
  if (!started) {
    return (
      <AppShell>
        <StepScene
          header={
            <div className="glass sticky top-0 z-20 border-b border-hairline">
              <div className="mx-auto grid w-full max-w-[36rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
                <Link
                  to="/tools"
                  className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="All tools"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <p className="truncate text-center text-sm font-semibold text-foreground">
                  {kettlebellSelectorMeta.title}
                </p>
                <span />
              </div>
            </div>
          }
        >
          <ToolIntro
            eyebrow={kettlebellSelectorMeta.tagline}
            title={kettlebellSelectorMeta.title}
            description={kettlebellSelectorMeta.description}
            questionCount={total}
            minutes={2}
            bullets={[
              "Four questions about your size, background and goal.",
              "You get three bells — where to start, your working bell, and heavy work.",
              "Save it and the full set list lands in your inbox.",
            ]}
            previous={previous}
            loadingPrevious={resultsQuery.isLoading}
            onStart={() => setStarted(true)}
            startLabel={previous ? "Run it again" : "Find my bells"}
          />
        </StepScene>
      </AppShell>
    );
  }

  /* ---------------- questions ---------------- */
  if (!finished) {
    return (
      <AppShell>
        <StepScene
          header={
            <ToolStepHeader
              title={kettlebellSelectorMeta.title}
              step={step}
              total={total}
              answeredCount={answeredRows.length}
              onBack={step > 0 ? () => setStep((s) => s - 1) : () => setStarted(false)}
            />
          }
        >
          <div key={current.id} className="seq space-y-8">
            <StepTitle eyebrow={current.eyebrow} title={current.question} help={current.help} />
            <div className="grid gap-2">
              {current.options(answers).map((option) => (
                <OptionRow
                  key={option.value}
                  selected={(answers as Record<string, string>)[current.id] === option.value}
                  label={option.label}
                  description={option.description}
                  onClick={() => choose(option.value)}
                />
              ))}
            </div>
            <AnsweredSoFar
              items={answeredRows.filter((row) => row.index < step)}
              onEdit={(index) => setStep(index)}
            />
          </div>
        </StepScene>
      </AppShell>
    );
  }

  if (!result) return null;

  const labels = ["Bell 1 · start here", "Bell 2 · working bell", "Bell 3 · heavy work"];

  return (
    <AppShell>
      <Container className="py-10 sm:py-14">
        <section className="animate-step-in mx-auto max-w-[46rem]">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="primary">
              <Sparkles className="h-3 w-3" /> Your kettlebell set
            </Pill>
            <Pill>Scenario {result.scenario}</Pill>
          </div>
          <h1 className="mt-5 text-2xl text-foreground sm:text-3xl">{result.headline}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{result.summary}</p>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {result.bells.map((b, i) => (
              <Reveal key={`${b.label}-${i}`} delay={i * 90}>
                <div className="flex h-full flex-col items-center rounded-3xl border border-border bg-surface px-4 py-6 text-center">
                  <KettlebellGlyph
                    weight={b.label}
                    emphasis={i === 0}
                    size={i === 0 ? 140 : 120}
                    className="transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1"
                  />
                  <p
                    className={cn(
                      "mt-4 text-xs font-semibold tracking-wide",
                      i === 0 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {labels[i]}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <ResultSection title="How to use this set">
            <ul className="space-y-2">
              {result.notes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </ResultSection>

          <AnswerRecap rows={answeredRows.map((row) => ({ question: row.question, answer: row.answer }))} />

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={persist} disabled={saving || saved} className={buttonStyles.primary}>
              {saving ? <Spinner /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : saved ? "Saved" : "Save my kettlebell set"}
            </button>
            <button type="button" onClick={restart} className={buttonStyles.outline}>
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          </div>
        </section>
      </Container>
    </AppShell>
  );
}



function ToolRunner({ tool }: { tool: ToolConfig }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useServerFn(saveToolResult);
  const loadResults = useServerFn(getToolResults);
  const queryClient = useQueryClient();

  const resultsQuery = useQuery({
    queryKey: ["tool-results"],
    queryFn: () => loadResults({}),
  });

  const previous = useMemo(() => {
    const row = (resultsQuery.data ?? []).find((r) => r.tool_id === tool.id);
    if (!row) return null;
    const result = (row.result ?? {}) as { score?: number; title?: string };
    return {
      title: result.title ?? "Saved result",
      score: typeof result.score === "number" ? result.score : undefined,
      takenAt: new Date(row.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  }, [resultsQuery.data, tool.id]);

  const total = tool.questions.length;
  const finished = step >= total;
  const question = tool.questions[step];
  const maxScore = useMemo(
    () => tool.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.score)), 0),
    [tool],
  );

  const outcome = useMemo(() => (finished ? scoreTool(tool, answers) : null), [finished, tool, answers]);

  const answeredRows = useMemo(
    () =>
      tool.questions
        .map((q, index) => {
          const option = q.options.find((o) => o.value === answers[q.id]);
          return option ? { id: q.id, question: q.question, answer: option.label, index } : null;
        })
        .filter((row): row is { id: string; question: string; answer: string; index: number } => row !== null),
    [tool, answers],
  );

  const answeredCount = answeredRows.length;

  function choose(value: string) {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    window.setTimeout(() => setStep((s) => s + 1), 140);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setStarted(false);
    setSaved(false);
  }

  async function persist() {
    if (!outcome) return;
    setSaving(true);
    try {
      await save({
        data: {
          toolId: tool.id,
          answers,
          result: { score: outcome.score, title: outcome.band.title },
        },
      });
      setSaved(true);
      toast.success("Result saved to your account");
      celebrate({
        id: `tool-${tool.id}-${Date.now()}`,
        eyebrow: `${tool.title} complete`,
        title: outcome.band.title,
        body: "Saved to your account — a copy is on its way to your inbox.",
        action: { label: "See all your results", to: "/tools" },
      });
      queryClient.invalidateQueries({ queryKey: ["tool-results"] });
    } catch {
      toast.error("Couldn't save that result");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- intro ---------------- */
  if (!started) {
    return (
      <AppShell>
        <StepScene
          header={
            <div className="glass sticky top-0 z-20 border-b border-hairline">
              <div className="mx-auto grid w-full max-w-[36rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
                <Link
                  to="/tools"
                  className="tap -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="All tools"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <p className="truncate text-center text-sm font-semibold text-foreground">{tool.title}</p>
                <span />
              </div>
            </div>
          }
        >
          <ToolIntro
            eyebrow={tool.tagline}
            title={tool.title}
            description={tool.description}
            questionCount={total}
            minutes={Math.max(1, Math.round(total / 3))}
            bullets={[
              "One question at a time — you can go back and change any answer.",
              "You get a scored result with the specific things to work on next.",
              "Save it and we email you a copy plus the follow-along videos.",
            ]}
            previous={previous}
            loadingPrevious={resultsQuery.isLoading}
            onStart={() => setStarted(true)}
            startLabel={previous ? "Take it again" : "Start the assessment"}
          />
        </StepScene>
      </AppShell>
    );
  }

  /* ---------------- questions ---------------- */
  if (!finished) {
    return (
      <AppShell>
        <StepScene
          header={
            <ToolStepHeader
              title={tool.title}
              step={step}
              total={total}
              answeredCount={answeredCount}
              onBack={step > 0 ? () => setStep((s) => s - 1) : () => setStarted(false)}
            />
          }
        >
          <div key={question.id} className="seq space-y-8">
            <StepTitle eyebrow={`Question ${step + 1}`} title={question.question} help={question.help} />
            <div className="grid gap-2">
              {question.options.map((option) => (
                <OptionRow
                  key={option.value}
                  selected={answers[question.id] === option.value}
                  label={option.label}
                  description={option.description}
                  onClick={() => choose(option.value)}
                />
              ))}
            </div>
            <AnsweredSoFar
              items={answeredRows.filter((row) => row.index < step)}
              onEdit={(index) => setStep(index)}
            />
          </div>
        </StepScene>
      </AppShell>
    );
  }

  /* ---------------- result ---------------- */
  if (!outcome) return null;

  return (
    <AppShell>
      <Container className="py-10 sm:py-14">
        <section className="animate-step-in mx-auto max-w-[42rem]">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="primary">
              <Sparkles className="h-3 w-3" /> Your result
            </Pill>
            <Pill>{tool.title}</Pill>
          </div>

          <h1 className="mt-5 text-2xl text-foreground sm:text-3xl">{outcome.band.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{outcome.band.summary}</p>

          <div className="mt-7 rounded-3xl border border-border bg-surface p-5">
            <ScoreDial score={outcome.score} max={maxScore} label={outcome.band.title} />
          </div>

          <BandScale bands={tool.bands} activeTitle={outcome.band.title} />

          <ResultSection title="What to do next">
            <ul className="space-y-2">
              {outcome.band.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </ResultSection>

          <AnswerRecap rows={answeredRows.map((row) => ({ question: row.question, answer: row.answer }))} />

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={persist} disabled={saving || saved} className={buttonStyles.primary}>
              {saving ? <Spinner /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : saved ? "Saved" : "Save to my account"}
            </button>
            <button type="button" onClick={restart} className={buttonStyles.outline}>
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          </div>

          {outcome.band.videoIds.length > 0 && (
            <ResultSection title="Follow along">
              <div className="grid gap-5">
                {outcome.band.videoIds.map((vimeoId, i) => (
                  <VimeoPlayer
                    key={`${vimeoId}-${i}`}
                    vimeoId={vimeoId}
                    title={`${outcome.band.title} video ${i + 1}`}
                  />
                ))}
              </div>
            </ResultSection>
          )}
        </section>
      </Container>
    </AppShell>
  );
}


