/**
 * Server-only: the copy and layout for every email the app can send.
 *
 * One renderer per email so the app, the preview screen and the test-send
 * button all produce exactly the same message.
 */
import {
  APP_URL,
  badge,
  bullets,
  callout,
  detailRows,
  emailLayout,
  esc,
  p,
  progressBar,
  scoreBlock,
  sectionTitle,
  statTiles,
  steps,
  type EmailSender,
} from "@/lib/email.server";

export type AppEmail =
  | {
      kind: "tool_result";
      toolName: string;
      resultTitle: string;
      score?: number;
      summary?: string;
      /** Answer-by-answer breakdown of what they entered. */
      details?: { label: string; value: string }[];
      /** What to actually do with the result. */
      actions?: string[];
    }
  | { kind: "reward"; badgeNames: string[]; totalBadges?: number; streakDays?: number }
  | { kind: "certificate"; title: string; athleteName?: string; issuedOn?: string; phases?: string[] }
  | {
      kind: "schedule_created";
      scheduleName: string;
      startDate: string;
      courseLabel?: string;
      reminderTime?: string;
      daysPerWeek?: number;
      firstDays?: string[];
    }
  | {
      kind: "training_reminder";
      dayLabel?: string;
      /** Program day id, so the CTA can deep-link straight into the session. */
      dayId?: string;
      phaseLabel?: string;
      lessons?: string[];
      minutes?: number;
      streakDays?: number;
      message?: string;
    }
  | {
      kind: "weekly_summary";
      daysCompleted?: number;
      lessonsCompleted?: number;
      minutes?: number;
      streakDays?: number;
      nextUp?: string;
      wins?: string[];
      message?: string;
    }
  | { kind: "streak_nudge"; streakDays?: number; lastTrained?: string }
  | { kind: "new_content"; title: string; description?: string; items?: string[] }
  | { kind: "welcome"; name?: string }
  | { kind: "password_reset"; actionUrl: string }
  | { kind: "test" };

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  sender: EmailSender;
};

const url = (path: string) => `${APP_URL}${path}`;

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function verdictFor(score: number) {
  if (score >= 80) return "Strong — hold this and keep building.";
  if (score >= 60) return "Solid base with clear room to sharpen.";
  if (score >= 40) return "Workable, but this is your limiting factor right now.";
  return "This is the first thing worth fixing.";
}

/** Builds subject/html/text for any app email. */
export function renderAppEmail(email: AppEmail): RenderedEmail {
  const built = build(email);
  const html = emailLayout({
    heading: built.heading,
    subheading: built.subheading,
    body: built.body,
    preheader: built.preheader,
    ctaLabel: built.ctaLabel,
    ctaUrl: built.ctaUrl,
    secondaryLabel: built.secondaryLabel,
    secondaryUrl: built.secondaryUrl,
    ctaNote: built.ctaNote,
    sender: built.sender,
  });
  return {
    subject: built.subject,
    html,
    text: `${built.heading}\n\n${stripHtml(built.body)}${built.ctaUrl ? `\n\n${built.ctaLabel}: ${built.ctaUrl}` : ""}`,
    sender: built.sender,
  };
}

type Built = {
  subject: string;
  heading: string;
  subheading?: string;
  preheader: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  ctaNote?: string;
  sender: EmailSender;
};

