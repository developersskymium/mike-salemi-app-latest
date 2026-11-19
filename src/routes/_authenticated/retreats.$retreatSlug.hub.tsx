import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, MapPin, Users, X } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { ProgressRing, SectionHeading } from "@/components/media";
import { buttonStyles } from "@/components/ui-kit";
import { getRetreatChecklist, setRetreatChecklistItem } from "@/lib/entitlements.functions";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useSession } from "@/hooks/use-session";
import { findRetreat, formatRetreatDates, retreatWindow, type ChecklistItem } from "@/content/retreats";
import { retreatGallery } from "@/content/retreat-gallery";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/retreats/$retreatSlug/hub")({
  head: ({ params }) => {
    const retreat = findRetreat(params.retreatSlug);
    const title = retreat ? `${retreat.name} hub — Mike Salemi App` : "Retreat hub — Mike Salemi App";
    return {
      meta: [
        { title },
        { name: "description", content: "Your retreat countdown, prerequisites, packing list, itinerary and travel details." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Everything you need before you travel." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: RetreatHubPage,
});

type ChecklistRow = { retreat_id: string; item_id: string; done: boolean };

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => new Date('2026-10-01T12:00:00Z').getTime());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(iso).getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

function RetreatHubPage() {
  const { retreatSlug } = Route.useParams();
  const retreat = findRetreat(retreatSlug);
  const { user } = useSession();
  const { has } = useEntitlements();
  const queryClient = useQueryClient();
  const fetchChecklist = useServerFn(getRetreatChecklist);
  const saveItem = useServerFn(setRetreatChecklistItem);

  const { data: rows } = useQuery({
    queryKey: ["retreat-checklist"],
    queryFn: () => fetchChecklist() as Promise<ChecklistRow[]>,
    enabled: Boolean(user),
  });

  const toggle = useMutation({
    mutationFn: (input: { retreatId: string; itemId: string; done: boolean }) => saveItem({ data: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["retreat-checklist"] });
      const previous = queryClient.getQueryData<ChecklistRow[]>(["retreat-checklist"]);
      queryClient.setQueryData<ChecklistRow[]>(["retreat-checklist"], (list = []) => [
        ...list.filter((r) => !(r.retreat_id === input.retreatId && r.item_id === input.itemId)),
        { retreat_id: input.retreatId, item_id: input.itemId, done: input.done },
      ]);
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["retreat-checklist"], ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["retreat-checklist"] }),
  });

  const done = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) if (row.done && row.retreat_id === retreat?.id) set.add(row.item_id);
    return set;
  }, [rows, retreat?.id]);

  const countdown = useCountdown(retreat?.startsAt ?? new Date().toISOString());

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

  if (!has(`retreat-${retreat.id}`)) {
    return (
      <AppShell>
        <Container className="section">
          <h1 className="title-page text-foreground">Not yet yours</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The hub opens once your place on {retreat.name} is confirmed.
          </p>
          <Link
            to="/retreats/$retreatSlug"
            params={{ retreatSlug: retreat.slug }}
            className={cn(buttonStyles.primary, "mt-6")}
          >
            View the retreat
          </Link>
        </Container>
      </AppShell>
    );
  }

  const allItems = [...retreat.prerequisites, ...retreat.packing];
  const percent = allItems.length
    ? Math.round((allItems.filter((i) => done.has(i.id)).length / allItems.length) * 100)
    : 0;
  const phase = retreatWindow(retreat);

  function ChecklistBlock({ title, items }: { title: string; items: ChecklistItem[] }) {
    const complete = items.filter((i) => done.has(i.id)).length;
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="numeric text-xs text-muted-foreground">
            {complete}/{items.length}
          </p>
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => {
            const checked = done.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle.mutate({ retreatId: retreat!.id, itemId: item.id, done: !checked })}
                  className={cn(
                    "tap flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left",
                    checked ? "border-primary/35 bg-primary/8" : "border-hairline bg-surface/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-medium", checked ? "text-foreground" : "text-foreground")}>
                      {item.label}
                    </span>
                    {item.help && <span className="mt-0.5 block text-xs text-muted-foreground">{item.help}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <AppShell>
      <ContextBar
        backTo="/retreats"
        backLabel="Back to retreats"
        title={`${retreat.name} — your hub`}
        meta={formatRetreatDates(retreat)}
        progress={percent}
      />

      <div className="animate-page">
        <Container className="pt-4">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-hairline">
            <img
              src={retreat.image}
              alt={retreat.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
            <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="eyebrow text-white/70">
                  {phase === "before" ? "Countdown" : phase === "during" ? "Happening now" : "Integration"}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{retreat.name}</h1>
                <p className="mt-1 text-sm text-white/75">
                  {formatRetreatDates(retreat)} · {retreat.location}
                </p>

                {phase === "before" ? (
                  <div className="mt-4 flex gap-2">
                    {[
                      ["Days", countdown.days],
                      ["Hours", countdown.hours],
                      ["Minutes", countdown.minutes],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="min-w-[4.25rem] rounded-2xl bg-white/12 px-3 py-2 text-center backdrop-blur-md"
                      >
                        <p className="numeric text-xl font-semibold text-white">{value as number}</p>
                        <p className="text-[0.625rem] uppercase tracking-wide text-white/65">{label as string}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-lg font-semibold text-white">
                    {phase === "during" ? "You're on the land" : "Welcome home"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-white/12 p-4 backdrop-blur-md lg:justify-self-end">
                <ProgressRing percent={percent} size={62} stroke={6} />
                <div>
                  <p className="text-sm font-semibold text-white">Preparation</p>
                  <p className="text-xs text-white/70">
                    {allItems.filter((i) => done.has(i.id)).length} of {allItems.length} done
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {[
              ["checklists", "Checklists"],
              ["gallery", "Gallery"],
              ["itinerary", "Itinerary"],
              ["guides", "Guides"],
              ["travel", "Travel"],
              ["documents", "Documents"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="tap shrink-0 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </Container>

        <Section id="checklists">
          <SectionHeading eyebrow="Before you travel" title="Your checklists" />
          {allItems.length > 0 ? (
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <ChecklistBlock title="Prerequisites" items={retreat.prerequisites} />
              <ChecklistBlock title="Packing list" items={retreat.packing} />
            </div>
          ) : (
            <p className="measure mt-3 text-sm text-muted-foreground">
              Your preparation guide and packing list arrive after acceptance.
            </p>
          )}
        </Section>

        <Section id="gallery">
          <SectionHeading eyebrow="What it looks like" title="On the land" />
          <RetreatGallery />
        </Section>

        <Section id="travel">
          <SectionHeading eyebrow="Getting there" title="Location and travel" />
          <div className="steel-card mt-5 rounded-3xl p-5">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {retreat.address}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Travel details are shared after acceptance.
            </p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(retreat.mapQuery)}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonStyles.outline, "mt-4")}
            >
              Open in Maps
            </a>
          </div>
        </Section>

        {retreat.itinerary.length > 0 && (
        <Section id="itinerary">
          <SectionHeading eyebrow="The four days" title="Itinerary" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {retreat.itinerary.map((day) => (
              <div key={day.id} className="steel-card rounded-3xl p-5">
                <p className="eyebrow text-primary">{day.label}</p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{day.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {day.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
        )}


        <Section id="guides">
          <SectionHeading eyebrow="Who holds the space" title="Your guides" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {retreat.facilitators.map((person) => (
              <div key={person.name} className="steel-card flex items-center gap-3 rounded-3xl p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                  <Users className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{person.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{person.role}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        {retreat.downloads.length > 0 && (
        <Section id="documents">
          <SectionHeading eyebrow="Documents" title="Downloads" />
          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {retreat.downloads.map((doc) => (
              <li
                key={doc.id}
                className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface/50 px-4 py-3"
              >
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{doc.label}</span>
                  <span className="block text-xs text-muted-foreground">{doc.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
        )}

        <Section>
          <SectionHeading eyebrow="After the retreat" title="Integration support" />
          <ul className="mt-5 space-y-2">
            {retreat.aftercare.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {line}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}

/** Retreat photography with a lightbox — gives the hub a sense of place. */
function RetreatGallery() {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % retreatGallery.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + retreatGallery.length) % retreatGallery.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {retreatGallery.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setOpen(i)}
            className={cn(
              "tap group relative isolate overflow-hidden rounded-3xl border border-hairline",
              i === 0 && "sm:col-span-2 sm:row-span-2 lg:col-span-2",
            )}
          >
            <div className={cn("w-full", i === 0 ? "aspect-[4/3]" : "aspect-[4/3]")}>
              <img
                src={photo.src}
                alt={photo.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:scale-[1.04]"
              />
            </div>
            <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-left text-xs font-medium text-white">
              {photo.caption}
            </span>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={retreatGallery[open].caption}
          className="animate-pop fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            aria-label="Close gallery"
            onClick={() => setOpen(null)}
            className="tap absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <figure className="max-h-full w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={retreatGallery[open].src}
              alt={retreatGallery[open].caption}
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-white/80">
              {retreatGallery[open].caption}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
