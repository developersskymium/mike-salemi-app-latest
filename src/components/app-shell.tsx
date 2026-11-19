import { dayLabel } from "@/content/program";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Activity,
  ArrowRight,
  CalendarCheck2,
  ChevronDown,
  Compass,
  Dumbbell,
  Gift,
  Home,
  LibraryBig,
  LogOut,
  Moon,
  Mountain,
  ListTree,
  MessageCircle,
  MoreHorizontal,

  ShoppingBag,
  Sparkles,
  Sun,
  User,
  Wrench,
  X,
  Flame,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalPrograms } from "@/content/programs";
import { useSession } from "@/hooks/use-session";
import { useTheme } from "@/hooks/use-theme";
import { useOrganization } from "@/hooks/use-organization";
import { useEntitlements } from "@/hooks/use-entitlements";
import { MTK_COURSE_ID } from "@/content/mtk";
import { retreats, formatRetreatDates } from "@/content/retreats";
import { summarise, useProgress } from "@/hooks/use-progress";
import { computeStreakFromRows } from "@/lib/achievements";
import { currentMilestone, milestoneCopy } from "@/lib/milestones";
import { useReminders } from "@/hooks/use-reminders";
import { useAchievementSync } from "@/hooks/use-achievements";
import { useMilestoneWatch } from "@/hooks/use-milestone-watch";

import { CelebrationHost } from "@/components/celebrate";
import { ProgressRing } from "@/components/media";
import { buttonStyles } from "@/components/ui-kit";
import { Avatar, GreetingBar, UserMenu, greetingFor, useIdentity } from "@/components/identity";
import { StatusBar } from "@/components/status-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnnouncementBar } from "@/components/announcement-bar";

type NavItem = {
  to: string;
  label: string;
  short?: string;
  icon: ComponentType<{ className?: string }>;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/home", label: "Home", short: "Home", icon: Home },
  { to: "/programs", label: "Programs", short: "Programs", icon: Sparkles },
  { to: "/retreats", label: "Retreats", short: "Retreats", icon: Mountain },
  { to: "/library", label: "Library", short: "Videos", icon: LibraryBig },
  { to: "/schedule", label: "Schedule", short: "Schedule", icon: CalendarCheck2 },
  { to: "/account", label: "Account", short: "Account", icon: User },
];

/** Secondary destinations, folded into a collapsible section of the rail. */
const MORE_NAV: NavItem[] = [
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/coaching", label: "Coaching", icon: MessageCircle },
  { to: "/referrals", label: "Referrals", icon: Gift },
];

const RAIL_NAV = PRIMARY_NAV;
const TAB_NAV = PRIMARY_NAV.slice(0, 4);



export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  const { organization } = useOrganization();
  return (
    <Link to="/" className={cn("tap flex min-w-0 shrink-0 flex-col justify-center", className)}>
      <span
        className="inline-flex items-baseline gap-1 whitespace-nowrap font-extrabold leading-none tracking-tight"
        style={{ fontSize: compact ? "0.95rem" : "1.1rem" }}
      >
        <span className="text-foreground">MIKE</span>
        <span className="text-primary">SALEMI</span>
      </span>

      {organization && (
        <span className="mt-1.5 block truncate text-[0.6875rem] font-medium text-muted-foreground">
          {organization.name}
        </span>
      )}
    </Link>
  );
}


export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className={cn(
        "tap relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-hairline bg-surface/60 text-muted-foreground hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
          theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
          theme === "light" ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
    </Button>
  );
}

/** Compact personalised identity block for the mobile header. */
function MobileIdentity() {
  const { firstName, avatarUrl, initials } = useIdentity();
  return (
    <Link to="/account" className="tap flex min-w-0 items-center gap-2.5">
      <Avatar src={avatarUrl} initials={initials} size={34} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {greetingFor()}
          {firstName ? `, ${firstName}` : ""}
        </span>
        <span className="eyebrow block text-[0.5625rem] text-muted-foreground">Mike Salemi</span>
      </span>
    </Link>
  );
}

