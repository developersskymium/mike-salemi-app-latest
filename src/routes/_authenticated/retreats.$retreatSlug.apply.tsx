import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Check, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OptionRow, StepRail, StepScene, StepTitle } from "@/components/form-kit";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { formatRetreatDates } from "@/content/retreats";
import { useRetreats } from "@/hooks/use-retreats";
import {
  getMyRetreatApplication,
  submitRetreatApplication,
  type RetreatAnswers,
} from "@/lib/retreat-applications.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/retreats/$retreatSlug/apply")({
  head: () => ({
    meta: [
      { title: "Retreat application — Men of Movement" },
      { name: "description", content: "Apply for your place at a Men of Movement retreat in Mount Shasta." },
      { property: "og:title", content: "Retreat application — Men of Movement" },
      { property: "og:description", content: "Apply for your place at a Men of Movement retreat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyPage,
});

const INTENTIONS = [
  "Break through patterns I've carried for years",
  "Reconnect with my body and energy",
  "Find clarity through a life transition",
  "Build real brotherhood",
];
const EXPERIENCE = ["This is new to me", "I've done some breathwork or men's work", "I have an established practice"];

const STEPS = ["Intention", "Readiness", "Commitment", "Review"] as const;

const field = "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary";

const empty: RetreatAnswers = {
  intention: "",
  calling: "",
  experience: "",
  health: "",
  sweatLodgeOk: false,
  diet: "",
  fullAttendance: false,
  agreements: false,
  phone: "",
  emergencyName: "",
  emergencyPhone: "",
};

function ApplyPage() {
  const { retreatSlug } = Route.useParams();
  const retreat = useRetreats().find(retreatSlug);
  const qc = useQueryClient();
  const getMine = useServerFn(getMyRetreatApplication);
  const submit = useServerFn(submitRetreatApplication);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<RetreatAnswers>(empty);
  const set = <K extends keyof RetreatAnswers>(k: K, v: RetreatAnswers[K]) => setA((p) => ({ ...p, [k]: v }));

  const mine = useQuery({
    queryKey: ["retreat-application", retreatSlug],
    queryFn: () => getMine({ data: { slug: retreatSlug } }),
  });

  const send = useMutation({
    mutationFn: () =>
      submit({
        data: {
          slug: retreatSlug,
          startsOn: retreat?.demoDates ? null : (retreat?.startsAt.slice(0, 10) ?? null),
          endsOn: retreat?.demoDates ? null : (retreat?.endsAt.slice(0, 10) ?? null),
          waitlist: retreat?.status === "waitlist",
          answers: a,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retreat-application", retreatSlug] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!retreat) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">That retreat does not exist.</div>
      </AppShell>
    );
  }

  const waitlist = retreat.status === "waitlist";
  const closed = retreat.status === "past";

  const cohort = (
    <div className="mb-8 rounded-2xl border border-hairline bg-surface/60 p-4">
      <p className="eyebrow text-primary">{waitlist ? "Waitlist" : "Fixed cohort"}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{retreat.name}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatRetreatDates(retreat)}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Mount Shasta, CA</span>
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{retreat.capacity} men maximum</span>
      </div>
    </div>
  );

  if (mine.isLoading) {
    return <AppShell><div className="grid min-h-[50vh] place-items-center"><Spinner /></div></AppShell>;
  }

  if (mine.data || send.isSuccess) {
    const isWait = (mine.data?.status ?? (waitlist ? "waitlist" : "submitted")) === "waitlist";
    return (
      <AppShell>
        <StepScene>
          {cohort}
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-6 w-6" /></span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">{isWait ? "You're on the waitlist" : "Application received"}</h1>
            <p className="mx-auto mt-3 max-w-[40ch] text-sm text-muted-foreground">
              {isWait
                ? "Mike's team will reach out the moment a place opens or new dates are announced."
                : "Mike's team will review it and reach out to book a short alignment call. Nothing is charged here."}
            </p>
            <Link to="/retreats/$retreatSlug" params={{ retreatSlug }} className={cn(buttonStyles.outline, "mt-6")}>Back to retreat</Link>
          </div>
        </StepScene>
      </AppShell>
    );
  }

  if (closed) {
    return (
      <AppShell>
        <StepScene>
          {cohort}
          <p className="text-sm text-muted-foreground">Applications for this cohort are closed.</p>
        </StepScene>
      </AppShell>
    );
  }

  const valid = [
    Boolean(a.intention) && a.calling.trim().length >= 10,
    Boolean(a.experience) && a.sweatLodgeOk,
    a.fullAttendance && a.agreements && a.phone.trim().length >= 5 && a.emergencyName.trim().length >= 2 && a.emergencyPhone.trim().length >= 5,
    true,
  ][step];

  const header = (
    <div className="mx-auto w-full max-w-[36rem] px-4 pt-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <Link to="/retreats/$retreatSlug" params={{ retreatSlug }} className="inline-flex items-center gap-1 font-semibold">
          <ArrowLeft className="h-3.5 w-3.5" /> {retreat.name}
        </Link>
        <span>Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
      </div>
      <StepRail total={STEPS.length} current={step} />
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={cn(buttonStyles.outline, "disabled:opacity-40")}>Back</button>
      {step < STEPS.length - 1 ? (
        <button type="button" disabled={!valid} onClick={() => setStep((s) => s + 1)} className={cn(buttonStyles.primary, "disabled:opacity-50")}>Continue</button>
      ) : (
        <button type="button" disabled={send.isPending} onClick={() => send.mutate()} className={cn(buttonStyles.primary, "disabled:opacity-50")}>
          {send.isPending ? "Sending…" : waitlist ? "Join the waitlist" : "Submit application"}
        </button>
      )}
    </div>
  );

  return (
    <AppShell>
      <StepScene header={header} footer={footer}>
        {cohort}
        {step === 0 && (
          <div className="space-y-6">
            <StepTitle eyebrow="Your intention" title="What are you coming to the mountain for?" />
            <div className="space-y-2">
              {INTENTIONS.map((o) => <OptionRow key={o} label={o} selected={a.intention === o} onClick={() => set("intention", o)} />)}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">What's calling you to this work right now?</span>
              <textarea rows={4} className={field} value={a.calling} onChange={(e) => set("calling", e.target.value)} placeholder="A few honest sentences is enough." />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-6">
            <StepTitle eyebrow="Readiness" title="Where are you starting from?" help="The practices are scaled to meet you where you are. This helps Mike's team hold you well." />
            <div className="space-y-2">
              {EXPERIENCE.map((o) => <OptionRow key={o} label={o} selected={a.experience === o} onClick={() => set("experience", o)} />)}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Health, injuries or medication we should know about <span className="text-muted-foreground">(optional)</span></span>
              <textarea rows={3} className={field} value={a.health} onChange={(e) => set("health", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Dietary needs for Lauren's kitchen <span className="text-muted-foreground">(optional)</span></span>
              <input className={field} value={a.diet} onChange={(e) => set("diet", e.target.value)} />
            </label>
            <OptionRow multi selected={a.sweatLodgeOk} onClick={() => set("sweatLodgeOk", !a.sweatLodgeOk)} label="I understand the retreat includes breathwork, a sweat lodge and cold creek immersion, and I'll share any condition that could affect that." />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <StepTitle eyebrow="Commitment" title="Four days, fully present." />
            <OptionRow multi selected={a.fullAttendance} onClick={() => set("fullAttendance", !a.fullAttendance)} label={`I can attend the full retreat: ${formatRetreatDates(retreat)}`} />
            <OptionRow multi selected={a.agreements} onClick={() => set("agreements", !a.agreements)} label="I agree to the circle agreements: confidentiality, presence and no phones during the work." />
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Your phone number</span>
              <input className={field} value={a.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Emergency contact</span>
                <input className={field} value={a.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Name" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Their phone</span>
                <input className={field} value={a.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} inputMode="tel" />
              </label>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <StepTitle eyebrow="Review" title="Ready to send?" help="Nothing is charged. Mike's team reviews every application and books a short alignment call." />
            <dl className="divide-y divide-hairline rounded-2xl border border-hairline text-sm">
              {[
                ["Intention", a.intention],
                ["Why now", a.calling],
                ["Experience", a.experience],
                ["Health", a.health || "—"],
                ["Diet", a.diet || "—"],
                ["Phone", a.phone],
                ["Emergency contact", `${a.emergencyName} · ${a.emergencyPhone}`],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="whitespace-pre-wrap text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </StepScene>
    </AppShell>
  );
}
