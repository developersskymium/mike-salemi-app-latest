import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, BellRing, Clock, Eye, MailX, MoonStar, SkipForward, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { EmptyState, Spinner, buttonStyles } from "@/components/ui-kit";
import { CountUp, Reveal } from "@/components/motion-kit";
import { clearReminderHistory, listReminderEvents, type ReminderEvent } from "@/lib/reminder-log.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reminders/history")({
  head: () => ({
    meta: [
      { title: "Reminder history — Mike Salemi App" },
      {
        name: "description",
        content:
          "See every training reminder the app sent you: when it went out, whether you opened it, and anything that failed.",
      },
      { property: "og:title", content: "Reminder history — Mike Salemi App" },
      { property: "og:description", content: "Every reminder that was sent, opened, snoozed, skipped or failed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReminderHistoryPage,
});

const STATUS_META: Record<
  string,
  { label: string; icon: typeof BellRing; tone: string }
> = {
  sent: { label: "Sent", icon: BellRing, tone: "text-primary bg-primary/10" },
  opened: { label: "Opened", icon: Eye, tone: "text-emerald-600 bg-emerald-500/10" },
  failed: { label: "Failed", icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  snoozed: { label: "Snoozed", icon: MoonStar, tone: "text-amber-600 bg-amber-500/10" },
  skipped: { label: "Skipped", icon: SkipForward, tone: "text-muted-foreground bg-subtle" },
};

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReminderHistoryPage() {
  const queryClient = useQueryClient();
  const fetchEvents = useServerFn(listReminderEvents);
  const clearAll = useServerFn(clearReminderHistory);

  const { data, isLoading } = useQuery({ queryKey: ["reminder-events"], queryFn: () => fetchEvents() });
  const events = (data ?? []) as ReminderEvent[];

  const stats = useMemo(() => {
    const count = (s: string) => events.filter((e) => e.status === s).length;
    return {
      sent: count("sent") + count("opened"),
      opened: count("opened"),
      failed: count("failed"),
      muted: count("snoozed") + count("skipped"),
    };
  }, [events]);

  const clearMutation = useMutation({
    mutationFn: () => clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-events"] });
      toast.success("Reminder history cleared");
    },
    onError: () => toast.error("Couldn't clear the history"),
  });

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Troubleshooting"
          title="Reminder history"
          lede="Every nudge this app tried to deliver — when it went out, whether you opened it, and anything that failed on the way."
        />

        {isLoading ? (
          <Section>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading your reminder history…
            </div>
          </Section>
        ) : (
          <>
            <Section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Delivered", value: stats.sent, icon: BellRing },
                  { label: "Opened", value: stats.opened, icon: Eye },
                  { label: "Failed", value: stats.failed, icon: MailX },
                  { label: "Snoozed / skipped", value: stats.muted, icon: MoonStar },
                ].map((tile, i) => (
                  <Reveal key={tile.label} delay={i * 60}>
                    <div className="rounded-3xl border border-hairline bg-surface p-4 raise-soft">
                      <tile.icon className="h-4 w-4 text-primary" />
                      <p className="numeric mt-3 text-2xl font-semibold text-foreground">
                        <CountUp value={tile.value} />
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tile.label}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Section>

            <Section>
              {events.length === 0 ? (
                <EmptyState
                  title="No reminders yet"
                  description="Once a training reminder fires, it shows up here with its delivery result so you can see exactly what happened."
                  action={
                    <Link to="/schedule" className={buttonStyles.primary}>
                      Set up reminders
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-3xl border border-hairline bg-surface raise-soft">
                  <ul className="divide-y divide-border">
                    {events.map((event, i) => {
                      const meta = STATUS_META[event.status] ?? STATUS_META.sent;
                      const Icon = meta.icon;
                      return (
                        <Reveal key={event.id} delay={Math.min(i, 8) * 40}>
                          <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3.5">
                            <span className={cn("grid h-9 w-9 place-items-center rounded-full", meta.tone)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                              {event.body ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{event.body}</p>
                              ) : null}
                              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {when(event.created_at)}
                                </span>
                                <span>· {event.channel === "system" ? "System notification" : event.channel === "email" ? "Email" : "In-app"}</span>
                                {event.detail ? <span>· {event.detail}</span> : null}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                meta.tone,
                              )}
                            >
                              {meta.label}
                            </span>
                          </li>
                        </Reveal>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Section>

            {events.length > 0 ? (
              <Section>
                <button
                  type="button"
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className={buttonStyles.ghost}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Clear history
                </button>
              </Section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