function build(email: AppEmail): Built {
  switch (email.kind) {
    /* --------------------------------------------------- tool results */
    case "tool_result": {
      const hasScore = typeof email.score === "number";
      const actions =
        email.actions?.length
          ? email.actions
          : [
              "Open the full breakdown in the app.",
              "Give your lowest area one focused block this week.",
              "Re-run the test in 3–4 weeks.",
            ];

      const body = [
        hasScore
          ? scoreBlock({
              value: String(email.score),
              label: `${email.toolName} score`,
              caption: verdictFor(email.score as number),
            })
          : "",
        sectionTitle("Your result"),
        p(`<strong>${esc(email.resultTitle)}</strong>`),
        email.summary ? p(esc(email.summary)) : "",
        email.details?.length ? sectionTitle("What you answered") + detailRows(email.details) : "",
        sectionTitle("What to do next"),
        steps(actions.slice(0, 3)),
        callout("Re-test in 3–4 weeks", "One score is a snapshot. Direction of travel is the signal."),
      ].join("");

      return {
        subject: `Your ${email.toolName} results${hasScore ? ` — ${email.score}` : ""}`,
        heading: `${email.toolName}: ${email.resultTitle}`,
        subheading: "Saved to your account so you can compare it against your next check-in.",
        preheader: `Your ${email.toolName} result, what it means, and the next step.`,
        body,
        ctaLabel: "View the full breakdown",
        ctaUrl: url("/tools"),
        secondaryLabel: "Start today's session",
        secondaryUrl: url("/immersion"),
        sender: "brand",
      };
    }

    /* -------------------------------------------------------- rewards */
    case "reward": {
      const plural = email.badgeNames.length > 1;
      const tiles = [
        ...(email.totalBadges ? [{ value: String(email.totalBadges), label: "Total rewards" }] : []),
        { value: String(email.badgeNames.length), label: plural ? "New today" : "New" },
        ...(email.streakDays ? [{ value: `${email.streakDays}d`, label: "Streak" }] : []),
      ];
      const body = [
        badge("🏅"),
        sectionTitle(plural ? "New rewards" : "New reward"),
        bullets(email.badgeNames),
        tiles.length > 1 ? statTiles(tiles) : "",
        callout("Keep the chain going", "The next reward is usually one or two sessions away."),
      ].join("");

      return {
        subject: plural ? "You just earned new rewards" : `You just earned: ${email.badgeNames[0]}`,
        heading: plural ? "New rewards unlocked" : "Reward unlocked",
        subheading: "Earned the hard way — by showing up.",
        preheader: "Your training just paid off.",
        body,
        ctaLabel: "See your rewards",
        ctaUrl: url("/rewards"),
        sender: "mike",
      };
    }

    /* --------------------------------------------------- certificates */
    case "certificate": {
      const body = [
        badge("🎖"),
        detailRows([
          { label: "Awarded to", value: email.athleteName || "Kettlebell Lifestyle Athlete" },
          { label: "Program", value: email.title },
          ...(email.issuedOn ? [{ label: "Completed", value: email.issuedOn }] : []),
          ...(email.phases?.length ? [{ label: "Phases finished", value: String(email.phases.length) }] : []),
        ]),
        email.phases?.length ? sectionTitle("What you worked through") + bullets(email.phases) : "",
        callout("Your PDF is attached", "It's also in your account any time you want to download or share it."),
      ].join("");

      return {
        subject: `Your certificate: ${email.title}`,
        heading: "You earned your certificate",
        subheading: "Congratulations — that's a real milestone.",
        preheader: "Your certificate is attached as a PDF.",
        body,
        ctaLabel: "View your certificate",
        ctaUrl: url("/rewards"),
        secondaryLabel: "Choose what's next",
        secondaryUrl: url("/programs"),
        sender: "mike",
      };
    }

    /* ------------------------------------------------------ schedules */
    case "schedule_created": {
      const body = [
        badge("📅"),
        detailRows([
          { label: "Schedule", value: email.scheduleName },
          ...(email.courseLabel ? [{ label: "Program", value: email.courseLabel }] : []),
          { label: "Starts", value: email.startDate },
          ...(email.daysPerWeek ? [{ label: "Training days", value: `${email.daysPerWeek} per week` }] : []),
          ...(email.reminderTime ? [{ label: "Daily reminder", value: email.reminderTime }] : []),
        ]),
        email.firstDays?.length ? sectionTitle("Your first sessions") + bullets(email.firstDays) : "",
        callout("Block the slot", "Add your first session to your calendar at the reminder time."),
      ].join("");

      return {
        subject: `Your training schedule starts ${email.startDate}`,
        heading: `${email.scheduleName} is live`,
        subheading: `First session: ${email.startDate}.`,
        preheader: "Your plan is set — here's what to expect.",
        body,
        ctaLabel: "Open your schedule",
        ctaUrl: url("/schedule"),
        sender: "brand",
      };
    }

    /* ------------------------------------------------------ reminders */
    case "training_reminder": {
      const body = [
        badge("🔔"),
        email.message ? p(esc(email.message)) : "",
        statTiles([
          ...(email.minutes ? [{ value: `${email.minutes}m`, label: "Today" }] : []),
          ...(email.lessons?.length ? [{ value: String(email.lessons.length), label: "Lessons" }] : []),
          ...(email.streakDays ? [{ value: `${email.streakDays}d`, label: "Streak" }] : []),
        ]),
        email.dayLabel || email.phaseLabel
          ? detailRows([
              ...(email.dayLabel ? [{ label: "Today", value: email.dayLabel }] : []),
              ...(email.phaseLabel ? [{ label: "Phase", value: email.phaseLabel }] : []),
            ])
          : "",
        email.lessons?.length ? sectionTitle("In today's session") + bullets(email.lessons) : "",
        callout("Short on time?", "Warm-up plus the first block still counts. Keep the chain alive."),
      ].join("");

      return {
        subject: email.dayLabel ? `Today: ${email.dayLabel}` : "Time to train",
        heading: "Your session is ready",
        subheading: email.phaseLabel ? esc(email.phaseLabel) : undefined,
        preheader: "Everything you need for today is one tap away.",
        body,
        ctaLabel: "Start today's session",
        // Scheduled sessions live in Self-Guided; deep-link to the exact day when known.
        ctaUrl: url(email.dayId ? `/self-guided/day/${email.dayId}` : "/self-guided"),
        secondaryLabel: "Change reminder time",
        secondaryUrl: url("/account"),
        sender: "brand",
      };
    }

    case "weekly_summary": {
      const tiles = [
        { value: String(email.daysCompleted ?? 0), label: "Days" },
        { value: String(email.lessonsCompleted ?? 0), label: "Lessons" },
        { value: email.minutes ? `${email.minutes}m` : `${email.streakDays ?? 0}d`, label: email.minutes ? "Minutes" : "Streak" },
      ];
      const body = [
        statTiles(tiles),
        progressBar(Math.min(100, ((email.daysCompleted ?? 0) / 5) * 100), "Week target · 5 days"),
        email.wins?.length ? sectionTitle("Wins this week") + bullets(email.wins) : "",
        callout("Next up", email.nextUp ?? "Your next scheduled day is ready in Immersion."),
      ].join("");

      return {
        subject: `Your week: ${email.daysCompleted ?? 0} days, ${email.lessonsCompleted ?? 0} lessons`,
        heading: "Here's how your week went",
        subheading: email.streakDays ? `${email.streakDays}-day streak and counting.` : undefined,
        preheader: "Your training week in numbers.",
        body,
        ctaLabel: "Open your progress",
        ctaUrl: url("/immersion"),
        sender: "brand",
      };
    }

    case "streak_nudge": {
      const body = [
        badge("🔥"),
        p(
          email.streakDays
            ? `Your ${email.streakDays}-day streak is still standing. One session keeps it alive.`
            : "It's been a few days. One short session gets you back.",
        ),
        email.lastTrained ? detailRows([{ label: "Last session", value: email.lastTrained }]) : "",
        callout("The 10-minute way back", "Do the warm-up only. Most days you'll finish the session anyway."),
      ].join("");

      return {
        subject: email.streakDays ? `Keep your ${email.streakDays}-day streak alive` : "Ready when you are",
        heading: "One session gets you back",
        preheader: "A short session counts. Start there.",
        body,
        ctaLabel: "Train now",
        ctaUrl: url("/immersion"),
        sender: "brand",
      };
    }

    case "new_content": {
      const body = [
        badge("🎬"),
        email.description ? p(esc(email.description)) : "",
        email.items?.length ? sectionTitle("What's included") + bullets(email.items) : "",
      ].join("");
      return {
        subject: `New in your library: ${email.title}`,
        heading: "New content just landed",
        subheading: esc(email.title),
        preheader: "Fresh material is available in your library.",
        body,
        ctaLabel: "Open the library",
        ctaUrl: url("/library"),
        sender: "brand",
      };
    }

    /* -------------------------------------------------------- account */
    case "welcome": {
      const body = [
        badge("👋"),
        sectionTitle("Start here"),
        steps([
          "Finish onboarding — it sets your level.",
          "Run the kettlebell selector for the right load.",
          "Complete Day 1 in Immersion.",
          "Set a daily reminder time.",
        ]),
        sectionTitle("What's included"),
        bullets([
          "The full Immersion program, day by day.",
          "The complete video library with filters.",
          "Assessment tools that track change over time.",
          "Certificates and rewards as you progress.",
        ]),
        callout("One habit decides everything", "Train at the same time of day."),
      ].join("");
      return {
        subject: "Welcome to Kettlebell Lifestyle — start here",
        heading: email.name?.trim() ? `Welcome, ${esc(email.name.trim())}` : "Welcome to Kettlebell Lifestyle",
        subheading: "Four short steps and you're training today.",
        preheader: "Your account is ready — here's how to get the most out of it.",
        body,
        ctaLabel: "Finish setup",
        ctaUrl: url("/onboarding"),
        secondaryLabel: "Browse the library",
        secondaryUrl: url("/library"),
        sender: "mike",
      };
    }

    case "password_reset": {
      const body = [
        badge("🔑"),
        bullets([
          "The link below works once and expires shortly.",
          "Your current password stays active until you change it.",
          "Didn't request this? Ignore the email.",
        ]),
      ].join("");

      return {
        subject: "Reset your Kettlebell Lifestyle password",
        heading: "Reset your password",
        subheading: "This link is single-use and expires shortly.",
        preheader: "Choose a new password for your account.",
        body,
        ctaLabel: "Choose a new password",
        ctaUrl: email.actionUrl,
        ctaNote: "If you didn't ask for this, you can safely ignore this email.",
        sender: "brand",
      };
    }

    case "test": {
      const body = [
        p("This is a test message from your Kettlebell Lifestyle account — email delivery is working."),
        sectionTitle("What will arrive here"),
        bullets([
          "Training reminders at the time you set.",
          "Streak nudges if you go quiet for a few days.",
          "Your weekly summary of days, lessons and streak.",
          "Tool results, rewards, certificates and new schedules.",
        ]),
        callout("Full control", "Every one of these can be switched on or off individually in Account → Notifications."),
      ].join("");
      return {
        subject: "Your Kettlebell Lifestyle emails are working",
        heading: "Email notifications are live",
        subheading: "Delivery confirmed to this address.",
        preheader: "Test email — everything is wired up correctly.",
        body,
        ctaLabel: "Manage notifications",
        ctaUrl: url("/account"),
        sender: "brand",
      };
    }
  }
}
