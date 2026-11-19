import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  Bell,
  Building2,
  CalendarCheck2,
  ClipboardList,
  Flame,
  Mail,
  ShieldCheck,
  Table2,
  Trophy,
  UserRound,
} from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { ProgressRing } from "@/components/media";
import { BadgeGrid, CertificateCard, MiniStat, XpBar } from "@/components/gamification";
import { AttemptHistory } from "@/components/milestones";
import { useCourseAttempts } from "@/hooks/use-progress";
import { EmptyState, Skeleton, Spinner, buttonStyles } from "@/components/ui-kit";
import { Avatar, useIdentity } from "@/components/identity";
import { getProfile, updateProfile, getToolResults } from "@/lib/progress.functions";
import {
  getAchievements,
  getWorkoutTables,
  awardBadges,
  type WorkoutTableRow,
} from "@/lib/achievements.functions";
import { TrainingInsights } from "@/components/training-insights";
import {
  defaultPrefs,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications.functions";
import { sendNotificationEmail } from "@/lib/email.functions";

import { useProgress, summarise } from "@/hooks/use-progress";
import { useAchievementSync } from "@/hooks/use-achievements";
import { useSession } from "@/hooks/use-session";
import { GettingStartedChecklist } from "@/components/getting-started";
import { useOrganization, demoOrganization } from "@/hooks/use-organization";
import { tools } from "@/content/tools";
import { dayLabel, courses, findDay, totalDays } from "@/content/program";
import { XP_PER_LESSON, XP_PER_DAY } from "@/content/badges";
import { formatReminderDate, nextReminderAt } from "@/lib/reminders";
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from "@/hooks/use-reminders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Profile — Mike Salemi App" },
      {
        name: "description",
        content:
          "Your Mike Salemi App profile: training progress, streaks, badges, certificates, saved assessments and notification preferences.",
      },
      { property: "og:title", content: "Profile — Mike Salemi App" },
      { property: "og:description", content: "Progress, badges, certificates and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "achievements", label: "Achievements" },
  { id: "history", label: "History" },
  { id: "notifications", label: "Notifications" },
  { id: "organization", label: "Organization" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AccountPage() {
  const { user } = useSession();
  const { firstName, avatarUrl, initials } = useIdentity();
  const [tab, setTab] = useState<TabId>("overview");

  const fetchProfile = useServerFn(getProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: progress, isLoading } = useProgress(true);
  const s = summarise(progress);

  const streak = useMemo(() => computeStreak(progress), [progress]);
  const xp = s.completedCount * XP_PER_LESSON + s.completedDays * XP_PER_DAY;
  const displayName =
    profile.data?.display_name || firstName || user?.email?.split("@")[0] || "Athlete";

  return (
    <AppShell>
      <div className="animate-page">
        {/* Identity ---------------------------------------------------- */}
        <Container className="section-tight">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <Avatar src={avatarUrl} initials={initials} size={64} />
              <div className="min-w-0">
                <p className="eyebrow text-muted-foreground">Your profile</p>
                <h1 className="title-page mt-1.5 truncate text-foreground">{displayName}</h1>
                <p className="mt-2 flex items-center gap-2 truncate text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {user?.email}
                </p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-[112px] w-[112px] rounded-full" />
            ) : (
              <ProgressRing percent={s.percent} size={112} stroke={8} sublabel="Program" />
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MiniStat
              label="Days"
              value={`${s.completedDays}/${totalDays}`}
              icon={<CalendarCheck2 className="h-3.5 w-3.5" />}
            />
            <MiniStat
              label="Lessons"
              value={`${s.completedCount}/${s.totalLessons}`}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <MiniStat
              label="Streak"
              value={`${streak}d`}
              icon={<Flame className="h-3.5 w-3.5" />}
            />
            <MiniStat
              label="Current"
              value={`${dayLabel(s.currentDay.day)}`}
              hint={s.currentDay.day.title}
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <XpBar xp={xp} />
          </div>
        </Container>

        {/* Tabs -------------------------------------------------------- */}
        <div className="glass rule sticky top-0 z-20">
          <Container>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-2.5 sm:mx-0 sm:px-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn(
                    "tap min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold",
                    tab === t.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Container>
        </div>

        <Section>
          <div key={tab} className="animate-step-in">
            {tab === "overview" && <OverviewTab />}
            {tab === "achievements" && <AchievementsTab name={displayName} />}
            {tab === "history" && <HistoryTab />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "organization" && <OrganizationTab />}
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const saveProfile = useServerFn(updateProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: progress } = useProgress(true);
  const s = summarise(progress);

  const [name, setName] = useState("");
  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data?.display_name]);

  const mutation = useMutation({
    mutationFn: (displayName: string) => saveProfile({ data: { displayName } }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Couldn't update your profile"),
  });

  return (
    <div className="space-y-5">
      <GettingStartedChecklist variant="profile" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="title-section text-foreground">Details</h2>
          </div>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(name);
            }}
          >
            <div>
              <label className="eyebrow text-muted-foreground" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Your name"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="eyebrow text-muted-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                value={user?.email ?? ""}
                readOnly
                className="mt-2 h-11 w-full rounded-xl border border-border bg-subtle px-4 text-sm text-muted-foreground outline-none"
              />
            </div>
            <div>
              <label className="eyebrow text-muted-foreground" htmlFor="program-level">
                Program level
              </label>
              <input
                id="program-level"
                value={
                  profile.data?.program_level
                    ? `Level ${profile.data.program_level} — ${profile.data.program_level === 2 ? "Intermediate" : "Beginner"}`
                    : "Not set — complete onboarding"
                }
                readOnly
                className="mt-2 h-11 w-full rounded-xl border border-border bg-subtle px-4 text-sm text-muted-foreground outline-none"
              />
            </div>

            <button type="submit" disabled={mutation.isPending} className={buttonStyles.primary}>
              {mutation.isPending && <Spinner />}
              Save profile
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="title-section text-foreground">Progress by level</h2>
          <div className="mt-5 space-y-5">
            {courses.map((course) => {
              const total = course.phases.reduce(
                (n, p) => n + p.days.reduce((m, d) => m + d.lessons.length, 0),
                0,
              );
              const done = course.phases.reduce(
                (n, p) => n + p.days.reduce((m, d) => m + s.dayCompletion(d.id).done, 0),
                0,
              );
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div key={course.id}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
                    <p className="numeric shrink-0 text-xs text-muted-foreground">{pct}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {course.phases.map((phase) => {
                      const pTotal = phase.days.reduce((m, d) => m + d.lessons.length, 0);
                      const pDone = phase.days.reduce((m, d) => m + s.dayCompletion(d.id).done, 0);
                      return (
                        <span
                          key={phase.id}
                          className="numeric rounded-full border border-border px-2 py-0.5 text-[0.625rem] text-muted-foreground"
                        >
                          {phase.label} {pTotal ? Math.round((pDone / pTotal) * 100) : 0}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/immersion" className={cn(buttonStyles.outline, "mt-6")}>
            Continue training
          </Link>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

function PastRuns() {
  const attempts = useCourseAttempts(true);
  const rows = attempts.data ?? [];
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="title-section text-foreground">Past runs</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Runs you finished or restarted. Live progress resets, this record never does.
      </p>
      <div className="mt-4 space-y-4">
        {courses.map((course) => {
          const forCourse = rows.filter((a) => a.course_id === course.id);
          if (!forCourse.length) return null;
          return (
            <div key={course.id}>
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {course.title}
              </h3>
              <AttemptHistory attempts={forCourse} className="mt-2" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AchievementsTab({ name }: { name: string }) {
  // Rules live in one place so the profile and the live awarder never disagree.
  const { deserved, earnedIds, earnedAt, certificates } = useAchievementSync();
  const shown = new Set([...earnedIds, ...deserved]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="title-section text-foreground">Badges</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Keep training to unlock the rest.</p>
        <div className="mt-4">
          <BadgeGrid earned={shown} earnedAt={earnedAt} />
        </div>
      </section>

      <PastRuns />

      <section>
        <h2 className="title-section text-foreground">Certificates</h2>
        {certificates.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Award}
            title="No certificates yet"
            description="Finish a full level to earn a certificate of completion."
          />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {certificates.map((c) => (
              <CertificateCard
                key={c.id}
                title={c.title}
                issuedAt={c.issued_at}
                name={name}
                courseId={c.course_id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

function OrderHistory() {
  const orders = useQuery({
    queryKey: ["shop-orders"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("shop_orders")
        .select("id, product_id, variant, price_cents, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  return (
    <section>
      <h2 className="title-section text-foreground">Orders</h2>
      <p className="mt-1 text-sm text-muted-foreground">Everything you've bought or unlocked. Demo checkout — no real payments yet.</p>
      {orders.isLoading ? (
        <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
      ) : !orders.data?.length ? (
        <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
          {orders.data.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{o.variant ?? o.product_id}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {o.status}</p>
              </div>
              <span className="font-semibold text-foreground">{o.price_cents ? `$${(o.price_cents / 100).toFixed(2)}` : "Free"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryTab() {
  const fetchResults = useServerFn(getToolResults);
  const fetchTables = useServerFn(getWorkoutTables);
  const results = useQuery({ queryKey: ["tool-results"], queryFn: () => fetchResults() });
  const tables = useQuery({ queryKey: ["workout-tables"], queryFn: () => fetchTables() });

  return (
    <div className="space-y-6">
      <OrderHistory />
      <section>
        <h2 className="title-section text-foreground">Training insights</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read from every session plan you've saved — load, readiness and volume over time.
        </p>
        <div className="mt-4">
          <TrainingInsights
            rows={tables.data as unknown as WorkoutTableRow[] | undefined}
            loading={tables.isLoading}
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="title-section text-foreground">Saved assessments</h2>
          {results.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
          ) : results.data?.length ? (
            <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              {results.data.map((row) => {
                const tool = tools.find((t) => t.id === row.tool_id);
                const result = row.result as { title?: string } | null;
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {result?.title ?? "Result"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tool?.title ?? row.tool_id}
                      </p>
                    </div>
                    <p className="numeric shrink-0 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              icon={ClipboardList}
              title="No saved results"
              description="Run an assessment and save it to build your history."
              action={
                <Link to="/tools" className={buttonStyles.primary}>
                  Open the tools
                </Link>
              }
            />
          )}
        </section>

        <section>
          <h2 className="title-section text-foreground">Workout tables</h2>
          {tables.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
          ) : tables.data?.length ? (
            <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              {tables.data.map((row) => {
                const location = findDay(row.day_id);
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {location
                          ? `${dayLabel(location.day)} · ${location.day.title}`
                          : row.day_id}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {location
                          ? `${location.course.level} · ${location.phase.name}`
                          : "Saved workout"}
                      </p>
                    </div>
                    <p className="numeric shrink-0 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              icon={Table2}
              title="No workout tables yet"
              description="Complete a workout day's check-in form and your table is saved here."
            />
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function NotificationsTab() {
  const queryClient = useQueryClient();
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const savePrefs = useServerFn(saveNotificationPrefs);
  const query = useQuery({ queryKey: ["notification-prefs"], queryFn: () => fetchPrefs() });

  const prefs: NotificationPrefs = {
    ...defaultPrefs,
    ...((query.data ?? {}) as Partial<NotificationPrefs>),
  };

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) =>
      savePrefs({ data: { prefs: { ...prefs, ...patch } } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-prefs"] }),
    onError: () => toast.error("Couldn't save that preference"),
  });

  const sendEmail = useServerFn(sendNotificationEmail);
  const testEmail = useMutation({
    mutationFn: () => sendEmail({ data: { kind: "test" as const } }),
    onSuccess: (result) => {
      if ((result as { sent?: boolean } | undefined)?.sent)
        toast.success("Test email sent — check your inbox");
      else toast.error("Email notifications are turned off for your account");
    },

    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send the email"),
  });

  const set = (patch: Partial<NotificationPrefs>) => mutation.mutate(patch);
  const reminderDays: number[] = Array.isArray(prefs.reminder_days) ? prefs.reminder_days : [];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-hairline bg-surface p-5 raise-soft">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="title-section text-foreground">Training reminders</h2>
            <p className="text-xs text-muted-foreground">
              {prefs.training_reminders
                ? `Next reminder ${formatReminderDate(nextReminderAt(prefs, new Date()))}`
                : "Reminders are off right now."}
            </p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-border">
          <Row label="Remind me to train" hint="On the days you've scheduled">
            <Toggle
              checked={prefs.training_reminders}
              onChange={(v) => set({ training_reminders: v })}
            />
          </Row>
          <Row label="Reminder time">
            <div className="flex items-center gap-1.5">
              {["06:00", "07:00", "17:30"].map((t) => {
                const on = (prefs.reminder_time ?? "07:00").slice(0, 5) === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set({ reminder_time: t })}
                    className={cn(
                      "tap numeric hidden min-h-9 rounded-full border px-3 text-xs font-semibold sm:inline-flex sm:items-center",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
              <input
                type="time"
                value={(prefs.reminder_time ?? "07:00").slice(0, 5)}
                onChange={(e) => set({ reminder_time: e.target.value })}
                className="numeric h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </Row>
        </div>

        <div className="mt-4">
          <p className="eyebrow text-muted-foreground">Reminder days</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const value = i + 1;
              const on = reminderDays.includes(value);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      reminder_days: on
                        ? reminderDays.filter((d) => d !== value)
                        : [...reminderDays, value].sort(),
                    })
                  }
                  className={cn(
                    "tap min-h-9 min-w-11 rounded-full border text-xs font-semibold",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-hairline bg-surface p-5 raise-soft">
        <h2 className="title-section text-foreground">What we send</h2>
        <div className="mt-4 divide-y divide-border">
          <Row label="Streak nudges" hint="A gentle push when a streak is at risk">
            <Toggle checked={prefs.streak_nudges} onChange={(v) => set({ streak_nudges: v })} />
          </Row>
          <Row label="Weekly summary" hint="Your week in training, every Sunday">
            <Toggle checked={prefs.weekly_summary} onChange={(v) => set({ weekly_summary: v })} />
          </Row>
          <Row label="New content" hint="When lessons or programs are added">
            <Toggle checked={prefs.new_content} onChange={(v) => set({ new_content: v })} />
          </Row>
          <Row label="Announcements" hint="Retreats, offers and other programs">
            <Toggle checked={prefs.announcements} onChange={(v) => set({ announcements: v })} />
          </Row>
        </div>
      </section>

      <section className="rounded-3xl border border-hairline bg-surface p-5 raise-soft">
        <h2 className="title-section text-foreground">Channels</h2>
        <div className="mt-4 divide-y divide-border">
          <Row label="Email" hint="Summaries and announcements">
            <Toggle checked={prefs.channel_email} onChange={(v) => set({ channel_email: v })} />
          </Row>
          <Row label="In-app" hint="Reminders while the app is open">
            <Toggle checked={prefs.channel_in_app} onChange={(v) => set({ channel_in_app: v })} />
          </Row>
          <BrowserNotificationRow />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Next reminder:{" "}
          <span className="numeric text-foreground">
            {formatReminderDate(nextReminderAt(prefs, new Date()))}
          </span>
        </p>
        <button
          type="button"
          disabled={testEmail.isPending || !prefs.channel_email}
          onClick={() => testEmail.mutate()}
          className={cn(buttonStyles.outline, "mt-4 w-full")}
        >
          {testEmail.isPending ? "Sending…" : "Send me a test email"}
        </button>
        <Link to="/emails" className={cn(buttonStyles.outline, "mt-2 flex w-full justify-center")}>
          Preview every email we send
        </Link>
      </section>

      <section className="rounded-3xl border border-hairline bg-surface p-5 raise-soft">
        <h2 className="title-section text-foreground">Quiet hours</h2>
        <div className="mt-4 divide-y divide-border">
          <Row label="Pause notifications overnight">
            <Toggle
              checked={prefs.quiet_hours_enabled}
              onChange={(v) => set({ quiet_hours_enabled: v })}
            />
          </Row>
          {prefs.quiet_hours_enabled && (
            <>
              <Row label="From">
                <input
                  type="time"
                  value={(prefs.quiet_hours_start ?? "21:00").slice(0, 5)}
                  onChange={(e) => set({ quiet_hours_start: e.target.value })}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </Row>
              <Row label="Until">
                <input
                  type="time"
                  value={(prefs.quiet_hours_end ?? "07:00").slice(0, 5)}
                  onChange={(e) => set({ quiet_hours_end: e.target.value })}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </Row>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/** Requests OS-level notification permission for training reminders. */
function BrowserNotificationRow() {
  const [state, setState] = useState<PermissionState>("default");

  useEffect(() => {
    setState(notificationPermission());
  }, []);

  if (state === "unsupported") return null;

  return (
    <Row
      label="Browser notifications"
      hint={
        state === "granted"
          ? "Reminders appear even when this tab is in the background"
          : state === "denied"
            ? "Blocked in your browser settings"
            : "Allow reminders outside the app"
      }
    >
      {state === "granted" ? (
        <span className="eyebrow rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
          Enabled
        </span>
      ) : (
        <button
          type="button"
          disabled={state === "denied"}
          onClick={async () => setState(await requestNotificationPermission())}
          className="tap rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
        >
          {state === "denied" ? "Blocked" : "Enable"}
        </button>
      )}
    </Row>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "tap relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-subtle",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-300 [transition-timing-function:var(--ease-ios)]",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Organization (UI only)                                              */
/* ------------------------------------------------------------------ */

function OrganizationTab() {
  const { organization, setOrganization } = useOrganization();

  if (!organization) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization linked"
        description="Organizations let a gym or team hold seats and manage sub-profiles under one account. This is a design preview — nothing is charged or provisioned."
        action={
          <button type="button" onClick={() => setOrganization(demoOrganization)} className={buttonStyles.primary}>
            Preview an organization
          </button>
        }
      />
    );
  }

  const cancelled = organization.status === "cancelled";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Organization</p>
            <h2 className="mt-1.5 truncate text-xl text-foreground">{organization.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{organization.plan}</p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              cancelled
                ? "border-destructive/40 text-destructive"
                : organization.status === "past_due"
                  ? "border-border text-muted-foreground"
                  : "border-primary/40 text-primary",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {cancelled ? "Cancelled" : organization.status === "past_due" ? "Past due" : "Active"}
          </span>
        </div>

        {cancelled && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            Access for every sub-profile below is revoked while this organization is cancelled.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {(["active", "past_due", "cancelled"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setOrganization({ ...organization, status })}
              className={cn(
                "tap min-h-9 rounded-full border px-3.5 text-xs font-semibold capitalize",
                organization.status === status
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {status.replace("_", " ")}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOrganization(null)}
            className="tap min-h-9 rounded-full border border-border px-3.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
          >
            Unlink
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Sub-profiles
            <span className="numeric ml-2 text-xs font-normal text-muted-foreground">
              {organization.members.length} of {organization.seats} seats
            </span>
          </p>
        </div>
        {organization.members.map((member) => {
          const total = member.daysTotal ?? 0;
          const done = member.daysDone ?? 0;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div
              key={member.id}
              className={cn(
                "grid gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center",
                cancelled && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>

              {/* Coach view: at-a-glance progress per seat */}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-[0.625rem] text-muted-foreground">
                  <span className="truncate">{member.level ?? "Not enrolled"}</span>
                  <span className="numeric">
                    {done}/{total || "—"} days
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={cn("h-full rounded-full", cancelled ? "bg-muted-foreground" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 truncate text-[0.625rem] text-muted-foreground">
                  {member.streak ? `${member.streak}-day streak · ` : ""}
                  {member.lastActive ?? "No activity"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-[0.625rem] capitalize text-muted-foreground">
                  {member.role}
                </span>
                <span
                  className={cn(
                    "text-[0.625rem] font-semibold capitalize",
                    cancelled
                      ? "text-destructive"
                      : member.status === "active"
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {cancelled ? "revoked" : member.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>


      <p className="text-xs text-muted-foreground">
        Design preview only — seats, billing and access revocation are not wired up yet.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function computeStreak(rows?: { completed_at: string }[]) {
  if (!rows?.length) return 0;
  const days = new Set(rows.map((r) => new Date(r.completed_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
