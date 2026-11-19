/**
 * Server-only sample data for previewing and test-sending every app email.
 */
import type { AppEmail } from "@/lib/email-content.server";
import type { EmailKindId } from "@/lib/email-kinds";
import { APP_URL } from "@/lib/email.server";

export function sampleEmail(kind: EmailKindId, name?: string): AppEmail {
  switch (kind) {
    case "welcome":
      return { kind: "welcome", name: name ?? "Alex" };
    case "password_reset":
      return { kind: "password_reset", actionUrl: `${APP_URL}/reset-password#sample` };
    case "tool_result":
      return {
        kind: "tool_result",
        toolName: "Kettlebell Selector",
        resultTitle: "Start with a 16 kg bell",
        score: 62,
        summary:
          "Your hinge mechanics and pressing strength are ahead of your kettlebell mileage. A 16 kg bell will challenge your swings without wrecking your technique on presses and get-ups.",
        details: [
          { label: "Kettlebell experience", value: "A few sessions" },
          { label: "Strength background", value: "Consistent for a year or more" },
          { label: "Bodyweight", value: "75–90 kg / 165–198 lb" },
          { label: "Hinge confidence", value: "Comfortable, no pain" },
          { label: "Main goal", value: "Conditioning and work capacity" },
        ],
        actions: [
          "Buy or borrow a 16 kg bell before your next session — that's your working weight.",
          "Add a 12 kg bell for get-ups and presses until those catch up to your swings.",
          "Re-run the selector after Phase 1 to check whether it's time to move up.",
        ],
      };
    case "reward":
      return { kind: "reward", badgeNames: ["First Week Done", "Five Sessions Logged"], totalBadges: 7, streakDays: 12 };
    case "certificate":
      return {
        kind: "certificate",
        title: "Immersion Level 1",
        athleteName: name ?? "Alex Morgan",
        issuedOn: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        phases: ["Phase 1 — Foundations", "Phase 2 — Build", "Phase 3 — Consolidate"],
      };
    case "schedule_created":
      return {
        kind: "schedule_created",
        scheduleName: "Immersion Level 1",
        courseLabel: "Immersion",
        startDate: new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        reminderTime: "6:30 AM",
        daysPerWeek: 4,
        firstDays: ["Day 1 — Hinge and swing mechanics", "Day 2 — Get-up practice", "Day 3 — Loaded carries"],
      };
    case "training_reminder":
      return {
        kind: "training_reminder",
        dayLabel: "Day 6 — Swing ladders",
        phaseLabel: "Phase 1 — Foundations",
        minutes: 28,
        streakDays: 5,
        lessons: ["Warm-up flow", "Swing ladder 1–5", "Breathing reset and cool-down"],
      };
    case "streak_nudge":
      return { kind: "streak_nudge", streakDays: 9, lastTrained: "3 days ago" };
    case "weekly_summary":
      return {
        kind: "weekly_summary",
        daysCompleted: 4,
        lessonsCompleted: 11,
        minutes: 132,
        streakDays: 12,
        nextUp: "Day 9 — Press and carry complex",
        wins: ["Hit all four scheduled days", "Finished Phase 1", "Logged your best swing set yet"],
      };
    case "new_content":
      return {
        kind: "new_content",
        title: "Mobility Reset series",
        description: "Six short follow-along sessions for the days between hard training.",
        items: ["Hip opener — 8 min", "Thoracic reset — 6 min", "Shoulder prep — 9 min"],
      };
    case "test":
      return { kind: "test" };
  }
}
