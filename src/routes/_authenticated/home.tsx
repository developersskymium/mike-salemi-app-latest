import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, PlayCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings.functions";
import { AppShell } from "@/components/app-shell";
import { Carousel } from "@/components/carousel";
import { listCourses, getMyCourseProgress } from "@/lib/courses.functions";
import { useProgress } from "@/hooks/use-progress";
import { totalLessons } from "@/content/program";
import { retreats, formatRetreatDates } from "@/content/retreats";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Mike Salemi App" },
      { name: "description", content: "Your enrolled programs, real progress and everything to train next with Mike Salemi." },
      { property: "og:title", content: "Home — Mike Salemi" },
      { property: "og:description", content: "Your enrolled programs, real progress and everything to train next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type Course = Awaited<ReturnType<typeof listCourses>>[number];

function HomePage() {
  const fetchCourses = useServerFn(listCourses);
  const fetchProgress = useServerFn(getMyCourseProgress);
  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses() });
  const { data: progress = {} } = useQuery({ queryKey: ["course-progress"], queryFn: () => fetchProgress() });
  const { data: kblRows = [] } = useProgress(true);
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: () => fetchSettings() });

  const kblDone = kblRows.length;
  const enrolled = [
    ...(kblDone > 0
      ? [{ key: "kbl", name: "Kettlebell Lifestyle", image: null as string | null, done: kblDone, total: totalLessons, last: kblRows.reduce((m, r) => (r.completed_at > m ? r.completed_at : m), ""), to: "kbl" as const }]
      : []),
    ...courses
      .filter((c) => progress[c.id])
      .map((c) => ({ key: c.id, name: c.name, image: c.image, done: progress[c.id].completed, total: c.lessonCount, last: progress[c.id].lastAt, to: c.slug })),
  ].sort((a, b) => b.last.localeCompare(a.last));

  const featured = courses.find((c) => c.slug === enrolled[0]?.to) ?? courses.find((c) => c.slug === settings?.home.featuredSlug) ?? courses.find((c) => c.featured) ?? courses[0];
  const ready = courses.filter((c) => c.access !== "locked");
  const locked = courses.filter((c) => c.access === "locked");

  return (
    <AppShell>
      <div className="animate-page space-y-10 px-4 py-6 sm:px-6">
        {featured && (
          <section className="relative overflow-hidden rounded-3xl border border-border">
            {featured.image && <img src={featured.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
            <div className="relative max-w-xl p-6 sm:p-10">
              <p className="eyebrow text-primary">{enrolled.length ? "Continue training" : settings?.home.heroEyebrow || "Featured program"}</p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{featured.name}</h1>
              {featured.summary && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{featured.summary}</p>}
              <Link to="/courses/$courseSlug" params={{ courseSlug: featured.slug }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                <PlayCircle className="h-4 w-4" /> {enrolled.length ? "Resume" : "Start"}
              </Link>
            </div>
          </section>
        )}

        <Row title={settings?.home.enrolledTitle || "Your enrolled programs"}>
          {enrolled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start any program below — your progress will show up here.</p>
          ) : (
            <Carousel ariaLabel="Enrolled programs" itemClassName="w-[17rem]">
              {enrolled.map((e) => {
                const pct = Math.min(100, Math.round((e.done / Math.max(1, e.total)) * 100));
                const body = (
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {e.image ? <img src={e.image} alt={e.name} className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center bg-secondary font-bold text-primary">KBL</div>}
                    <div className="p-4">
                      <p className="truncate text-sm font-semibold text-foreground">{e.name}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-2 text-xs text-muted-foreground">{e.done} of {e.total} lessons · {pct}%</p>
                    </div>
                  </div>
                );
                return e.to === "kbl" ? <Link key={e.key} to="/immersion">{body}</Link> : <Link key={e.key} to="/courses/$courseSlug" params={{ courseSlug: e.to }}>{body}</Link>;
              })}
            </Carousel>
          )}
        </Row>

        <section aria-label="Upcoming activity">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Upcoming activity</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { k: "Live call · Preview", t: "Monthly Q&A with Mike", d: "Date to be announced" },
              { k: "Invitation · Preview", t: "Community workout drop", d: "Date to be announced" },
              ...retreats.slice(0, 1).map((r) => ({ k: "Retreat", t: r.name, d: `${formatRetreatDates(r)} · ${r.location}` })),
            ].map((a) => (
              <div key={a.t} className="rounded-2xl border border-border bg-surface p-4">
                <p className="eyebrow text-primary">{a.k}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{a.t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.d}</p>
              </div>
            ))}
          </div>
        </section>
        {ready.length > 0 && <Row title="Ready for you"><PosterRail items={ready} /></Row>}
        <Row title="Retreats & gatherings" seeAll="/retreats">
          <Carousel ariaLabel="Retreats" itemClassName="w-[17rem]">
            {retreats.map((r) => (
              <Link key={r.id} to="/retreats/$retreatSlug" params={{ retreatSlug: r.slug }} className="group block overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="overflow-hidden">
                  <img src={r.image} alt={r.name} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{formatRetreatDates(r)} · {r.location}</p>
                </div>
              </Link>
            ))}
          </Carousel>
        </Row>
        {locked.length > 0 && <Row title="Explore next"><PosterRail items={locked} /></Row>}
      </div>
    </AppShell>
  );
}

function Row({ title, children, seeAll = "/programs" }: { title: string; children: React.ReactNode; seeAll?: "/programs" | "/retreats" }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Link to={seeAll} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">See all <ArrowRight className="h-3 w-3" /></Link>
      </div>
      {children}
    </section>
  );
}

function PosterRail({ items }: { items: Course[] }) {
  return (
    <Carousel ariaLabel="Programs" itemClassName="w-[15rem]">
      {items.map((c) => (
        <Link key={c.id} to="/courses/$courseSlug" params={{ courseSlug: c.slug }} className="group block overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-hidden">
            {c.image ? <img src={c.image} alt={c.name} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="aspect-[16/10] bg-secondary" />}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.lessonCount} lessons · {c.access === "locked" ? "Locked" : "Included"}</p>
          </div>
        </Link>
      ))}
    </Carousel>
  );
}
