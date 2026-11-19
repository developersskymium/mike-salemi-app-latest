import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Dumbbell,
  Heart,
  Rocket,
  Share2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { celebrate } from "@/components/celebrate";
import { useSession } from "@/hooks/use-session";
import { useProgress, summarise } from "@/hooks/use-progress";
import { useSavedVideos } from "@/hooks/use-saved-videos";
import {
  REMINDER_GAP_MS,
  useCelebratedSteps,
  useChecklistReminders,
  useChecklistVisibility,
} from "@/hooks/use-checklist";
import { getIntake } from "@/lib/onboarding.functions";
import { getProfile, getToolResults } from "@/lib/progress.functions";
import { getSchedule } from "@/lib/schedule.functions";
import { getNotificationPrefs } from "@/lib/notifications.functions";
import { getReferralEvents } from "@/lib/referrals.functions";

type Task = {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  done: boolean;
  to: string;
  cta: string;
  /** Shown the moment this step flips to done. */
  cheer: { eyebrow: string; title: string; body: string };
};

/**
 * Queries feeding the checklist refetch on focus and on mount, so a step ticks
 * itself off as soon as the athlete comes back from doing the real action.
 */
const LIVE = { staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: true } as const;

/** Collects everything the checklist needs to know about this athlete. */
function useChecklistTasks() {
  const { user } = useSession();
  const enabled = Boolean(user);

  const fetchIntake = useServerFn(getIntake);
  const fetchProfile = useServerFn(getProfile);
  const fetchSchedule = useServerFn(getSchedule);
  const fetchTools = useServerFn(getToolResults);
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const fetchReferralEvents = useServerFn(getReferralEvents);

  const progress = useProgress(enabled);
  const saved = useSavedVideos(enabled);
  const intake = useQuery({ queryKey: ["intake"], queryFn: () => fetchIntake(), enabled, ...LIVE });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled, ...LIVE });
  const schedule = useQuery({ queryKey: ["schedule"], queryFn: () => fetchSchedule(), enabled, ...LIVE });
  const tools = useQuery({ queryKey: ["tool-results"], queryFn: () => fetchTools(), enabled, ...LIVE });
  const prefs = useQuery({ queryKey: ["notification-prefs"], queryFn: () => fetchPrefs(), enabled, ...LIVE });
  const referrals = useQuery({ queryKey: ["referral-events"], queryFn: () => fetchReferralEvents(), enabled, ...LIVE });

  const loading =
    progress.isLoading || intake.isLoading || profile.isLoading || schedule.isLoading || tools.isLoading;

  const tasks = useMemo<Task[]>(() => {
    const s = summarise(progress.data);
    const firstDayComplete = s.completedDays > 0;

    return [
      {
        id: "onboarding",
        title: "Finish onboarding and get your level",
        detail: "Answer a few questions so we place you in Level 1 or Level 2 and set the right starting point.",
        icon: Compass,
        done: Boolean(profile.data?.onboarding_completed_at),
        to: "/onboarding",
        cta: "Start onboarding",
        cheer: {
          eyebrow: "Setup step complete",
          title: "You've got your level",
          body: "Your starting point is set. Everything in the program now lines up behind it.",
        },
      },
      {
        id: "intake",
        title: "Complete the intake questionnaire",
        detail: "13 quick steps covering history, mobility and goals — it personalises your lifestyle work.",
        icon: ClipboardCheck,
        done: Boolean(intake.data?.completed_at),
        to: "/onboarding",
        cta: "Answer intake",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Intake done",
          body: "We know your history and your goals now — your recommendations get sharper from here.",
        },
      },
      {
        id: "profile",
        title: "Add your name to your profile",
        detail: "Your name is printed on every certificate you earn, so get it right before you finish a level.",
        icon: UserRound,
        done: Boolean((profile.data?.display_name as string | undefined)?.trim()),
        to: "/account",
        cta: "Edit profile",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Your name is on the wall",
          body: "Every certificate you earn will carry it. Now go earn one.",
        },
      },
      {
        id: "first-lesson",
        title: "Complete your first lesson",
        detail: "Open today's day in Immersion, watch the lesson and mark it complete to start your streak.",
        icon: Rocket,
        done: (progress.data?.length ?? 0) > 0,
        to: "/immersion",
        cta: "Open Immersion",
        cheer: {
          eyebrow: "First lesson down",
          title: "You started",
          body: "That's the hardest one. The chain begins today — keep it alive tomorrow.",
        },
      },
      {
        id: "first-day",
        title: "Finish a full training day",
        detail: "Every lesson inside one day. This unlocks the next day and moves your phase progress.",
        icon: Dumbbell,
        done: firstDayComplete,
        to: "/immersion",
        cta: "Continue training",
        cheer: {
          eyebrow: "First full day",
          title: "A complete training day",
          body: "Every lesson, start to finish. The next day is unlocked and waiting.",
        },
      },
      {
        id: "schedule",
        title: "Build your training schedule",
        detail: "Pick your start date and training days so the program lands on real dates in your week.",
        icon: CalendarDays,
        done: (schedule.data?.schedules?.length ?? 0) > 0,
        to: "/schedule",
        cta: "Create schedule",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Your plan has dates",
          body: "Training now lives in your week. Move a day and the rest shifts around it.",
        },
      },
      {
        id: "notifications",
        title: "Set your reminders and email preferences",
        detail: "Choose reminder times, streak nudges and which emails you want from the app.",
        icon: Bell,
        done: Boolean(prefs.data),
        to: "/account",
        cta: "Set preferences",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Reminders are live",
          body: "We'll tap you on the shoulder at the right time — nothing more, nothing less.",
        },
      },
      {
        id: "tool",
        title: "Run an assessment tool",
        detail: "Kettlebell selector, readiness and mobility checks — each one emails you a branded result.",
        icon: ClipboardCheck,
        done: (tools.data?.length ?? 0) > 0,
        to: "/tools",
        cta: "Open tools",
        cheer: {
          eyebrow: "Setup step complete",
          title: "First assessment logged",
          body: "You've got a baseline now. Re-run it in a few weeks and watch the numbers move.",
        },
      },
      {
        id: "save",
        title: "Save a video to your library",
        detail: "Tap the heart on any lesson or library video to keep your go-to drills one tap away.",
        icon: Heart,
        done: saved.rows.length > 0,
        to: "/library",
        cta: "Browse library",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Saved for later",
          body: "Your go-to drills are one tap away in Saves.",
        },
      },
      {
        id: "referral",
        title: "Share your referral code",
        detail: "Invite a training partner — you both get further when someone else is showing up with you.",
        icon: Share2,
        done: (referrals.data?.length ?? 0) > 0,
        to: "/referrals",
        cta: "Get your code",
        cheer: {
          eyebrow: "Setup step complete",
          title: "Invite sent",
          body: "Training with someone else is the cheapest consistency hack there is.",
        },
      },
    ];
  }, [
    progress.data,
    profile.data,
    intake.data,
    schedule.data,
    prefs.data,
    tools.data,
    saved.rows,
    referrals.data,
  ]);

  const doneCount = tasks.filter((t) => t.done).length;

  return { tasks, loading, doneCount, total: tasks.length, allDone: doneCount === tasks.length };
}

