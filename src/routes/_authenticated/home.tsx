import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings.functions";
import { AppShell } from "@/components/app-shell";
import { Carousel } from "@/components/carousel";
import {
  EnrolledProgramCard,
  JoinProgramCard,
  ProgramHero,
  useJoinAndOpen,
} from "@/components/home/program-cards";
import { useHomePrograms } from "@/hooks/use-home-programs";
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

function HomePage() {
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settings } = useQuery({ queryKey: ["site-settings"], queryFn: () => fetchSettings() });
  const home = useHomePrograms();
  const { joinAndOpen, pendingKey } = useJoinAndOpen();

  // Hero: the most recently active joined program; otherwise the program the
  // admin features (site settings), a featured flag, or KBL Level I.
  const continuing = home.enrolled[0];
  const featured =
    home.joinable.find((i) => i.slug === settings?.home.featuredSlug) ??
    home.joinable.find((i) => i.featured) ??
    home.joinable[0];

  if (home.isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 px-4 py-6 sm:px-6">
          <div className="h-64 animate-pulse rounded-3xl bg-secondary" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="animate-page space-y-10 px-4 py-6 sm:px-6">
        {continuing ? (
          <ProgramHero item={continuing} mode="continue" onJoin={joinAndOpen} />
        ) : featured ? (
          <ProgramHero
            item={featured}
            mode="join"
            eyebrow={settings?.home.heroEyebrow}
            onJoin={joinAndOpen}
            joining={pendingKey === featured.programKey}
          />
        ) : null}

        <Row title={settings?.home.enrolledTitle || "Your programs"}>
          {home.enrolled.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              You haven't joined a program yet. Pick one below — your progress shows up here.
            </p>
          ) : (
            <Carousel ariaLabel="Your programs" itemClassName="w-[17rem]">
              {home.enrolled.map((item) => (
                <EnrolledProgramCard key={item.key} item={item} />
              ))}
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
        {home.joinable.length > 0 && (
          <Row title="Programs you can join">
            <Carousel ariaLabel="Programs you can join" itemClassName="w-[15rem]">
              {home.joinable.map((item) => (
                <JoinProgramCard
                  key={item.key}
                  item={item}
                  onJoin={joinAndOpen}
                  joining={pendingKey === item.programKey}
                />
              ))}
            </Carousel>
          </Row>
        )}
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
        {home.locked.length > 0 && (
          <Row title="Explore next">
            <Carousel ariaLabel="Programs to unlock" itemClassName="w-[15rem]">
              {home.locked.map((item) => (
                <JoinProgramCard key={item.key} item={item} onJoin={joinAndOpen} />
              ))}
            </Carousel>
          </Row>
        )}
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
