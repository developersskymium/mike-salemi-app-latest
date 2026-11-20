/**
 * Catalogue of every email the app can send (client-safe: no env, no secrets), plus sample data for
 * the Studio Email centre preview and "Send me a test". Samples use real program, lesson, medal and
 * tool names from the v2 database.
 */
import type { AppEmail, EmailKind } from "./templates";

export type EmailGroup = "Account" | "Tools" | "Milestones" | "Reminders" | "Updates";

export interface EmailKindInfo {
  id: EmailKind;
  label: string;
  group: EmailGroup;
  sender: "Kettlebell Lifestyle" | "Mike Salemi";
  trigger: string;
  /** Where the trigger lives in v2. */
  source: string;
}

export const EMAIL_GROUPS: EmailGroup[] = ["Account", "Tools", "Milestones", "Reminders", "Updates"];

export const EMAIL_KINDS: EmailKindInfo[] = [
  { id: "welcome", label: "Welcome", group: "Account", sender: "Mike Salemi", trigger: "Sent once, on a new member's first sign-in.", source: "queue_welcome_email() → outbox" },
  { id: "password_reset", label: "Password reset", group: "Account", sender: "Kettlebell Lifestyle", trigger: "Sent when someone asks for a reset from the sign-in screen.", source: "requestPasswordReset (direct)" },
  { id: "test", label: "Test email", group: "Account", sender: "Kettlebell Lifestyle", trigger: "Sent from Settings → Notifications to check delivery.", source: "Settings button (direct)" },
  { id: "tool_result", label: "Tool result", group: "Tools", sender: "Kettlebell Lifestyle", trigger: "Sent every time an assessment tool result is saved.", source: "tool_results insert → outbox" },
  { id: "reward", label: "Reward unlocked", group: "Milestones", sender: "Mike Salemi", trigger: "Sent when one or more medals are earned (one email per moment).", source: "member_badges insert → outbox" },
  { id: "certificate", label: "Certificate", group: "Milestones", sender: "Mike Salemi", trigger: "Sent when a level or course is completed.", source: "certificates insert → outbox" },
  { id: "schedule_created", label: "Schedule created", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "Sent when a plan or Immersion schedule starts.", source: "member_plans insert → outbox" },
  { id: "training_reminder", label: "Training reminder", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "At the member's reminder time on their days, in their time zone, outside quiet hours.", source: "hourly reminders cron" },
  { id: "streak_nudge", label: "Streak nudge", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "Evening nudge when a streak is at risk, or after three quiet days.", source: "hourly reminders cron" },
  { id: "weekly_summary", label: "Weekly summary", group: "Updates", sender: "Kettlebell Lifestyle", trigger: "Sunday evening recap of days, lessons, minutes and medals.", source: "hourly reminders cron" },
  { id: "new_content", label: "New content", group: "Updates", sender: "Kettlebell Lifestyle", trigger: "Sent when new material lands in the library.", source: "Studio announce (P2)" },
];

const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

export function sampleEmail(kind: EmailKind, name?: string): AppEmail {
  const first = name?.split(" ")[0];
  switch (kind) {
    case "welcome":
      return { kind: "welcome", name: first ?? "Daniel" };
    case "password_reset":
      return { kind: "password_reset", actionUrl: "https://app.mikesalemi.com/auth/confirm?type=recovery&token_hash=sample" };
    case "test":
      return { kind: "test" };
    case "tool_result":
      return {
        kind: "tool_result",
        toolName: "Kettlebell Selector",
        resultTitle: "Build your set around 12, 16 and 20 kg",
        summary: "Start your swings on the 16 kg bell, press and get up with the 12 kg, and grow into the 20 kg as your hinge gets crisp.",
        details: [
          { label: "Which chart should we use?", value: "Male" },
          { label: "Roughly where does your bodyweight sit?", value: "Below 160lbs" },
          { label: "What's your kettlebell level?", value: "Beginner" },
        ],
        actions: [
          "Get the 16 kg bell first — that's your working weight for swings.",
          "Use the 12 kg for presses and get-ups until they catch up.",
          "Run the selector again after Phase 1 to see if it's time to move up.",
        ],
      };
    case "reward":
      return { kind: "reward", badgeNames: ["First Rep", "One Week In"], totalBadges: 5, streakDays: 7 };
    case "certificate":
      return {
        kind: "certificate",
        title: "Kettlebell Lifestyle · Level I",
        athleteName: name ?? "Daniel Test",
        issuedOn: longDate(new Date()),
        phases: ["On Ramp", "Phase 1", "Phase 2", "Phase 3"],
        verifyCode: "7F3A9C21D4",
      };
    case "schedule_created":
      return {
        kind: "schedule_created",
        scheduleName: "Kettlebell Strength Foundations",
        courseLabel: "Mastering the Kettlebell",
        startDate: longDate(new Date(Date.now() + 86400000)),
        reminderTime: "7:00 AM",
        daysPerWeek: 3,
        firstDays: ["Two Hand Deadlift", "Recovery #1 · Athleticism 4 Life", "Racked Front Squat"],
      };
    case "training_reminder":
      return {
        kind: "training_reminder",
        dayLabel: "Day 25 · Workout III Day",
        phaseLabel: "Kettlebell Lifestyle · Level I",
        minutes: 35,
        streakDays: 6,
        lessons: ["Day 25 · Workout III Day", "Single Arm Overhead Press"],
      };
    case "streak_nudge":
      return { kind: "streak_nudge", streakDays: 9, lastTrained: "Yesterday", atRisk: true };
    case "weekly_summary":
      return {
        kind: "weekly_summary",
        daysCompleted: 4,
        lessonsCompleted: 7,
        minutes: 132,
        streakDays: 12,
        nextUp: "Day 26 · Skill Development Day — Wednesday",
        wins: ["Momentum", "Unbroken", "Self-Aware"],
      };
    case "new_content":
      return {
        kind: "new_content",
        title: "Working-In with Paul Chek & Mike Salemi",
        description: "Three follow-along sessions for the days between hard training: breath, flow and grounding.",
        items: ["Working-In · Session 1", "Working-In · Session 2", "Working-In · Session 3"],
      };
  }
}