/**
 * Fires a celebration the instant a checklist step flips to done, and a bigger
 * one when the last step lands. Steps already done before this session are
 * recorded silently, so nobody gets a burst of stale confetti.
 */
function useChecklistCelebrations(tasks: Task[], loading: boolean) {
  const { load, save } = useCelebratedSteps();
  const primed = useRef(false);

  useEffect(() => {
    if (loading || tasks.length === 0) return;
    const doneIds = tasks.filter((t) => t.done).map((t) => t.id);

    if (!primed.current) {
      primed.current = true;
      // First read of the session: remember where they already were.
      save(Array.from(new Set([...load(), ...doneIds])));
      return;
    }

    const known = new Set(load());
    const fresh = tasks.filter((t) => t.done && !known.has(t.id));
    if (fresh.length === 0) return;

    save(Array.from(new Set([...known, ...doneIds])));

    const last = fresh[fresh.length - 1];
    const everythingDone = doneIds.length === tasks.length;
    // Small delay so the celebration lands just after the UI settles.
    window.setTimeout(() => {
      celebrate(
        everythingDone
          ? {
              id: "checklist-complete",
              eyebrow: "Setup complete",
              title: "You're fully dialled in",
              body: "Every setup step is done. From here it's just showing up — the app will keep the rest in order.",
              action: { label: "Back to training", to: "/immersion" },
            }
          : {
              id: `checklist-${last.id}`,
              eyebrow: last.cheer.eyebrow,
              title: last.cheer.title,
              body: `${last.cheer.body} ${doneIds.length} of ${tasks.length} setup steps done.`,
            },
      );
    }, 450);
  }, [tasks, loading, load, save]);
}

