import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { OptionRow, StepRail, StepScene, StepTitle } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui-kit";
import { getProgramIntake, resetProgramIntake, saveProgramIntake } from "@/lib/program-intake.functions";
import { MTK_SLUG } from "@/lib/mtk-paths";

type Question = { id: string; type: "single" | "multi" | "text"; label: string; help?: string; options?: string[]; optional?: boolean };
type Answers = Record<string, string | string[]>;

export const Route = createFileRoute("/_authenticated/programs/$programSlug_/intake")({
  head: () => ({ meta: [
    { title: "Program Intake — Mike Salemi App" },
    { name: "description", content: "Shape your approach to this program with a short personal intake." },
    { property: "og:title", content: "Program Intake — Mike Salemi App" },
    { property: "og:description", content: "Shape your approach to this program with a short personal intake." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ProgramIntakePage,
});

function ProgramIntakePage() {
  const { programSlug } = Route.useParams();
  const fetchIntake = useServerFn(getProgramIntake);
  const saveIntake = useServerFn(saveProgramIntake);
  const resetIntake = useServerFn(resetProgramIntake);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["program-intake", programSlug], queryFn: () => fetchIntake({ data: { slug: programSlug } }) });
  const isMtk = programSlug === MTK_SLUG;
  const questions = useMemo(() => (data?.definition?.questions ?? []) as unknown as Question[], [data]);
  const initial = (data?.response?.answers ?? {}) as Answers;
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [review, setReview] = useState(Boolean(data?.response?.completed_at));
  const currentAnswers = Object.keys(answers).length ? answers : initial;

  useEffect(() => {
    if (data?.response?.completed_at) setReview(true);
  }, [data?.response?.completed_at]);

  const mutation = useMutation({
    mutationFn: () => saveIntake({ data: { slug: programSlug, answers: currentAnswers } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["program-intake", programSlug] }); setReview(true); toast.success("Program intake saved"); },
    onError: () => toast.error("Couldn't save your intake"),
  });

  const reset = useMutation({
    mutationFn: () => resetIntake({ data: { slug: programSlug } }),
    onSuccess: async () => { setAnswers({}); setStep(0); setReview(false); await queryClient.invalidateQueries({ queryKey: ["program-intake", programSlug] }); toast.success("Starting a new attempt — earlier answers are kept"); },
    onError: () => toast.error("Couldn't reset your intake"),
  });

  if (isLoading) return <AppShell><div className="grid min-h-[60vh] place-items-center"><Spinner /></div></AppShell>;
  if (!data?.definition) return <AppShell><div className="mx-auto max-w-xl px-4 py-16"><p className="text-muted-foreground">This program does not have an intake yet.</p><Link to="/programs" className="mt-4 inline-flex text-primary">Back to programs</Link></div></AppShell>;
  const question = questions[step];
  const guidance = data.response?.guidance as { headline?: string; priorities?: string[]; caution?: string } | null;

  // MTK: the completed assessment lives on the personalized results page.
  if (review && isMtk) return <Navigate to="/mtk-plan/results" />;

  if (review) return (
    <AppShell><main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="eyebrow text-primary">{data.program.name}</p>
      <h1 className="mt-3 text-3xl text-foreground">Your program approach</h1>
      <p className="mt-3 text-muted-foreground">{guidance?.headline ?? "Your intake is complete."}</p>
      <ul className="mt-7 space-y-2">{(guidance?.priorities ?? []).map((item) => <li key={item} className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul>
      {guidance?.caution && <p className="mt-5 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">Keep in mind: {guidance.caution}</p>}
      <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => navigate({ to: "/courses/$courseSlug", params: { courseSlug: programSlug } })}>Open program <ArrowRight /></Button><Button variant="ghost" onClick={() => { setAnswers(initial); setStep(0); setReview(false); }}><RotateCcw /> Review answers</Button><Button variant="ghost" disabled={reset.isPending} onClick={() => { if (window.confirm("Clear your answers and start this intake from scratch?")) reset.mutate(); }}>Start fresh</Button></div>
    </main></AppShell>
  );

  const value = currentAnswers[question.id];
  const complete = question.optional || (Array.isArray(value) ? value.length > 0 : Boolean(value?.trim()));
  const choose = (option: string) => setAnswers((previous) => {
    const base = Object.keys(previous).length ? previous : initial;
    if (question.type === "multi") { const list = Array.isArray(base[question.id]) ? base[question.id] as string[] : []; return { ...base, [question.id]: list.includes(option) ? list.filter((item) => item !== option) : [...list, option] }; }
    return { ...base, [question.id]: option };
  });

  return <AppShell><StepScene header={<div className="border-b border-hairline bg-background"><div className="mx-auto max-w-[36rem] px-4 py-4"><div className="flex items-center justify-between"><Link to="/courses/$courseSlug" params={{ courseSlug: programSlug }} aria-label="Back to program" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link><span className="text-sm font-semibold">{data.program.name}</span><span className="numeric text-xs text-muted-foreground">{step + 1}/{questions.length}</span></div><div className="mt-3"><StepRail total={questions.length} current={step} /></div></div></div>} footer={<Button className="w-full" disabled={!complete || mutation.isPending} onClick={() => step < questions.length - 1 ? setStep((value) => value + 1) : mutation.mutate()}>{mutation.isPending ? <Spinner /> : null}{step < questions.length - 1 ? "Continue" : "Save my intake"}<ArrowRight /></Button>}>
    <StepTitle eyebrow="Program intake" title={question.label} help={question.help} />
    {question.type === "text" ? <textarea value={typeof value === "string" ? value : ""} onChange={(event) => setAnswers((previous) => ({ ...(Object.keys(previous).length ? previous : initial), [question.id]: event.target.value.slice(0, 1000) }))} maxLength={1000} rows={6} className="mt-6 w-full resize-none rounded-xl border border-input bg-surface p-4 text-foreground outline-none focus:border-primary" placeholder="Optional notes" /> : <div className="mt-6 grid gap-2">{question.options?.map((option) => <OptionRow key={option} selected={Array.isArray(value) ? value.includes(option) : value === option} multi={question.type === "multi"} label={option} onClick={() => choose(option)} />)}</div>}
  </StepScene></AppShell>;
}