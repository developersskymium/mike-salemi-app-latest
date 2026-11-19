import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, Video, CalendarDays, X } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { SectionHeading } from "@/components/media";
import { buttonStyles, EmptyState, ListSkeleton } from "@/components/ui-kit";
import {
  bookableDays,
  coachingPackages,
  COACHING_SLOTS,
  combineDayAndTime,
  findPackage,
  formatPrice,
  formatSessionDate,
} from "@/content/coaching";
import {
  bookCoachingSession,
  cancelCoachingSession,
  getCoachingSessions,
} from "@/lib/coaching.functions";
import { CheckoutSheet, type CheckoutItem } from "@/components/checkout";
import { CountUp, Reveal } from "@/components/motion-kit";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/coaching/")({
  head: () => ({
    meta: [
      { title: "1:1 Coaching with Mike Salemi — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Book a private coaching session with Mike Salemi, review your technique on video and keep every session note in one place.",
      },
      { property: "og:title", content: "1:1 Coaching with Mike Salemi" },
      {
        property: "og:description",
        content: "Private coaching sessions, technique review and a training block written for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachingPage,
});

function CoachingPage() {
  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(getCoachingSessions);
  const book = useServerFn(bookCoachingSession);
  const cancel = useServerFn(cancelCoachingSession);

  const sessionsQuery = useQuery({
    queryKey: ["coaching-sessions"],
    queryFn: () => fetchSessions(),
  });

  const [packageId, setPackageId] = useState(coachingPackages[1]?.id ?? coachingPackages[0].id);
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const days = useMemo(() => bookableDays(14), []);
  const pkg = findPackage(packageId) ?? coachingPackages[0];

  const bookMutation = useMutation({
    mutationFn: book,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      setConfirmed(true);
      setTime(null);
      setFocus("");
      window.setTimeout(() => setConfirmed(false), 4000);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] }),
  });

  const sessions = sessionsQuery.data ?? [];
  const now = Date.now();
  const upcoming = sessions.filter(
    (s) => s.status !== "cancelled" && new Date(s.scheduled_at).getTime() >= now,
  );
  const past = sessions.filter(
    (s) => s.status === "cancelled" || new Date(s.scheduled_at).getTime() < now,
  );

  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);

  const confirmBooking = () => {
    if (!time) return;
    const scheduled = combineDayAndTime(days[dayIndex], time);
    bookMutation.mutate({
      data: {
        packageId: pkg.id,
        packageName: pkg.name,
        scheduledAt: scheduled.toISOString(),
        durationMinutes: pkg.durationMinutes,
        priceCents: pkg.priceCents,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        focus,
      },
    });
  };

  const submit = () => {
    if (!time) return;
    const scheduled = combineDayAndTime(days[dayIndex], time);
    setCheckout({
      productId: `coaching-${pkg.id}`,
      kind: "coaching",
      name: pkg.name,
      summary: `${pkg.durationMinutes} minutes with Mike · ${scheduled.toLocaleString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
      variant: "Session fee",
      priceCents: pkg.priceCents,
      terms: "Cancel or move your session up to 48 hours before it starts.",
    });
  };

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Coaching"
          title="Work directly with Mike"
          lede="Bring your footage and your sticking point. Every session ends with a written plan you can train tomorrow."
        />

        <Reveal>
          <Section tight>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: upcoming.length, label: "Upcoming" },
                { value: past.filter((s) => s.status !== "cancelled").length, label: "Sessions done" },
                { value: pkg.durationMinutes, label: "Minutes per session" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="raise-soft hairline rounded-3xl bg-surface/60 px-5 py-4 text-center"
                >
                  <p className="text-3xl font-semibold tabular-nums text-foreground">
                    <CountUp value={tile.value} />
                  </p>
                  <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {tile.label}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </Reveal>

        {upcoming.length > 0 && (
          <Section tight>
            <SectionHeading eyebrow="Coming up" title="Your next session" />
            <div className="mt-4 grid gap-3">
              {upcoming.map((session, i) => (
                <Reveal key={session.id} delay={i * 70}>
                  <div className="raise-soft hairline rounded-3xl bg-surface/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {formatSessionDate(session.scheduled_at)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {session.package_name} · {session.duration_minutes} min ·{" "}
                          {session.status === "requested" ? "Awaiting confirmation" : "Confirmed"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.meeting_url && (
                          <a
                            href={session.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                          >
                            <Video className="h-3.5 w-3.5" /> Join
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => cancelMutation.mutate({ data: { id: session.id } })}
                          className="pressable inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline px-4 text-xs font-medium text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                    {session.focus && (
                      <p className="mt-3 border-t border-hairline pt-3 text-sm text-muted-foreground">
                        {session.focus}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        <Section>
          <SectionHeading eyebrow="Step one" title="Choose a package" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {coachingPackages.map((option, i) => {
              const active = option.id === packageId;
              return (
                <Reveal key={option.id} delay={i * 70}>
                  <button
                    type="button"
                    onClick={() => setPackageId(option.id)}
                    aria-pressed={active}
                    className={cn(
                      "pressable h-full w-full rounded-3xl border p-5 text-left transition-all duration-200",
                      active
                        ? "raise border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hairline bg-surface/50 hover:-translate-y-0.5 hover:border-foreground/25",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{option.name}</p>
                      {option.featured && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {formatPrice(option.priceCents)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {option.durationMinutes} minutes
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{option.summary}</p>
                    <ul className="mt-3 space-y-1">
                      {option.includes.map((inc) => (
                        <li key={inc} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </Section>


        <Section>
          <SectionHeading
            eyebrow="Step two"
            title="Pick a time"
            description="Mike coaches Tuesday to Saturday. Times show in your local timezone."
          />
          <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 pb-1">
              {days.map((day, index) => {
                const active = index === dayIndex;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setDayIndex(index);
                      setTime(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "pressable w-16 shrink-0 rounded-2xl border px-2 py-3 text-center transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-hairline bg-surface/50 text-foreground hover:border-foreground/25",
                    )}
                  >
                    <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] opacity-70">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="mt-1 block text-lg font-semibold tabular-nums">{day.getDate()}</span>
                    <span className="block text-[0.6rem] opacity-70">
                      {day.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {COACHING_SLOTS.map((slot) => {
              const active = slot === time;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  aria-pressed={active}
                  className={cn(
                    "pressable rounded-xl border px-3 py-2.5 text-sm font-medium tabular-nums transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-hairline bg-surface/50 text-foreground hover:border-foreground/25",
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="Step three" title="What do you want to work on?" />
          <div className="mt-4">
            <label htmlFor="coaching-focus" className="sr-only">
              Session focus
            </label>
            <textarea
              id="coaching-focus"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="My snatch loses the arm lockout past rep 15, and my left shoulder aches the next day."
              className="w-full rounded-2xl border border-hairline bg-surface/50 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
          </div>

          <div className="raise-soft hairline mt-5 rounded-3xl bg-surface/70 p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Your booking
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium text-foreground">{pkg.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">When</span>
                <span className="font-medium text-foreground">
                  {time
                    ? combineDayAndTime(days[dayIndex], time).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Pick a time above"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-hairline pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatPrice(pkg.priceCents)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!time || bookMutation.isPending}
              className={cn(buttonStyles.primary, "mt-4 w-full justify-center disabled:opacity-50")}
            >
              {bookMutation.isPending ? "Booking…" : "Book this session"}
            </button>
            {time && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Cancel free up to 48 hours before.
              </p>
            )}
          </div>

          {confirmed && (
            <p className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
              Paid and booked. You'll get a calendar invite and a reminder before the session.
            </p>
          )}
          {bookMutation.isError && (
            <p className="mt-3 text-sm text-destructive">
              {(bookMutation.error as Error).message}
            </p>
          )}
        </Section>

        <Section>
          <SectionHeading eyebrow="History" title="Previous sessions" />
          <div className="mt-5">
            {sessionsQuery.isLoading ? (
              <ListSkeleton rows={3} />
            ) : past.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                description="Once you've trained with Mike, every session and its notes live here."
              />
            ) : (
              <ul className="space-y-2">
                {past.map((session, i) => (
                  <Reveal key={session.id} delay={i * 60}>
                    <li className="hairline rounded-2xl bg-surface/50 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {formatSessionDate(session.scheduled_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.package_name}
                          {session.status === "cancelled" ? " · Cancelled" : ""}
                        </p>
                      </div>
                      {session.coach_notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{session.coach_notes}</p>
                      )}
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </Section>


        <Section tight>
          <Container className="measure px-0">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Requests are confirmed by Mike's team, usually within a day. Reschedule or cancel up to 24
              hours before your session.
            </p>
          </Container>
        </Section>
      </div>

      <CheckoutSheet item={checkout} onClose={() => setCheckout(null)} onSuccess={confirmBooking} />
    </AppShell>
  );
}
