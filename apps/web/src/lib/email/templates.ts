/**
 * The copy for every email the app sends (ported from the original app's email-content.server.ts).
 * One renderer per email, so the cron sender, the Studio preview and "Send me a test" are identical.
 */
import { appUrl, BRAND } from "./config";
import { renderLayout, type Block, type EmailContent, type RenderedEmail } from "./layout";

export type AppEmail =
  | {
      kind: "tool_result";
      toolName: string;
      resultTitle: string;
      score?: number;
      scoreMax?: number;
      summary?: string;
      details?: { label: string; value: string }[];
      actions?: string[];
    }
  | { kind: "reward"; badgeNames: string[]; totalBadges?: number; streakDays?: number }
  | { kind: "certificate"; title: string; athleteName?: string; issuedOn?: string; phases?: string[]; certificateId?: string; verifyCode?: string }
  | {
      kind: "schedule_created";
      scheduleName: string;
      startDate: string;
      courseLabel?: string;
      reminderTime?: string;
      daysPerWeek?: number;
      firstDays?: string[];
      planId?: string;
    }
  | {
      kind: "training_reminder";
      dayLabel?: string;
      href?: string;
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
  | { kind: "streak_nudge"; streakDays?: number; lastTrained?: string; atRisk?: boolean }
  | { kind: "new_content"; title: string; description?: string; items?: string[]; href?: string; /** Header photo without baked-in text (path or URL). */ image?: { src: string; alt: string } }
  | { kind: "welcome"; name?: string }
  | { kind: "password_reset"; actionUrl: string }
  | { kind: "test"; to?: string };

export type EmailKind = AppEmail["kind"];

const url = (path: string) => (/^https?:/.test(path) ? path : `${appUrl()}${path}`);

function verdictFor(score: number) {
  if (score >= 80) return "Strong — hold this and keep building.";
  if (score >= 60) return "Solid base with clear room to sharpen.";
  if (score >= 40) return "Workable, but this is your limiting factor right now.";
  return "This is the first thing worth fixing.";
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function renderEmail(email: AppEmail): RenderedEmail {
  return renderLayout(build(email));
}

function build(email: AppEmail): EmailContent {
  switch (email.kind) {
    /* ------------------------------------------------------------ tools */
    case "tool_result": {
      const hasScore = typeof email.score === "number";
      const pct = hasScore && email.scoreMax ? Math.round(((email.score as number) / email.scoreMax) * 100) : (email.score as number);
      const actions = email.actions?.length
        ? email.actions
        : ["Open the full breakdown in the app.", "Give your lowest area one focused block this week.", "Run it again in 3–4 weeks."];
      const blocks: Block[] = [
        ...(hasScore
          ? [{ t: "score" as const, value: email.scoreMax ? `${email.score}/${email.scoreMax}` : String(email.score), label: `${email.toolName} score`, caption: verdictFor(pct) }]
          : []),
        { t: "section", text: "Your result" },
        { t: "p", text: email.resultTitle, strong: true },
        ...(email.summary ? [{ t: "p" as const, text: email.summary }] : []),
        ...(email.details?.length ? [{ t: "section" as const, text: "What you answered" }, { t: "details" as const, rows: email.details }] : []),
        { t: "section", text: "What to do next" },
        { t: "steps", items: actions.slice(0, 3) },
        { t: "callout", title: "Check in again in 3–4 weeks", text: "One result is a snapshot. The direction of travel is the signal." },
      ];
      return {
        subject: `Your ${email.toolName} results${hasScore ? ` — ${email.scoreMax ? `${email.score}/${email.scoreMax}` : email.score}` : ""}`,
        preheader: `Your ${email.toolName} result, what it means, and the next step.`,
        eyebrow: email.toolName,
        heading: `Your ${email.toolName} result`,
        subheading: "Saved to your account so you can compare it with your next check-in.",
        blocks,
        cta: { label: "View the full breakdown", url: url("/you/saves") },
        secondary: { label: "Start today's session", url: url("/today") },
        sender: "brand",
      };
    }

    /* ------------------------------------------------------------ milestones */
    case "reward": {
      const many = email.badgeNames.length > 1;
      return {
        subject: many ? "You just earned new rewards" : `You just earned: ${email.badgeNames[0]}`,
        preheader: "Your training just paid off.",
        eyebrow: many ? "New rewards" : "Reward unlocked",
        heading: many ? `${email.badgeNames.length} new medals` : email.badgeNames[0] ?? "Reward unlocked",
        subheading: "Earned the hard way — by showing up.",
        blocks: [
          { t: "achievement", label: many ? "Unlocked today" : "Unlocked", items: email.badgeNames },
          {
            t: "stats",
            tiles: [
              { value: email.totalBadges ? String(email.totalBadges) : "", label: "Medals in total" },
              { value: String(email.badgeNames.length), label: many ? "New today" : "New", warm: true },
              { value: email.streakDays ? `${email.streakDays}d` : "", label: "Streak", warm: true },
            ],
          },
          { t: "callout", title: "Keep the chain going", text: "The next medal is usually one or two sessions away." },
        ],
        cta: { label: "See your rewards", url: url("/you/rewards") },
        tone: "warm",
        sender: "mike",
      };
    }

    case "certificate":
      return {
        subject: `Your certificate: ${email.title}`,
        preheader: "Your certificate is ready to view, print or share.",
        eyebrow: "Certificate",
        heading: "You earned your certificate",
        subheading: "Congratulations — that's a real milestone.",
        blocks: [
          {
            t: "details",
            rows: [
              { label: "Awarded to", value: email.athleteName || `${BRAND} athlete` },
              { label: "Program", value: email.title },
              ...(email.issuedOn ? [{ label: "Completed", value: email.issuedOn }] : []),
              ...(email.phases?.length ? [{ label: "Phases finished", value: String(email.phases.length) }] : []),
              ...(email.verifyCode ? [{ label: "Verification code", value: email.verifyCode }] : []),
            ],
          },
          ...(email.phases?.length ? [{ t: "achievement" as const, label: "Camps you passed on the way up", items: email.phases }] : []),
          { t: "callout", title: "Yours to keep", text: "Your certificate lives in your account — view it, save it as a PDF or share the verification link any time." },
        ],
        cta: { label: "View your certificate", url: url(email.certificateId ? `/you/certificates/${email.certificateId}` : "/you/rewards") },
        secondary: { label: "Choose what's next", url: url("/programs") },
        hero: { src: "/media/email/certificate.jpg", alt: "Men of Movement on the summit ridge facing Mount Shasta" },
        tone: "warm",
        sender: "mike",
      };

    /* ------------------------------------------------------------ schedules and reminders */
    case "schedule_created":
      return {
        subject: `Your training schedule starts ${email.startDate}`,
        preheader: "Your plan is set — here's what to expect.",
        eyebrow: "Schedule created",
        heading: `${email.scheduleName} is live`,
        subheading: `First session: ${email.startDate}.`,
        blocks: [
          {
            t: "details",
            rows: [
              { label: "Schedule", value: email.scheduleName },
              ...(email.courseLabel ? [{ label: "Program", value: email.courseLabel }] : []),
              { label: "Starts", value: email.startDate },
              ...(email.daysPerWeek ? [{ label: "Training days", value: `${email.daysPerWeek} per week` }] : []),
              ...(email.reminderTime ? [{ label: "Daily reminder", value: email.reminderTime }] : []),
            ],
          },
          ...(email.firstDays?.length ? [{ t: "section" as const, text: "Your first sessions" }, { t: "bullets" as const, items: email.firstDays }] : []),
          { t: "callout", title: "Block the slot", text: "Add your sessions to your calendar from the Plan page — Apple, Google and Outlook all work." },
        ],
        cta: { label: "Open your schedule", url: url("/plan") },
        hero: { src: "/media/email/schedule.jpg", alt: "Morning practice on the rocks below Mount Shasta" },
        sender: "brand",
      };

    case "training_reminder":
      return {
        subject: email.dayLabel ? `Today: ${email.dayLabel}` : "Time to train",
        preheader: "Everything you need for today is one tap away.",
        eyebrow: "Training reminder",
        heading: "Your session is ready",
        subheading: email.phaseLabel,
        blocks: [
          ...(email.message ? [{ t: "p" as const, text: email.message }] : []),
          {
            t: "stats",
            tiles: [
              { value: email.minutes ? `${email.minutes}m` : "", label: "Today" },
              { value: email.lessons?.length ? String(email.lessons.length) : "", label: email.lessons?.length === 1 ? "Session" : "Sessions" },
              { value: email.streakDays ? `${email.streakDays}d` : "", label: "Streak", warm: true },
            ],
          },
          ...(email.dayLabel ? [{ t: "details" as const, rows: [{ label: "Today", value: email.dayLabel }, ...(email.phaseLabel ? [{ label: "From", value: email.phaseLabel }] : [])] }] : []),
          ...(email.lessons && email.lessons.length > 1 ? [{ t: "section" as const, text: "On today's plan" }, { t: "bullets" as const, items: email.lessons }] : []),
          { t: "callout", title: "Short on time?", text: "The warm-up and the first block still count. Keep the chain alive." },
        ],
        cta: { label: "Start today's session", url: url(email.href ?? "/today") },
        secondary: { label: "Change reminder time", url: url("/plan#reminders") },
        hero: { src: "/media/email/reminder.jpg", alt: "Mike Salemi in a kettlebell windmill" },
        sender: "brand",
      };

    case "weekly_summary": {
      const days = email.daysCompleted ?? 0;
      return {
        subject: `Your week: ${plural(days, "day")}, ${plural(email.lessonsCompleted ?? 0, "lesson")}`,
        preheader: "Your training week in numbers.",
        eyebrow: "Weekly summary",
        heading: "Here's how your week went",
        subheading: email.streakDays ? `${email.streakDays}-day streak and counting.` : undefined,
        blocks: [
          ...(email.message ? [{ t: "p" as const, text: email.message }] : []),
          {
            t: "stats",
            tiles: [
              { value: String(days), label: "Days" },
              { value: String(email.lessonsCompleted ?? 0), label: "Lessons" },
              email.minutes ? { value: `${email.minutes}m`, label: "Minutes" } : { value: `${email.streakDays ?? 0}d`, label: "Streak", warm: true },
            ],
          },
          { t: "progress", percent: Math.min(100, (days / 5) * 100), label: "Week target · 5 days" },
          ...(email.wins?.length ? [{ t: "achievement" as const, label: "Wins this week", items: email.wins }] : []),
          { t: "callout", title: "Next up", text: email.nextUp ?? "Your next session is waiting on Today." },
        ],
        cta: { label: "Open your progress", url: url("/today") },
        hero: { src: "/media/email/weekly.jpg", alt: "Mike coaching a member through a kettlebell get-up" },
        tone: "warm",
        sender: "brand",
      };
    }

    case "streak_nudge":
      return {
        subject: email.streakDays ? (email.atRisk ? `Keep your ${email.streakDays}-day streak alive` : "Ready when you are") : "Ready when you are",
        preheader: "A short session counts. Start there.",
        eyebrow: "Streak nudge",
        heading: "One session gets you back",
        blocks: [
          {
            t: "p",
            text:
              email.atRisk && email.streakDays
                ? `Your ${email.streakDays}-day streak is still standing. One session today keeps it alive.`
                : "It's been a few days. One short session gets you back into the rhythm.",
          },
          ...(email.atRisk && email.streakDays ? [{ t: "stats" as const, tiles: [{ value: `${email.streakDays}d`, label: "Streak still standing", warm: true }, { value: email.lastTrained ?? "", label: "Last session" }] }] : []),
          ...(email.lastTrained && !(email.atRisk && email.streakDays) ? [{ t: "details" as const, rows: [{ label: "Last session", value: email.lastTrained }] }] : []),
          { t: "callout", title: "The 10-minute way back", text: "Do the warm-up only. Most days you'll finish the session anyway." },
        ],
        cta: { label: "Train now", url: url("/today") },
        tone: "warm",
        sender: "brand",
      };

    case "new_content":
      return {
        subject: `New in your library: ${email.title}`,
        preheader: "Fresh material is available in your library.",
        eyebrow: "New content",
        heading: "New content just landed",
        subheading: email.title,
        blocks: [
          ...(email.description ? [{ t: "p" as const, text: email.description }] : []),
          ...(email.items?.length ? [{ t: "section" as const, text: "What's included" }, { t: "bullets" as const, items: email.items }] : []),
        ],
        cta: { label: "Open the library", url: url(email.href ?? "/library") },
        hero: email.image,
        sender: "brand",
      };

    /* ------------------------------------------------------------ account */
    case "welcome":
      return {
        subject: `Welcome to ${BRAND} — start here`,
        preheader: "Your account is ready — here's how to get the most out of it.",
        eyebrow: "Welcome",
        heading: email.name?.trim() ? `Welcome, ${email.name.trim()}` : `Welcome to ${BRAND}`,
        subheading: "Four short steps and you're training today.",
        blocks: [
          { t: "section", text: "Start here" },
          {
            t: "steps",
            items: [
              "Tell us your goal — it shapes your plan.",
              "Run the Kettlebell Selector for the right load.",
              "Complete Day 1 of your program.",
              "Set a reminder time that fits your day.",
            ],
          },
          { t: "section", text: "What's included" },
          {
            t: "bullets",
            items: [
              "Programs day by day, at your pace or on a schedule.",
              "The complete video library with filters.",
              "Assessment tools that track change over time.",
              "Medals and certificates as you progress.",
            ],
          },
          { t: "callout", title: "One habit decides everything", text: "Train at the same time of day." },
        ],
        cta: { label: "Finish setup", url: url("/today") },
        secondary: { label: "Browse the library", url: url("/library") },
        hero: { src: "/media/email/welcome.jpg", alt: "Mike Salemi in his gym with a kettlebell" },
        sender: "mike",
      };

    case "password_reset":
      return {
        subject: `Reset your ${BRAND} password`,
        preheader: "Choose a new password for your account.",
        eyebrow: "Account",
        heading: "Reset your password",
        subheading: "This link is single-use and expires shortly.",
        blocks: [
          {
            t: "bullets",
            items: [
              "The button below works once and expires within the hour.",
              "Your current password keeps working until you change it.",
              "Didn't ask for this? You can ignore this email.",
            ],
          },
        ],
        cta: { label: "Choose a new password", url: email.actionUrl },
        ctaNote: "If you didn't ask for this, you can safely ignore this email.",
        sender: "brand",
      };

    case "test":
      return {
        subject: `Your ${BRAND} emails are working`,
        preheader: "Test email — everything is wired up correctly.",
        eyebrow: "Test email",
        heading: "Email notifications are live",
        subheading: email.to ? `Delivery confirmed to ${email.to}.` : "Delivery confirmed to this address.",
        blocks: [
          { t: "p", text: `This is a test message from your ${BRAND} account — email delivery is working.` },
          { t: "section", text: "What will arrive here" },
          {
            t: "bullets",
            items: [
              "Training reminders at the time you set.",
              "Streak nudges if you go quiet for a few days.",
              "Your weekly summary of days, lessons and streak.",
              "Tool results, medals, certificates and new schedules.",
            ],
          },
          { t: "callout", title: "Full control", text: "Every one of these can be switched on or off in Settings → Notifications." },
        ],
        cta: { label: "Manage notifications", url: url("/you/settings#notifications") },
        sender: "brand",
      };
  }
}
