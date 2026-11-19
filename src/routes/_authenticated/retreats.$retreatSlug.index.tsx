import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, MapPin, Users, CalendarDays, Download, ArrowRight, Sparkles } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { Pill, SectionHeading } from "@/components/media";
import { buttonStyles } from "@/components/ui-kit";
import { useEntitlements } from "@/hooks/use-entitlements";
import { findRetreat, formatRetreatDates } from "@/content/retreats";
import { useRetreats } from "@/hooks/use-retreats";
import { cn } from "@/lib/utils";
import { retreatFullGallery } from "@/content/retreat-gallery";
import { RetreatPhotoGrid, RetreatPhotoStrip } from "@/components/retreat-photos";

export const Route = createFileRoute("/_authenticated/retreats/$retreatSlug/")({
  head: ({ params }) => {
    const retreat = findRetreat(params.retreatSlug);
    const title = retreat ? `${retreat.name} — Men of Movement Retreat` : "Retreat — Mike Salemi App";
    const description = retreat?.tagline ?? "A four-day Men of Movement retreat in Mount Shasta.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RetreatDetailPage,
});

function RetreatDetailPage() {
  const { retreatSlug } = Route.useParams();
  const retreat = useRetreats().find(retreatSlug);
  const { has } = useEntitlements();
  const navigate = useNavigate();

  if (!retreat) {
    return (
      <AppShell>
        <Container className="section">
          <p className="text-sm text-muted-foreground">That retreat does not exist.</p>
          <Link to="/retreats" className={cn(buttonStyles.outline, "mt-4")}>
            All retreats
          </Link>
        </Container>
      </AppShell>
    );
  }

  const unlocked = has(`retreat-${retreat.id}`);
  const apply = () => navigate({ to: "/retreats/$retreatSlug/apply", params: { retreatSlug: retreat.slug } });
  const photos = [
    { src: retreat.image, caption: `${retreat.name} in ${retreat.location}` },
    ...retreatFullGallery.filter((p) => p.src !== retreat.image),
  ];


  return (
    <AppShell>
      <ContextBar
        backTo="/retreats"
        backLabel="Back to retreats"
        title={retreat.name}
        meta={`${retreat.season} · ${formatRetreatDates(retreat)}`}
        action={
          unlocked ? (
            <Link
              to="/retreats/$retreatSlug/hub"
              params={{ retreatSlug: retreat.slug }}
              className="pressable inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Retreat hub
            </Link>
          ) : (
            <button
              type="button"
              onClick={apply}
              disabled={retreat.status === "past"} className="pressable inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {retreat.status === "open" ? "Apply" : retreat.status === "past" ? "Finished" : "Waitlist"}
            </button>
          )
        }
      />

      <div className="animate-page">
        <Container className="section-tight">
          <p className="eyebrow text-primary">{retreat.season} · Men of Movement</p>
          <h1 className="mt-1.5 text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[2.75rem]">
            {retreat.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{retreat.tagline}</p>
          <ul className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {[`${retreat.capacity} men max`, retreat.location, "Fixed cohort dates", "By application"].map((t) => (
              <li key={t} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                <Check className="h-3.5 w-3.5 text-primary" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <RetreatPhotoGrid photos={photos} />
          </div>
        </Container>

        <Container className="grid gap-10 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="min-w-0">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-hairline ring-1 ring-hairline sm:grid-cols-4">
              <Fact icon={<CalendarDays className="h-3.5 w-3.5 text-primary" />} label="Dates" value={formatRetreatDates(retreat)} />
              <Fact icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} label="Length" value={retreat.durationLabel} />
              <Fact icon={<Users className="h-3.5 w-3.5 text-primary" />} label="Group" value={`${retreat.capacity} men max`} />
              <Fact
                icon={<MapPin className="h-3.5 w-3.5 text-primary" />}
                label="Where"
                value="Mount Shasta, CA"
                href={`https://maps.google.com/?q=${encodeURIComponent(retreat.mapQuery)}`}
              />
            </dl>

            <h2 className="mt-10 text-xl font-semibold text-foreground">What this retreat is</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{retreat.description}</p>

            <h2 className="mt-10 text-xl font-semibold text-foreground">What you walk away with</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {retreat.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 rounded-2xl border border-hairline bg-surface/50 px-4 py-3 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {h}
                </li>
              ))}
            </ul>

            {retreat.itinerary.length > 0 && (
              <>
                <h2 className="mt-10 text-xl font-semibold text-foreground">How the four days unfold</h2>
                <ol className="mt-4 space-y-3">
                  {retreat.itinerary.map((day, index) => (
                    <li key={day.id} className="relative rounded-3xl border border-hairline bg-surface/50 p-5 pl-16">
                      <span className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <p className="eyebrow text-primary">{day.label}</p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">{day.title}</h3>
                      <ul className="mt-2.5 space-y-1.5">
                        {day.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </>
            )}

            <h2 className="mt-10 text-xl font-semibold text-foreground">More from the mountain</h2>
            <div className="mt-4">
              <RetreatPhotoStrip photos={photos.slice(5)} />
            </div>
          </div>

          <aside className="max-lg:order-first lg:sticky lg:top-24 lg:h-fit">
            <div className="steel-card rounded-3xl p-5 sm:p-6">
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
                {retreat.status === "open" ? "Applications open" : retreat.status === "past" ? "Finished" : "Waitlist"}
              </span>
              <p className="mt-3 text-2xl font-semibold text-foreground">{formatRetreatDates(retreat)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{retreat.durationLabel} · {retreat.price}</p>
              {unlocked ? (
                <Link to="/retreats/$retreatSlug/hub" params={{ retreatSlug: retreat.slug }} className={cn(buttonStyles.primary, "mt-5 w-full justify-center")}>
                  Open retreat hub
                </Link>
              ) : (
                <button type="button" onClick={apply} disabled={retreat.status === "past"} className={cn(buttonStyles.primary, "mt-5 w-full justify-center")}>
                  {retreat.status === "open" ? "Apply for your place" : retreat.status === "past" ? "Retreat finished" : "Join the waitlist"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {[
                  "Dates and itinerary set by Mike's team",
                  "A short call to talk through fit",
                  "Payment details shared after acceptance",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-3xl border border-hairline bg-surface/40 p-5 max-lg:hidden">
              <p className="text-sm font-semibold text-foreground">How it comes together</p>
              <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
                {["Send your application.", "Mike's team calls to talk through fit.", "Accepted men get prep, travel and payment details."].map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </Container>

        <Section>
          <SectionHeading eyebrow="Before you arrive" title="Preparation" />
          {retreat.prerequisites.length > 0 || retreat.packing.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {[...retreat.prerequisites, ...retreat.packing].map((item) => (
                <li key={item.id}>
                  <Pill>{item.label}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="measure mt-3 text-sm text-muted-foreground">
              A detailed guide on what to bring and how to prepare is shared after you're accepted.
            </p>
          )}
        </Section>


        <Section>
          <SectionHeading eyebrow="Who holds the space" title="Facilitators" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {retreat.facilitators.map((f) => (
              <div key={f.name} className="steel-card rounded-3xl p-5">
                <p className="text-sm font-semibold text-foreground">{f.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.role}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="You do not go home empty" title="After the retreat" />
          <ul className="mt-5 space-y-2">
            {retreat.aftercare.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/courses/$courseSlug" params={{ courseSlug: "men-of-movement" }} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Open Men of Movement: Preparation <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>

        {retreat.downloads.length > 0 && (
          <Section>
            <SectionHeading eyebrow="Paperwork" title="Documents" />
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {retreat.downloads.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface/50 px-4 py-3"
                >
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section>
          <SectionHeading eyebrow="Before you commit" title="Questions men ask" />
          <div className="mt-5 space-y-2">
            {retreat.faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-hairline bg-surface/50 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {!unlocked && (
          <Section>
            <div className="steel-card rounded-3xl p-6 text-center sm:p-10">
              <h2 className="title-section text-foreground">
                {retreat.status === "open" ? "Twenty places. That's it." : "The room is full for now."}
              </h2>
              <p className="measure mx-auto mt-2 text-sm text-muted-foreground">
                {retreat.status === "open"
                  ? "Apply and Mike's team will be in touch to talk through fit, travel and payment."
                  : "Join the waitlist and you'll be first to hear when a place opens or the next dates land."}
              </p>
              <button
                type="button"
                onClick={apply}
                disabled={retreat.status === "past"} className={cn(buttonStyles.primary, "mt-5")}
              >
                {retreat.status === "open" ? "Apply for your place" : retreat.status === "past" ? "Retreat finished" : "Join the waitlist"}
              </button>
            </div>
          </Section>
        )}
      </div>

    </AppShell>
  );
}

function Fact({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{value}</dd>
    </>
  );
  const className = "block rounded-2xl border border-hairline bg-surface/50 px-4 py-3";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cn(className, "transition-colors hover:border-foreground/25")}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
