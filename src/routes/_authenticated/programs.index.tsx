import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Search } from "lucide-react";
import { courses as kblCourses } from "@/content/program";
import { useMemo, useState } from "react";
import { listCourses } from "@/lib/courses.functions";
import { getSiteSettings, SETTING_DEFAULTS } from "@/lib/site-settings.functions";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { ProgramCard } from "@/components/program-promo";
import { externalPrograms } from "@/content/programs";
import { DatabaseProgramCard } from "@/components/database-program-card";

export const Route = createFileRoute("/_authenticated/programs/")({
  head: () => ({
    meta: [
      { title: "More Programs — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Retreats, coaching and courses from Mike Salemi that sit alongside Kettlebell Lifestyle — Mastering the Kettlebell, The Grounded King, Men of Movement and more.",
      },
      { property: "og:title", content: "More Programs — Kettlebell Lifestyle" },
      { property: "og:description", content: "Retreats, coaching and courses from Mike Salemi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

export const VERTICALS = [
  { id: "mastery", eyebrow: "Technique & progressions", title: "Kettlebell Mastery", note: "Technique, progressions and the details that make every lift click." },
  { id: "athletic", eyebrow: "Strength & conditioning", title: "Athletic Performance", note: "Structured training blocks for strength, power and movement capacity." },
  { id: "mind-body", eyebrow: "Recovery & inner work", title: "Mind-Body, Longevity & Retreats", note: "Inner work, recovery and in-person journeys with Mike." },
] as const;

const VERTICAL_OF: Record<string, (typeof VERTICALS)[number]["id"]> = {
  "mastering-the-kettlebell": "mastery",
  "kettlebell-roadmap": "mastery",
  "what-your-kettlebell-swing-is-missing": "mastery",
  "free-6-video-kettlebell-mini-series": "mastery",
  "athleticism-4-life": "athletic",
  "the-training-room": "athletic",
  "working-in": "mind-body",
  "men-of-movement": "mind-body",
  "the-path-to-inspired-action": "mind-body",
};

const HIDDEN_FROM_CATALOG = new Set(["kettlebell-roadmap", "the-training-room"]);

function ProgramsPage() {
  const fetchCourses = useServerFn(listCourses);
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses() });
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: () => fetchSettings() });
  const copy = settings?.programs_page ?? SETTING_DEFAULTS.programs_page;
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? courses.filter((course) => [course.name, course.summary, ...course.highlights].some((value) => value?.toLowerCase().includes(needle))) : courses;
  }, [courses, query]);
  // Kettlebell Roadmap lives under Tools / Free Resources; The Training Room is archived from the catalog (duplicates Athleticism 4 Life). Data is untouched.
  const listed = filtered.filter((course) => !HIDDEN_FROM_CATALOG.has(course.slug));
  const accessible = listed.filter((course) => course.access !== "locked");
  const locked = listed.filter((course) => course.access === "locked");
  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Beyond the program"
          title={copy.title || "Choose your next program"}
          lede={copy.intro || "Every course, guided experience and deeper practice in one place. Start with what supports you now."}
        />

        <Section>
          <label className="mb-5 flex max-w-xl items-center gap-3 rounded-xl border border-input bg-surface px-4 py-3 focus-within:border-primary">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programs, skills or outcomes" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          {(!query || "kettlebell lifestyle immersion self-guided".includes(query.trim().toLowerCase())) && (
            <CatalogGroup eyebrow={copy.kblBadge || "Flagship program"} title={copy.kblTitle || "Kettlebell Lifestyle"}>
              <Link to="/immersion" className="pressable group relative block overflow-hidden rounded-3xl">
                <img src={kblCourses[0]?.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
                <div className="relative max-w-xl p-7 sm:p-10">
                  <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mike Salemi · Flagship</span>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Kettlebell Lifestyle</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.kblCopy || "The complete kettlebell journey — follow it day by day or train at your own pace across two levels."}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-foreground">
                    {["2 levels", "4 phases", "Immersion or Self-Guided"].map((s) => <span key={s} className="rounded-full border border-border bg-surface/80 px-3 py-1">{s}</span>)}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Enter program <ArrowRight className="h-4 w-4" /></span>
                </div>
              </Link>
            </CatalogGroup>
          )}
          {VERTICALS.map((v) => {
            const items = [...accessible, ...locked].filter((course) => (course.catalogGroup ?? VERTICAL_OF[course.slug] ?? "mind-body") === v.id);
            if (!items.length) return null;
            return (
              <CatalogGroup key={v.id} eyebrow={v.eyebrow} title={v.title}>
                <p className="-mt-2 mb-4 max-w-2xl text-sm text-muted-foreground">{v.note}</p>
                <div className="seq grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((course) => <DatabaseProgramCard key={course.id} course={course} />)}</div>
              </CatalogGroup>
            );
          })}
          {/* Hidden for now — re-enable by restoring the condition: {!query && <CatalogGroup ...} */}
          {false && <CatalogGroup eyebrow="Go deeper" title="Coaching, retreats and specializations"><div className="seq grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{externalPrograms.filter((program) => !courses.some((course) => course.slug === program.slug)).map((program) => <ProgramCard key={program.id} program={program} />)}</div></CatalogGroup>}
        </Section>

        <Section tight>
          <Container className="measure px-0">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Everything here lives inside your account. Open a program to read the full breakdown, and
              anything you already have access to opens straight into the experience.
            </p>
          </Container>
        </Section>

      </div>
    </AppShell>
  );
}

function CatalogGroup({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="mb-10 last:mb-0"><p className="eyebrow text-primary">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2><div className="mt-4">{children}</div></section>;
}