/** Streak chip for the mobile header (desktop shows it in the status bar). */
function MobileStreak() {
  const { user } = useSession();
  const { data: rows } = useProgress(Boolean(user));
  const streak = computeStreakFromRows(rows);
  if (streak <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
      <Flame className="h-3 w-3" />
      {streak}d
    </span>
  );
}

export function SiteHeader() {
  const { user } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header
      className={cn(
        "glass sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-all duration-300 [transition-timing-function:var(--ease-ios)]",
        scrolled ? "border-hairline shadow-[var(--shadow-sm)]" : "border-transparent",
      )}
    >
      <div className="mx-auto grid min-h-13 max-w-[78rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 sm:px-6 md:flex md:justify-between md:py-0">
        {user ? (
          <>
            <div className="min-w-0 md:hidden">
              <MobileIdentity />
            </div>
            <div className="hidden md:block">
              <Wordmark />
            </div>
          </>
        ) : (
          <Wordmark />
        )}


        {/* segmented, iOS-style nav */}
        <nav className="hidden items-center gap-1 rounded-full border border-hairline bg-surface/50 p-1 md:flex">
          {PRIMARY_NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "tap relative rounded-full px-4 py-1.5 text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    className="animate-pop absolute inset-0 -z-10 rounded-full bg-elevated shadow-[var(--shadow-sm)] ring-1 ring-inset ring-primary/25"
                    aria-hidden
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/account"
                className="tap inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
              <button
                onClick={signOut}
                className="tap grid h-9 w-9 place-items-center rounded-full border border-hairline bg-surface/60 text-muted-foreground hover:border-destructive hover:text-destructive"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link to="/auth" className={cn(buttonStyles.primary, "px-5 py-2.5")}>
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile navigation lives in the bottom tab bar + "More" drawer. */}
        <div className="flex items-center gap-2 md:hidden">
          {user && <MobileStreak />}
          <ThemeToggle />
        </div>
      </div>

    </header>
  );
}

/** Grouped destinations shown inside the mobile "More" drawer. */
const MORE_SHEET_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Train",
    items: [
      { to: "/library", label: "Library", icon: LibraryBig },
      { to: "/tools", label: "Tools", icon: Wrench },
      { to: "/hub", label: "Program hub", icon: ListTree },
      { to: "/schedule", label: "Schedule", icon: CalendarCheck2 },
    ],
  },
  {
    title: "Explore",
    items: [
      { to: "/programs", label: "Programs", icon: Sparkles },
      { to: "/coaching", label: "Coaching", icon: MessageCircle },
      { to: "/referrals", label: "Referrals", icon: Gift },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/account", label: "Profile & settings", icon: User },
      { to: "/structure", label: "Structure", icon: ListTree },
    ],
  },
];

