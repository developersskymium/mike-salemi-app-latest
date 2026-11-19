import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Pill, SectionHeading } from "@/components/media";
import { useEntitlements } from "@/hooks/use-entitlements";
import { formatRetreatDates } from "@/content/retreats";
import { useRetreats } from "@/hooks/use-retreats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/retreats/")({
  head: () => ({
    meta: [
      { title: "Men of Movement Retreats — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Four-day retreats in Mount Shasta capped at 20 men: movement, ceremony, sweat lodge and honest brotherhood.",
      },
      { property: "og:title", content: "Men of Movement Retreats" },
      { property: "og:description", content: "Four days in Mount Shasta. Twenty men. Movement, ceremony, brotherhood." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RetreatsPage,
});

function RetreatsPage() {
  const { has } = useEntitlements();
  const { retreats } = useRetreats();

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Men of Movement"
          title="Retreats"
          lede="Four days in Mount Shasta with nineteen other men. Movement in the morning, ceremony at night, and the kind of conversation most men never get to have."
          meta={`${retreats.length} cohorts · capped at 20 men`}
        />

        <Section>
          <div className="grid gap-5 lg:grid-cols-2">
            {retreats.map((retreat) => {
              const unlocked = has(`retreat-${retreat.id}`);
              return (
                <article key={retreat.id} className="steel-card overflow-hidden rounded-3xl">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={retreat.image}
                      alt={`${retreat.name} retreat in ${retreat.location}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/70">
                        {retreat.season}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{retreat.name}</h2>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill>{formatRetreatDates(retreat)}</Pill>
                      <Pill>{retreat.status === "open" ? "Applications open" : retreat.status === "past" ? "Past cohort" : "Waitlist"}</Pill>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{retreat.tagline}</p>
                    <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" /> {retreat.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {retreat.capacity} men maximum
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        to="/retreats/$retreatSlug"
                        params={{ retreatSlug: retreat.slug }}
                        className={cn(
                          "pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                          "bg-primary text-primary-foreground",
                        )}
                      >
                        View retreat <ArrowRight className="h-4 w-4" />
                      </Link>
                      {unlocked && (
                        <Link
                          to="/retreats/$retreatSlug/hub"
                          params={{ retreatSlug: retreat.slug }}
                          className="pressable inline-flex h-10 items-center gap-2 rounded-full border border-hairline px-4 text-sm font-semibold text-foreground"
                        >
                          Your retreat hub
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="What it is not" title="No performance, no forcing" />
          <p className="measure mt-3 text-sm text-muted-foreground">
            Around half the men who come have never done work like this. Everything is scalable, nothing is forced, and
            you decide how far you go. You leave with practices you can keep, a brotherhood group, and a follow-up call
            a week later.
          </p>
        </Section>
      </div>
    </AppShell>
  );
}
