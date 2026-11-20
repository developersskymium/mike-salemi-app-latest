/**
 * Catalogue of every email the app can send (client-safe: no env, no secrets), plus sample data for
 * the Studio Email centre preview and "Send me a test". Samples use real program, lesson, medal and
 * tool names from the v2 database.
 */
import type { AppEmail, EmailKind } from "./templates";

export type EmailGroup = "Account" | "Billing" | "Orders" | "Coaching and retreats" | "Tools" | "Milestones" | "Reminders" | "Updates";

/**
 * Which member setting decides whether this email is sent.
 * always = receipts, orders and bookings (transactional, sent even with email switched off);
 * email = the Email channel switch; streak_nudge / new_content = that toggle as well.
 */
export type EmailPref = "always" | "email" | "streak_nudge" | "weekly_recap" | "new_content" | "reminders";

export interface EmailKindInfo {
  id: EmailKind;
  label: string;
  group: EmailGroup;
  sender: "Kettlebell Lifestyle" | "Mike Salemi";
  trigger: string;
  /** Where the trigger lives in v2. */
  source: string;
  /** Member setting that controls it (defaults to "email"). */
  pref?: EmailPref;
}

/** Transactional kinds: sent whatever the member's email switch says (they asked for these). */
export const ALWAYS_SEND: string[] = [
  "welcome", "test", "password_reset",
  "payment_receipt", "payment_failed", "plan_ending", "plan_ended", "plan_paused",
  "order_confirmation", "order_shipped", "coaching_booked", "retreat_application_received", "retreat_application_update",
];

export const EMAIL_GROUPS: EmailGroup[] = ["Account", "Billing", "Orders", "Coaching and retreats", "Tools", "Milestones", "Reminders", "Updates"];