/** Native-feeling bottom tab bar — mobile only, signed-in users only. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { rows: entitlements } = useEntitlements();
  const [sheet, setSheet] = useState(false);

  useEffect(() => setSheet(false), [pathname]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  if (!user) return null;

  const tabs: NavItem[] = [
    { to: "/home", label: "Home", short: "Home", icon: Home },
    { to: "/programs", label: "Programs", short: "Programs", icon: Sparkles },
    { to: "/account", label: "Profile", short: "Profile", icon: User },
  ];

  const inTabs = new Set(tabs.map((t) => t.to));
  const moreActive =
    sheet ||
    MORE_SHEET_GROUPS.some((g) => g.items.some((i) => !inTabs.has(i.to) && pathname.startsWith(i.to)));

  /** Owned courses, retreats and programs — surfaced at the top of the drawer. */
  const unlocked: { item: NavItem; meta?: string }[] = [];
  if (entitlements.some((row) => row.product_id === MTK_COURSE_ID)) {
    unlocked.push({
      item: { to: "/courses/mastering-the-kettlebell", label: "Mastering the Kettlebell", icon: Dumbbell },
      meta: "Technique course",
    });
  }
  for (const retreat of retreats) {
    if (entitlements.some((row) => row.product_id === `retreat-${retreat.id}`)) {
      unlocked.push({
        item: { to: `/retreats/${retreat.slug}/hub`, label: retreat.name, icon: Mountain },
        meta: formatRetreatDates(retreat),
      });
    }
  }
  for (const program of externalPrograms) {
    if (entitlements.some((row) => row.product_id === `program-${program.id}`)) {
      unlocked.push({
        item: { to: program.route ?? `/programs/${program.slug}`, label: program.name, icon: Sparkles },
        meta: program.kind,
      });
    }
  }

  const groups: { title: string; items: { item: NavItem; meta?: string }[] }[] = unlocked.length
    ? [{ title: "Your access", items: unlocked }, ...MORE_SHEET_GROUPS.map((g) => ({ title: g.title, items: g.items.map((item) => ({ item })) }))]
    : MORE_SHEET_GROUPS.map((g) => ({ title: g.title, items: g.items.map((item) => ({ item })) }));

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="All pages">
          <button
            className="absolute inset-0 animate-fade bg-foreground/30 backdrop-blur-[3px]"
            aria-label="Close menu"
            onClick={() => setSheet(false)}
          />
          <div className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[1.75rem] border-t border-hairline bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[var(--shadow-command)]">
            <div className="mx-auto h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <p className="text-[0.95rem] font-semibold text-foreground">All pages</p>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label="Close menu"
                className="tap grid h-8 w-8 place-items-center rounded-full border border-hairline bg-surface/60 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="stagger space-y-5 px-4 pb-4 pt-2">
              {groups.map((group) => (
                <section key={group.title}>
                  <p className="eyebrow px-1.5 pb-2 text-[0.5625rem] text-muted-foreground">{group.title}</p>
                  <div className="grid gap-1.5">
                    {group.items.map(({ item, meta }) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSheet(false)}
                        className={cn(
                          "pressable grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-2.5 text-[0.85rem] font-semibold",
                          pathname.startsWith(item.to)
                            ? "border-primary/35 bg-primary/10 text-primary"
                            : "border-hairline bg-surface/50 text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-xl border",
                            pathname.startsWith(item.to)
                              ? "border-primary/35 bg-primary/15 text-primary"
                              : "border-hairline bg-background text-muted-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{item.label}</span>
                          {meta && (
                            <span className="block truncate text-[0.68rem] font-medium text-muted-foreground">
                              {meta}
                            </span>
                          )}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}

              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.assign("/auth");
                }}
                className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-hairline px-3 py-2.5 text-[0.82rem] font-semibold text-muted-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="glass fixed inset-x-0 bottom-0 z-[70] border-t border-hairline pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((item) => {
            const active = pathname.startsWith(item.to) && !sheet;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "tap flex flex-col items-center gap-1 py-2.5",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
                      active && "scale-110",
                    )}
                  />
                  <span className="text-[0.625rem] font-semibold tracking-wide">{item.short ?? item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setSheet((v) => !v)}
              aria-expanded={sheet}
              aria-label="More pages"
              className={cn(
                "tap flex w-full flex-col items-center gap-1 py-2.5",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal
                className={cn(
                  "h-5 w-5 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
                  sheet && "rotate-90 scale-110",
                )}
              />
              <span className="text-[0.625rem] font-semibold tracking-wide">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}


export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto max-w-[78rem] px-4 py-8 sm:px-6">
        <p className="eyebrow text-muted-foreground">Also by Mike Salemi</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {externalPrograms.slice(0, 5).map((program) => (
            <li key={program.id}>
              <Link
                to="/programs/$programSlug"
                params={{ programSlug: program.slug }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {program.name}
              </Link>

            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto grid max-w-[78rem] gap-4 border-t border-hairline px-4 py-6 sm:px-6 md:grid-cols-[auto_1fr] md:items-center md:justify-between">
        <Wordmark />
        <p className="text-sm text-muted-foreground md:text-right">
          &copy; {new Date().getFullYear()} Mike Salemi.
        </p>
      </div>
    </footer>
  );
}

export function AppShell({ children, immersive }: { children: ReactNode; immersive?: boolean }) {
  const { user } = useSession();

  if (user) {
    return <AuthenticatedShell immersive={immersive}>{children}</AuthenticatedShell>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="animate-fade flex-1 pb-24 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileTabBar />
      <CelebrationHost />
    </div>
  );
}

/** Awards badges/certificates the moment they are earned and toasts them. */
function AchievementWatcher() {
  useAchievementSync();
  useMilestoneWatch();
  return null;
}


/** Delivers training reminders + streak nudges from the saved preferences. */
function ReminderWatcher() {
  useReminders();
  return null;
}

function AuthenticatedShell({ children, immersive }: { children: ReactNode; immersive?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: progressRows } = useProgress(Boolean(user));
  const streak = computeStreak(progressRows);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <AchievementWatcher />
      <ReminderWatcher />
      <aside className={cn("app-rail no-scrollbar fixed inset-y-0 left-0 z-40 hidden w-[16rem] flex-col overflow-y-auto px-4 py-5", !immersive && "md:flex")}>

        <Wordmark />

        <TrainingResume />

        <nav className="mt-5 space-y-1.5" aria-label="Primary navigation">
          {RAIL_NAV.map((item) => (
            <RailLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
          ))}
        </nav>

        <UnlockedNav pathname={pathname} />
        <AdditionalNav pathname={pathname} />


        <div className="mt-auto border-t border-hairline pt-4">
          <UserMenu />
        </div>
      </aside>

      <div className={cn(!immersive && "md:pl-[16rem]")}>
        <AnnouncementBar />
        {!immersive && (
          <div className="md:hidden">
            <SiteHeader />
          </div>
        )}
        {/* One global, centered, context-aware status bar. Hidden on mobile —
            the mobile SiteHeader already carries the greeting/identity. */}
        {!immersive && (
          <div className="hidden md:block">
            <StatusBar />
          </div>
        )}


        <main className="animate-fade min-h-screen pb-24 md:pb-0">
          {children}
        </main>

      </div>
      <MobileTabBar />
    </div>
  );
}

function TrainingResume() {
  const { user } = useSession();
  const { data, isLoading } = useProgress(Boolean(user));
  const summary = summarise(data);
  const current = summary.currentDay;
  const completion = current ? summary.dayCompletion(current.day.id) : { done: 0, total: 0 };
  const copy = milestoneCopy(currentMilestone(summary));

  return (
    <Link to="/immersion" className="command-panel pressable spotlight mt-6 block overflow-hidden p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-primary">{copy?.eyebrow ?? "Up next"}</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {isLoading ? "Loading session" : copy?.title ?? current?.day.title ?? "Start Beginner Day 1"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {copy
              ? copy.cta
              : current
                ? `${current.course.level} · ${current.phase.label} · ${dayLabel(current.day)}`
                : "Linear immersion path"}
          </p>
        </div>
        <ProgressRing
          percent={completion.total ? Math.round((completion.done / completion.total) * 100) : 0}
          size={54}
          stroke={5}
          label={<CalendarCheck2 className="h-4 w-4 text-primary" />}
        />
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
          style={{
            width: `${completion.total ? Math.round((completion.done / completion.total) * 100) : 0}%`,
            background: "var(--gradient-primary)",
          }}
        />
      </div>
    </Link>
  );
}

/** Consecutive-day training streak from completion timestamps. */
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

/** Standard container for page content. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[78rem] px-4 sm:px-6", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="aurora grain relative overflow-hidden border-b border-hairline">
      <Container className="relative grid gap-5 py-7 sm:py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="animate-rise min-w-0">
          <p className="eyebrow text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-2xl text-foreground sm:text-3xl lg:text-3xl">{title}</h1>
          {description && (
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
          )}
          {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {aside && <div className="animate-rise [animation-delay:90ms]">{aside}</div>}
      </Container>
    </div>
  );
}

export function ProgressBar({
  percent,
  label,
  className,
}: {
  percent: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="eyebrow text-muted-foreground">{label}</span>
          <span className="numeric text-sm text-primary">{percent}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-[width] duration-1000 [transition-timing-function:var(--ease-out-soft)]"
          style={{ width: `${percent}%`, background: "var(--gradient-primary)" }}
        />
      </div>
    </div>
  );
}

export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cn("panel p-6", interactive && "lift", className)}>{children}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail navigation pieces                                              */
/* ------------------------------------------------------------------ */

function RailLink({
  item,
  active,
  meta,
  compact,
}: {
  item: NavItem;
  active: boolean;
  meta?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to={item.to}
      className={cn(
        "pressable group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-xl font-semibold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "gap-2.5 rounded-xl px-3.5 py-1.5 text-[0.8125rem]" : "gap-3 px-3.5 py-3 text-sm",
        active
          ? "bg-elevated text-foreground shadow-[var(--shadow-command)] ring-1 ring-inset ring-hairline"
          : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-[0.6rem] transition-all duration-200",
          compact ? "h-7 w-7" : "h-9 w-9",
          active
            ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
            : "bg-secondary/75 text-muted-foreground group-hover:bg-elevated group-hover:text-foreground group-hover:shadow-[var(--shadow-sm)]",
        )}
      >
        <item.icon
          className={cn(
            compact ? "h-3.5 w-3.5" : "h-[1.1rem] w-[1.1rem]",
            active ? "[stroke-width:2.25]" : "[stroke-width:1.8]",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate">{item.label}</span>
        {meta && <span className="block truncate text-[0.6875rem] font-medium text-muted-foreground">{meta}</span>}
      </span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}


/** Courses, retreats and programs the person has unlocked. */
function UnlockedNav({ pathname }: { pathname: string }) {
  const { rows } = useEntitlements();
  if (!rows.length) return null;

  const items: { item: NavItem; meta?: string }[] = [];

  if (rows.some((row) => row.product_id === MTK_COURSE_ID)) {
    items.push({ item: { to: "/courses/mastering-the-kettlebell", label: "Mastering the Kettlebell", icon: Dumbbell }, meta: "Technique course" });
  }

  for (const retreat of retreats) {
    if (rows.some((row) => row.product_id === `retreat-${retreat.id}`)) {
      items.push({
        item: { to: `/retreats/${retreat.slug}/hub`, label: retreat.name, icon: Mountain },
        meta: formatRetreatDates(retreat),
      });
    }
  }

  for (const program of externalPrograms) {
    if (rows.some((row) => row.product_id === `program-${program.id}`)) {
      items.push({
        item: {
          to: program.route ?? `/programs/${program.slug}`,
          label: program.name,
          icon: Sparkles,
        },
        meta: program.kind,
      });

    }
  }

  if (!items.length) return null;

  return (
    <nav className="mt-6" aria-label="Your access">
      <p className="eyebrow px-3.5 pb-2 text-[0.5625rem] text-muted-foreground">Your access</p>
      <div className="space-y-0.5">
        {items.map(({ item, meta }) => (
          <RailLink key={item.to} item={item} meta={meta} active={pathname.startsWith(item.to)} compact />
        ))}
      </div>
    </nav>
  );
}

/** Collapsible secondary section at the bottom of the rail. */
function AdditionalNav({ pathname }: { pathname: string }) {
  const hasActive = MORE_NAV.some((item) => pathname.startsWith(item.to));
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <nav className="mt-6" aria-label="Additional navigation">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left"
      >
        <span className="eyebrow text-[0.5625rem] text-muted-foreground">Additional</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="stagger mt-1 space-y-0.5">
          {MORE_NAV.map((item) => (
            <RailLink key={item.to} item={item} active={pathname.startsWith(item.to)} compact />
          ))}
        </div>

      )}
    </nav>
  );
}

