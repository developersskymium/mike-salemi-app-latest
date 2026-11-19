/**
 * Client-safe catalogue of every email the app can send.
 * Used by the email preview screen; the server maps each id to sample data.
 */
export type EmailKindId =
  | "welcome"
  | "password_reset"
  | "tool_result"
  | "reward"
  | "certificate"
  | "schedule_created"
  | "training_reminder"
  | "streak_nudge"
  | "weekly_summary"
  | "new_content"
  | "test";

export type EmailKindInfo = {
  id: EmailKindId;
  label: string;
  group: "Account" | "Tools" | "Milestones" | "Reminders" | "Updates";
  sender: "Kettlebell Lifestyle" | "Mike Salemi";
  trigger: string;
};

export const EMAIL_KINDS: EmailKindInfo[] = [
  {
    id: "welcome",
    label: "Welcome",
    group: "Account",
    sender: "Mike Salemi",
    trigger: "Sent right after someone creates their account.",
  },
  {
    id: "password_reset",
    label: "Password reset",
    group: "Account",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent when someone requests a reset from the sign-in screen.",
  },
  {
    id: "tool_result",
    label: "Tool result",
    group: "Tools",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent every time an assessment tool is completed.",
  },
  {
    id: "reward",
    label: "Reward unlocked",
    group: "Milestones",
    sender: "Mike Salemi",
    trigger: "Sent when one or more badges are earned.",
  },
  {
    id: "certificate",
    label: "Certificate (with PDF)",
    group: "Milestones",
    sender: "Mike Salemi",
    trigger: "Sent on course completion, with the certificate attached.",
  },
  {
    id: "schedule_created",
    label: "Schedule created",
    group: "Reminders",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent when a training schedule is generated.",
  },
  {
    id: "training_reminder",
    label: "Training reminder",
    group: "Reminders",
    sender: "Kettlebell Lifestyle",
    trigger: "Daily nudge at the reminder time in the user's preferences.",
  },
  {
    id: "streak_nudge",
    label: "Streak nudge",
    group: "Reminders",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent after a few quiet days to protect the streak.",
  },
  {
    id: "weekly_summary",
    label: "Weekly summary",
    group: "Updates",
    sender: "Kettlebell Lifestyle",
    trigger: "Weekly recap of days, lessons and streak.",
  },
  {
    id: "new_content",
    label: "New content",
    group: "Updates",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent when new material lands in the library.",
  },
  {
    id: "test",
    label: "Test email",
    group: "Account",
    sender: "Kettlebell Lifestyle",
    trigger: "Sent from the Notifications tab to verify delivery.",
  },
];

export const EMAIL_GROUPS = ["Account", "Tools", "Milestones", "Reminders", "Updates"] as const;