export const EMAIL_KINDS: EmailKindInfo[] = [
  { id: "welcome", label: "Welcome", group: "Account", sender: "Mike Salemi", trigger: "Sent once, on a new member's first sign-in.", source: "queue_welcome_email() → outbox", pref: "always" },
  { id: "password_reset", label: "Password reset", group: "Account", sender: "Kettlebell Lifestyle", trigger: "Sent when someone asks for a reset from the sign-in screen.", source: "requestPasswordReset (direct)", pref: "always" },
  { id: "test", label: "Test email", group: "Account", sender: "Kettlebell Lifestyle", trigger: "Sent from Settings → Notifications to check delivery.", source: "Settings button (direct)", pref: "always" },
  { id: "tool_result", label: "Tool result", group: "Tools", sender: "Kettlebell Lifestyle", trigger: "Sent every time an assessment tool result is saved.", source: "tool_results insert → outbox" },
  { id: "reward", label: "Reward unlocked", group: "Milestones", sender: "Mike Salemi", trigger: "Sent when one or more medals are earned (one email per moment).", source: "member_badges insert → outbox" },
  { id: "certificate", label: "Certificate", group: "Milestones", sender: "Mike Salemi", trigger: "Sent when a level or course is completed.", source: "certificates insert → outbox" },
  { id: "schedule_created", label: "Schedule created", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "Sent when a plan or Immersion schedule starts.", source: "member_plans insert → outbox" },
  { id: "training_reminder", label: "Training reminder", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "At the member's reminder time on their days, in their time zone, outside quiet hours.", source: "hourly reminders cron", pref: "reminders" },
  { id: "streak_nudge", label: "Streak nudge", group: "Reminders", sender: "Kettlebell Lifestyle", trigger: "Evening nudge when a streak is at risk, or after three quiet days.", source: "hourly reminders cron", pref: "streak_nudge" },
  { id: "weekly_summary", label: "Weekly summary", group: "Updates", sender: "Kettlebell Lifestyle", trigger: "Sunday evening recap of days, lessons, minutes and medals.", source: "hourly reminders cron", pref: "weekly_recap" },
  { id: "new_content", label: "New content", group: "Updates", sender: "Kettlebell Lifestyle", trigger: "Sent when new material lands in the library.", source: "Studio announce (P2)", pref: "new_content" },
  { id: "payment_receipt", label: "Payment receipt", group: "Billing", sender: "Kettlebell Lifestyle", trigger: "Sent for every successful payment: a purchase or a plan renewal.", source: "Stripe webhook → enqueueBillingEmail", pref: "always" },
  { id: "payment_failed", label: "Payment failed", group: "Billing", sender: "Kettlebell Lifestyle", trigger: "Sent when a plan payment fails, with a link to update the card.", source: "Stripe webhook (invoice.payment_failed)", pref: "always" },
  { id: "plan_ending", label: "Plan ending", group: "Billing", sender: "Kettlebell Lifestyle", trigger: "Sent when a member cancels: access runs to the end of the period.", source: "Stripe webhook (cancel at period end)", pref: "always" },
  { id: "plan_ended", label: "Plan ended", group: "Billing", sender: "Kettlebell Lifestyle", trigger: "Sent when a plan actually ends.", source: "Stripe webhook (subscription deleted)", pref: "always" },
  { id: "plan_paused", label: "Plan paused", group: "Billing", sender: "Kettlebell Lifestyle", trigger: "Sent when payments on a plan are paused.", source: "Stripe webhook (subscription paused)", pref: "always" },
  { id: "order_confirmation", label: "Order confirmation", group: "Orders", sender: "Kettlebell Lifestyle", trigger: "Sent when a shop order is paid.", source: "orders → paid (DB trigger) → outbox", pref: "always" },
  { id: "order_shipped", label: "Order shipped", group: "Orders", sender: "Kettlebell Lifestyle", trigger: "Sent when an order is marked shipped, with tracking.", source: "orders → shipped (DB trigger) → outbox", pref: "always" },
  { id: "coaching_booked", label: "Coaching call booked", group: "Coaching and retreats", sender: "Mike Salemi", trigger: "Sent when a member books a coaching call.", source: "coaching_bookings insert → outbox", pref: "always" },
  { id: "coaching_reminder", label: "Coaching call reminder", group: "Coaching and retreats", sender: "Mike Salemi", trigger: "About 24 hours before a booked call, outside quiet hours.", source: "hourly reminders cron" },
  { id: "retreat_application_received", label: "Retreat application received", group: "Coaching and retreats", sender: "Mike Salemi", trigger: "Sent when a member applies for a retreat.", source: "run_applications insert → outbox", pref: "always" },
  { id: "retreat_application_update", label: "Retreat application update", group: "Coaching and retreats", sender: "Mike Salemi", trigger: "Sent when an application is accepted or waitlisted.", source: "run_applications status (DB trigger) → outbox", pref: "always" },
  { id: "referral_reward", label: "Referral reward", group: "Milestones", sender: "Mike Salemi", trigger: "Sent when a friend's first payment earns the inviter 30 days of Pro.", source: "referrals → rewarded (DB trigger) → outbox" },
  { id: "win_back", label: "Welcome back", group: "Reminders", sender: "Mike Salemi", trigger: "After 14 days without training, at most once every 30 days, at the member's reminder time.", source: "hourly reminders cron", pref: "streak_nudge" },
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
        image: { src: "/media/email/new-content.jpg", alt: "Mike and Paul Chek teaching Working In" },
      };
    case "payment_receipt":
      return { kind: "payment_receipt", itemName: "Pro membership · monthly", amount: "$29.00", paidOn: longDate(new Date()), reference: "KL-48213", nextBilling: longDate(new Date(Date.now() + 30 * 86400000)), renewal: true };
    case "payment_failed":
      return { kind: "payment_failed", planName: "Pro membership", amount: "$29.00", retryOn: longDate(new Date(Date.now() + 3 * 86400000)), accessUntil: longDate(new Date(Date.now() + 7 * 86400000)) };
    case "plan_ending":
      return { kind: "plan_ending", planName: "Pro membership", endsOn: longDate(new Date(Date.now() + 18 * 86400000)) };
    case "plan_ended":
      return { kind: "plan_ended", planName: "Pro membership", endedOn: longDate(new Date()) };
    case "plan_paused":
      return { kind: "plan_paused", planName: "Pro membership", resumesOn: longDate(new Date(Date.now() + 30 * 86400000)) };
    case "order_confirmation":
      return {
        kind: "order_confirmation",
        reference: "KL-50317",
        items: [
          { name: "Competition Kettlebell — 16 kg", quantity: 1, amount: "$89.00" },
          { name: "Chalk Ball", quantity: 2, amount: "$18.00" },
        ],
        shipping: "$12.00",
        total: "$119.00",
        shipTo: `${name ?? "Daniel Test"}, 1200 Mountain View Rd, Mount Shasta, CA 96067, United States`,
        physical: true,
      };
    case "order_shipped":
      return { kind: "order_shipped", reference: "KL-50317", items: ["Competition Kettlebell — 16 kg", "Chalk Ball × 2"], carrier: "UPS", trackingNumber: "1Z 999 AA1 01 2345 6784", trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784", shipTo: "Mount Shasta, CA" };
    case "coaching_booked":
      return { kind: "coaching_booked", when: `${longDate(new Date(Date.now() + 5 * 86400000))} at 9:00 AM`, minutes: 45, packageName: "1:1 Coaching · 4 calls", bookingId: "sample" };
    case "coaching_reminder":
      return { kind: "coaching_reminder", when: `${longDate(new Date(Date.now() + 86400000))} at 9:00 AM`, minutes: 45, packageName: "1:1 Coaching · 4 calls", meetingUrl: "https://meet.google.com/abc-defg-hij", bookingId: "sample" };
    case "retreat_application_received":
      return { kind: "retreat_application_received", retreatName: "Men of Movement · Mount Shasta", dates: "June 12 to 16", place: "Mount Shasta, California" };
    case "retreat_application_update":
      return { kind: "retreat_application_update", retreatName: "Men of Movement · Mount Shasta", status: "accepted", dates: "June 12 to 16", place: "Mount Shasta, California" };
    case "referral_reward":
      return { kind: "referral_reward", friendName: "Chris", days: 30, points: 500, proUntil: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) };
    case "win_back":
      return { kind: "win_back", name: first ?? "Daniel", daysAway: 16, programName: "Kettlebell Lifestyle · Level I" };
  }
}