/** Optional "you still have setup steps left" nudge when someone comes back. */
function useChecklistReminderToast(tasks: Task[], loading: boolean, doneCount: number, total: number) {
  const { enabled, ready, lastRemindedAt, markReminded } = useChecklistReminders();
  const fired = useRef(false);

  useEffect(() => {
    if (loading || !ready || fired.current || tasks.length === 0) return;
    fired.current = true;
    if (!enabled || doneCount >= total) return;

    const last = lastRemindedAt();
    if (!last) {
      // First visit — start the clock instead of nagging immediately.
      markReminded();
      return;
    }
    if (Date.now() - last < REMINDER_GAP_MS) return;

    const next = tasks.find((t) => !t.done);
    markReminded();
    window.setTimeout(() => {
      toast("Pick up where you left off", {
        description: next
          ? `${total - doneCount} setup steps left. Next: ${next.title.toLowerCase()}.`
          : `${total - doneCount} setup steps left.`,
        duration: 9000,
      });
    }, 1200);
  }, [loading, ready, enabled, tasks, doneCount, total, lastRemindedAt, markReminded]);
}

function TaskRow({ task }: { task: Task }) {
  const Icon = task.icon;
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        task.done ? "border-hairline bg-surface/60" : "border-hairline bg-elevated",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          task.done ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
        )}
      >
        {task.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold",
            task.done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{task.detail}</span>
      </span>
      {!task.done && (
        <Link
          to={task.to}
          className="tap mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
        >
          <span className="hidden sm:inline">{task.cta}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </li>
  );
}

/** Circular "3 of 10" dial used in the header and the compact home indicator. */
function ProgressRing({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const percent = total ? done / total : 0;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-hairline" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent)}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums text-foreground">{done}</span>
    </span>
  );
}

/**
 * Always-visible setup progress on the home screen — including when the full
 * checklist has been switched off, so first-time users never lose the thread.
 */
export function ChecklistProgressIndicator() {
  const { tasks, loading, doneCount, total, allDone } = useChecklistTasks();
  const { hidden, ready, setHidden } = useChecklistVisibility();

  useChecklistCelebrations(tasks, loading);
  useChecklistReminderToast(tasks, loading, doneCount, total);

  if (loading || !ready || allDone || !hidden) return null;

  const next = tasks.find((t) => !t.done);
  return (
    <section className="animate-rise flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3 sm:p-4">
      <ProgressRing done={doneCount} total={total} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Setup {doneCount} of {total}
        </p>
        <p className="truncate text-sm text-muted-foreground">{next ? `Next: ${next.title}` : "Almost there"}</p>
      </div>
      {next && (
        <Link to={next.to} className="tap inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          <span className="hidden sm:inline">{next.cta}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="tap shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        Show list
      </button>
    </section>
  );
}

/**
 * The "make the most of the app" checklist.
 *
 * `home` renders the compact card at the top of Immersion with the switch to
 * turn it off; `profile` renders the always-available copy in the account page
 * with the switch to bring it back.
 */
export function GettingStartedChecklist({ variant = "home" }: { variant?: "home" | "profile" }) {
  const { tasks, loading, doneCount, total, allDone } = useChecklistTasks();
  const { hidden, setHidden, ready } = useChecklistVisibility();
  const reminders = useChecklistReminders();
  const [expanded, setExpanded] = useState(variant === "profile");

  // Celebrations and reminders are owned by the home card; the profile copy
  // stays quiet so nothing fires twice when both are mounted.
  useChecklistCelebrations(variant === "home" ? tasks : [], loading);
  useChecklistReminderToast(variant === "home" ? tasks : [], loading, doneCount, total);

  const percent = Math.round((doneCount / total) * 100);

  if (loading || !ready) return null;
  if (variant === "home" && (hidden || allDone)) return null;

  const visible = variant === "profile" || expanded ? tasks : tasks.filter((t) => !t.done).slice(0, 3);

  return (
    <section className="animate-rise rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:items-center sm:gap-4">
        <ProgressRing done={doneCount} total={total} size={48} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Make the most of the app
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {allDone
              ? "Every setup step is done — you're fully dialled in."
              : `${doneCount} of ${total} steps done. Finish these to get everything the program offers.`}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{variant === "home" ? "Show checklist" : "Show on home"}</span>
          <Switch checked={!hidden} onCheckedChange={(on) => setHidden(!on)} />
        </label>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

      {variant === "home" && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="tap mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show less" : `Show all ${total} steps`}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      {!allDone && reminders.ready && (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-elevated p-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">Remind me about the rest</span>
            <span className="block text-sm text-muted-foreground">
              A gentle nudge when you come back with steps still open.
            </span>
          </span>
          <Switch checked={reminders.enabled} onCheckedChange={reminders.setEnabled} />
        </label>
      )}

      {variant === "home" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Turned off? You can always find this checklist in your profile.
        </p>
      )}
    </section>
  );
}
