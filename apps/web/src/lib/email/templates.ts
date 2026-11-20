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
  | { kind: "test"; to?: string }
  /* billing (Stripe webhook → enqueueBillingEmail) */
  | { kind: "payment_receipt"; itemName: string; amount: string; paidOn: string; reference?: string; nextBilling?: string; receiptUrl?: string; renewal?: boolean }
  | { kind: "payment_failed"; planName: string; amount?: string; retryOn?: string; accessUntil?: string }
  | { kind: "plan_ending"; planName: string; endsOn: string }
  | { kind: "plan_ended"; planName: string; endedOn?: string }
  | { kind: "plan_paused"; planName: string; resumesOn?: string }
  /* shop */
  | {
      kind: "order_confirmation";
      reference: string;
      items: { name: string; quantity: number; amount: string }[];
      total: string;
      shipping?: string;
      shipTo?: string;
      physical?: boolean;
    }
  | { kind: "order_shipped"; reference: string; items: string[]; carrier?: string; trackingNumber?: string; trackingUrl?: string; shipTo?: string }
  /* coaching and retreats */
  | { kind: "coaching_booked"; when: string; minutes: number; packageName?: string; meetingUrl?: string; bookingId?: string }
  | { kind: "coaching_reminder"; when: string; minutes: number; packageName?: string; meetingUrl?: string; bookingId?: string }
  | { kind: "retreat_application_received"; retreatName: string; dates?: string; place?: string; runId?: string }
  | { kind: "retreat_application_update"; retreatName: string; status: "accepted" | "waitlist"; dates?: string; place?: string; runId?: string }
  /* growth */
  | { kind: "referral_reward"; friendName?: string; days: number; proUntil?: string; points?: number }
  | { kind: "win_back"; name?: string; daysAway: number; programName?: string; href?: string };

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

    /* ------------------------------------------------------------ billing */
    case "payment_receipt":
      return {
        subject: `Receipt: ${email.itemName} · ${email.amount}`,
        preheader: `We received your payment of ${email.amount}. Thank you.`,
        eyebrow: "Receipt",
        heading: "Payment received",
        subheading: email.renewal ? `Your ${email.itemName} renewed. Nothing to do on your side.` : `Thank you. ${email.itemName} is ready in your account.`,
        blocks: [
          {
            t: "details",
            rows: [
              { label: "For", value: email.itemName },
              { label: "Amount", value: email.amount },
              { label: "Paid on", value: email.paidOn },
              ...(email.reference ? [{ label: "Reference", value: email.reference }] : []),
              ...(email.nextBilling ? [{ label: "Next payment", value: email.nextBilling }] : []),
            ],
          },
          { t: "callout", title: "Keep this for your records", text: "Every receipt and invoice also lives under Billing in your account." },
        ],
        cta: { label: "View billing", url: url("/you/billing") },
        ...(email.receiptUrl ? { secondary: { label: "Download invoice", url: email.receiptUrl } } : {}),
        sender: "brand",
      };

    case "payment_failed":
      return {
        subject: `Your payment for ${email.planName} didn't go through`,
        preheader: "Update your card to keep your access. It takes a minute.",
        eyebrow: "Payment issue",
        heading: "Your payment didn't go through",
        subheading: "Your access stays on for now. A quick card update keeps it that way.",
        blocks: [
          {
            t: "details",
            rows: [
              { label: "Plan", value: email.planName },
              ...(email.amount ? [{ label: "Amount", value: email.amount }] : []),
              ...(email.retryOn ? [{ label: "We'll try again", value: email.retryOn }] : []),
              ...(email.accessUntil ? [{ label: "Access until", value: email.accessUntil }] : []),
            ],
          },
          { t: "section", text: "Common reasons" },
          { t: "bullets", items: ["The card has expired or was replaced.", "Your bank paused an international payment.", "Not enough funds on the day."] },
          { t: "callout", title: "Nothing is lost", text: "Your progress, plans and medals stay exactly where they are." },
        ],
        cta: { label: "Update payment method", url: url("/you/billing") },
        sender: "brand",
      };

    case "plan_ending":
      return {
        subject: `Your ${email.planName} plan ends ${email.endsOn}`,
        preheader: "You keep full access until then. Change your mind any time.",
        eyebrow: "Plan update",
        heading: "Your plan is set to end",
        subheading: `You keep everything in ${email.planName} until ${email.endsOn}.`,
        blocks: [
          { t: "details", rows: [{ label: "Plan", value: email.planName }, { label: "Access until", value: email.endsOn }, { label: "Further payments", value: "None" }] },
          { t: "section", text: "What happens next" },
          { t: "bullets", items: ["Keep training as normal until the end date.", "Your progress, medals and certificates stay in your account.", "You can turn renewal back on with one tap before then."] },
          { t: "callout", title: "Changed your mind?", text: "Keep your plan from Billing and nothing changes." },
        ],
        cta: { label: "Keep my plan", url: url("/you/billing") },
        sender: "brand",
      };

    case "plan_ended":
      return {
        subject: `Your ${email.planName} plan has ended`,
        preheader: "Your progress is saved. Pick up where you left off whenever you're ready.",
        eyebrow: "Plan update",
        heading: "Your plan has ended",
        subheading: email.endedOn ? `${email.planName} ended on ${email.endedOn}.` : `${email.planName} has ended.`,
        blocks: [
          { t: "p", text: "Thank you for training with us. Your account stays open and everything you built is saved." },
          { t: "section", text: "Still yours" },
          { t: "bullets", items: ["Your progress and training history.", "Medals and certificates you earned.", "Any program you bought outright."] },
          { t: "callout", title: "Come back any time", text: "Restart your plan and you pick up exactly where you stopped." },
        ],
        cta: { label: "See plans", url: url("/you/billing") },
        sender: "brand",
      };

    case "plan_paused":
      return {
        subject: `Your ${email.planName} plan is paused`,
        preheader: email.resumesOn ? `No payments until ${email.resumesOn}.` : "No payments while it's paused.",
        eyebrow: "Plan update",
        heading: "Your plan is paused",
        subheading: email.resumesOn ? `It picks up again on ${email.resumesOn}.` : "It stays paused until you resume it.",
        blocks: [
          { t: "details", rows: [{ label: "Plan", value: email.planName }, { label: "Payments", value: "Paused" }, ...(email.resumesOn ? [{ label: "Resumes", value: email.resumesOn }] : [])] },
          { t: "callout", title: "Your progress is safe", text: "Everything stays where you left it. Resume early from Billing any time." },
        ],
        cta: { label: "Manage my plan", url: url("/you/billing") },
        sender: "brand",
      };

    /* ------------------------------------------------------------ shop */
    case "order_confirmation":
      return {
        subject: `Order confirmed · ${email.reference}`,
        preheader: email.physical ? "Thank you. We'll email you again when it ships." : "Thank you. Your order is confirmed.",
        eyebrow: "Order confirmed",
        heading: "Thank you for your order",
        subheading: email.physical ? "We're getting it ready. You'll hear from us again when it ships." : "Your order is confirmed.",
        blocks: [
          { t: "section", text: `Order ${email.reference}` },
          {
            t: "details",
            rows: [
              ...email.items.map((i) => ({ label: i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name, value: i.amount })),
              ...(email.shipping ? [{ label: "Shipping", value: email.shipping }] : []),
              { label: "Total", value: email.total },
            ],
          },
          ...(email.shipTo ? [{ t: "section" as const, text: "Shipping to" }, { t: "p" as const, text: email.shipTo }] : []),
          ...(email.physical ? [{ t: "callout" as const, title: "What happens next", text: "We'll email you tracking details the moment it leaves us." }] : []),
        ],
        cta: { label: "View your order", url: url("/you/billing") },
        secondary: { label: "Back to the shop", url: url("/shop") },
        sender: "brand",
      };

    case "order_shipped":
      return {
        subject: `Your order ${email.reference} is on its way`,
        preheader: email.trackingNumber ? `Tracking: ${email.trackingNumber}` : "Your order has left us.",
        eyebrow: "Shipped",
        heading: "Your order is on its way",
        subheading: email.carrier ? `Sent with ${email.carrier}.` : "It has left us and is heading to you.",
        blocks: [
          {
            t: "details",
            rows: [
              { label: "Order", value: email.reference },
              ...(email.carrier ? [{ label: "Carrier", value: email.carrier }] : []),
              ...(email.trackingNumber ? [{ label: "Tracking number", value: email.trackingNumber }] : []),
              ...(email.shipTo ? [{ label: "Shipping to", value: email.shipTo }] : []),
            ],
          },
          ...(email.items.length ? [{ t: "section" as const, text: "In the box" }, { t: "bullets" as const, items: email.items }] : []),
          { t: "callout", title: "When it arrives", text: "Start light with a new bell. Your first session in the app shows you how to set up." },
        ],
        cta: email.trackingUrl ? { label: "Track your parcel", url: email.trackingUrl } : { label: "View your order", url: url("/you/billing") },
        ...(email.trackingUrl ? { secondary: { label: "View your order", url: url("/you/billing") } } : {}),
        sender: "brand",
      };

    /* ------------------------------------------------------------ coaching and retreats */
    case "coaching_booked":
      return {
        subject: `Your call with Mike is booked · ${email.when}`,
        preheader: "Your coaching call is in the calendar. Here's how to get ready.",
        eyebrow: "Coaching",
        heading: "Your call is booked",
        subheading: email.when,
        blocks: [
          {
            t: "details",
            rows: [
              { label: "When", value: email.when },
              { label: "Length", value: `${email.minutes} minutes` },
              ...(email.packageName ? [{ label: "Package", value: email.packageName }] : []),
              { label: "Where", value: email.meetingUrl ? "Video call (link below)" : "Video call, link to follow" },
            ],
          },
          { t: "section", text: "Before the call" },
          { t: "steps", items: ["Answer the short prep questions so we start on what matters.", "Film one set of your main lift if you can.", "Find a quiet spot with room to move."] },
          { t: "callout", title: "Need to move it?", text: "Move or cancel up to 24 hours before in Sessions." },
        ],
        cta: { label: "Prepare for your call", url: url(email.bookingId ? `/coaching/prep/${email.bookingId}` : "/coaching/sessions") },
        ...(email.meetingUrl ? { secondary: { label: "Join link", url: email.meetingUrl } } : {}),
        sender: "mike",
      };

    case "coaching_reminder":
      return {
        subject: `Tomorrow: your call with Mike · ${email.when}`,
        preheader: "Your coaching call is in about 24 hours.",
        eyebrow: "Coaching reminder",
        heading: "Your call is tomorrow",
        subheading: email.when,
        blocks: [
          { t: "details", rows: [{ label: "When", value: email.when }, { label: "Length", value: `${email.minutes} minutes` }, ...(email.packageName ? [{ label: "Package", value: email.packageName }] : [])] },
          { t: "section", text: "Two minutes now saves ten on the call" },
          { t: "bullets", items: ["Check your prep answers are filled in.", "Have water, a bell and some floor space ready.", "Join a minute early to test sound and camera."] },
          { t: "callout", title: "Can't make it?", text: "Send Mike a message as soon as you can, so the slot can go to someone else." },
        ],
        cta: email.meetingUrl ? { label: "Join the call", url: email.meetingUrl } : { label: "Open your sessions", url: url("/coaching/sessions") },
        secondary: { label: "Prep questions", url: url(email.bookingId ? `/coaching/prep/${email.bookingId}` : "/coaching/sessions") },
        sender: "mike",
      };

    case "retreat_application_received":
      return {
        subject: `We got your application · ${email.retreatName}`,
        preheader: "Thank you for applying. Here's what happens next.",
        eyebrow: "Retreat application",
        heading: "Your application is in",
        subheading: `Thank you for applying for ${email.retreatName}.`,
        blocks: [
          { t: "details", rows: [{ label: "Retreat", value: email.retreatName }, ...(email.dates ? [{ label: "Dates", value: email.dates }] : []), ...(email.place ? [{ label: "Where", value: email.place }] : []), { label: "Status", value: "Received" }] },
          { t: "section", text: "What happens next" },
          { t: "steps", items: ["Mike reads every application himself.", "If it looks like a fit, we'll invite you to a short call.", "You'll hear back by email either way."] },
          { t: "callout", title: "No payment yet", text: "You only pay once your place is offered and you say yes." },
        ],
        cta: { label: "View your application", url: url(email.runId ? `/experiences/${email.runId}` : "/experiences") },
        sender: "mike",
      };

    case "retreat_application_update": {
      const accepted = email.status === "accepted";
      return {
        subject: accepted ? `You're in · ${email.retreatName}` : `You're on the waitlist · ${email.retreatName}`,
        preheader: accepted ? "Your place is offered. Confirm it to lock it in." : "We'll be in touch the moment a place opens.",
        eyebrow: "Retreat application",
        heading: accepted ? "Your place is offered" : "You're on the waitlist",
        subheading: accepted ? `Mike would love to have you at ${email.retreatName}.` : `${email.retreatName} is full right now, and you're next in line.`,
        blocks: [
          { t: "details", rows: [{ label: "Retreat", value: email.retreatName }, ...(email.dates ? [{ label: "Dates", value: email.dates }] : []), ...(email.place ? [{ label: "Where", value: email.place }] : []), { label: "Status", value: accepted ? "Accepted" : "Waitlist" }] },
          ...(accepted
            ? [
                { t: "section" as const, text: "To confirm your place" },
                { t: "steps" as const, items: ["Open the retreat page.", "Confirm your place and pay securely.", "Watch for your packing list and travel notes."] },
                { t: "callout" as const, title: "Places are limited", text: "Your place is held for a short while. Confirm soon so it doesn't go to the next person." },
              ]
            : [
                { t: "p" as const, text: "Places open up more often than you'd think. If one does, we'll email you straight away." },
                { t: "callout" as const, title: "Keep training", text: "Everything you do in the app now is preparation for the mountain." },
              ]),
        ],
        cta: { label: accepted ? "Confirm my place" : "View the retreat", url: url(email.runId ? `/experiences/${email.runId}` : "/experiences") },
        tone: accepted ? "warm" : undefined,
        sender: "mike",
      };
    }

    /* ------------------------------------------------------------ growth */
    case "referral_reward":
      return {
        subject: `You earned ${email.days} days of Pro`,
        preheader: email.friendName ? `${email.friendName} joined, so Pro is on us.` : "Your friend joined, so Pro is on us.",
        eyebrow: "Referral reward",
        heading: `${email.days} days of Pro, on us`,
        subheading: email.friendName ? `${email.friendName} joined through your invite. Thank you.` : "A friend joined through your invite. Thank you.",
        blocks: [
          {
            t: "stats",
            tiles: [
              { value: `${email.days}`, label: "Days of Pro", warm: true },
              { value: email.points ? String(email.points) : "", label: "Points" },
              { value: email.proUntil ?? "", label: "Pro until" },
            ],
          },
          { t: "p", text: "It's already on your account. Nothing to claim." },
          { t: "callout", title: "Invite another friend", text: `Each friend who joins adds another ${email.days} days.` },
        ],
        cta: { label: "Invite another friend", url: url("/you/referrals") },
        tone: "warm",
        sender: "mike",
      };

    case "win_back":
      return {
        subject: email.name ? `${email.name}, your next session is waiting` : "Your next session is waiting",
        preheader: "No catching up needed. Start with one short session.",
        eyebrow: "We miss you",
        heading: "Pick up where you left off",
        subheading: `It's been ${email.daysAway} days. Your progress is right where you left it.`,
        blocks: [
          { t: "p", text: email.programName ? `Your place in ${email.programName} is saved. There's nothing to catch up on.` : "Your place is saved. There's nothing to catch up on." },
          { t: "section", text: "An easy way back" },
          { t: "steps", items: ["Open today's session.", "Do the warm-up and one block.", "Stop there if you want. It still counts."] },
          { t: "callout", title: "Life got busy?", text: "That's normal. Lower the bar for one week and let the habit come back." },
        ],
        cta: { label: "Start a short session", url: url(email.href ?? "/today") },
        secondary: { label: "Change emails", url: url("/you/settings#notifications") },
        sender: "mike",
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
