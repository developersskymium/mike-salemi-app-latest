import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck2, Compass, Layers3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Section } from "@/components/page-kit";
import { courses } from "@/content/program";

export const Route = createFileRoute("/_authenticated/program")({
  // Legacy KBL hub: Immersion is the current KBL entry point.
  beforeLoad: () => {
    throw redirect({ to: "/immersion", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Kettlebell Lifestyle — Choose your path | Mike Salemi" },
      { name: "description", content: "Start Kettlebell Lifestyle as a guided day-by-day Immersion or train at your own pace with Self-Guided Level 1 and Level 2." },
      { property: "og:title", content: "Kettlebell Lifestyle — Choose your path" },
      { property: "og:description", content: "Immersion or Self-Guided: two ways into Mike Salemi's flagship kettlebell program." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramHub,
});

function ProgramHub() {
  const hero = courses[0]?.image;
  return (
    <AppShell>
      <div className="animate-page">
        <section className="relative overflow-hidden rounded-b-3xl">
          {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-24 sm:px-8">
            <p className="eyebrow text-primary">Flagship program</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Kettlebell Lifestyle</h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">Mike's complete kettlebell journey. Pick how you want to train — you can switch any time.</p>
          </div>
        </section>

        <Section>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <Link to="/immersion" className="pressable glass-panel group flex flex-col rounded-3xl p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><CalendarCheck2 className="h-6 w-6" /></span>
              <p className="eyebrow mt-5 text-primary">Guided</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Immersion</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Follow the program day by day. Daily progress, readiness checks, your schedule and phase-by-phase milestones.</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open Immersion <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>

            <div className="glass-panel flex flex-col rounded-3xl p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary ring-1 ring-border"><Compass className="h-6 w-6" /></span>
              <p className="eyebrow mt-5 text-primary">At your pace</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Self-Guided</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Open reference to every lesson. Choose your level:</p>
              <div className="mt-5 grid gap-3">
                {courses.map((c) => (
                  <Link key={c.slug} to="/self-guided/$courseSlug" params={{ courseSlug: c.slug }} className="pressable group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                    <img src={c.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{c.level.replace("Level I", "Level 1").replace("Level 1I", "Level 2")}</p>
                      <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                    </div>
                    <Layers3 className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
