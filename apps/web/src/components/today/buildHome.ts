import type { CatalogProgram } from "@ms/api";
import { daysBetween, type IsoDate } from "@ms/core";
import type { MoveName } from "@/components/graphics";
import type { IconName } from "@/components/ui";
import type { Enrollment, HomeRaw, HomeRun } from "@/lib/loaders/home";
import type { TodayView } from "./buildToday";
import { fmt, shortDate } from "./dates";
import { lessonHref, plural, relDay, splitDayTitle } from "./model";
import { programHref } from "@/lib/hrefs";
import { photo, programCover } from "@/lib/photos";
import { continueOrder } from "@/lib/continue";

/* Pure: turns Home + Today data into the dashboard model (legacy /home, src/hooks/use-home-programs.ts). */

export type Verb = { label: "Start" | "Resume" | "Review"; icon: IconName };

/** One program (or one level of a levelled program) as the Home rails show it. */
export interface HomeItem {
  key: string;
  programId: string;
  pathId: string | null;
  /** Level key ("beginner", "intermediate") for levelled programs. */
  pathKey: string | null;
  slug: string;
  name: string;
  /** Program type ("day_program", "course", "tool" …). */
  type: string;
  /** The member's learning mode when enrolled. */
  mode: string | null;
  /** Short level/format line, e.g. "Level I · Immersion" or "Video course". */
  kicker: string | null;
  summary: string | null;
  image: { src: string; alt: string; position?: string } | null;
  /** Graphic cover when there is no photography yet. */
  glyph: MoveName;
  access: "included" | "owned" | "free" | "locked" | "preview";
  draft: boolean;
  priceCents: number | null;
  priceLabel: string | null;
  enrolled: boolean;
  percent: number;
  complete: boolean;
  /** "27 of 67 days" · "36 of 303 lessons" */
  progressLabel: string;
  /** "67 training days" · "303 lessons" */
  sizeLabel: string;
  /** What Resume opens next, e.g. "Day 24 · Recovery Day". */
  nextLabel: string | null;
  /** The section/phase of the next lesson, e.g. "On Ramp Phase" or "Week 1: Foundations". */
  sectionTitle: string | null;
  /** The next lesson's own title, e.g. "Day 3" or "Day 24 - Recovery Day". */
  nextTitle: string | null;
  lastActivityAt: string | null;
  verb: Verb;
  resumeHref: string;
  startHref: string;
  /** The program page (outline, preview, buy). */
  pageHref: string;
}

export interface ActivityTile {
  id: string;
  eyebrow: string;
  title: string;
  line: string;
  href: string;
  icon: IconName;
  now?: boolean;
  /** ISO date for the date block, when the tile is dated. */
  date?: string | null;
}

export interface RetreatCardModel {
  id: string;
  name: string;
  line: string;
  status: "open" | "waitlist" | "full" | "past" | "other";
  statusLabel: string;
  image: { src: string; alt: string } | null;
  href: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  doneLabel: string;
  done: boolean;
  href: string;
}

const TRAINING_TYPES = new Set(["course", "day_program", "tool"]);
const GLYPH: Record<string, MoveName> = { coaching: "press", challenge: "swing", live: "breathing", retreat: "walking", course: "getup", day_program: "swing", tool: "squat" };
const DRAFTY = /await|concept|draft|tbc/i;

/** Summit cover: Mike's text-free photography with a focal point first (no baked-in titles), then the program's media. */
function photoFor(p: CatalogProgram, pathKey?: string | null): HomeItem["image"] {
  // Level II gets its own frame from the photo map (not another program's cover).
  const ph = p.slug === "kettlebell-lifestyle" && pathKey && pathKey !== "beginner" ? photo("windmill") : programCover(p.slug);
  if (ph) return { src: ph.src, alt: ph.alt, position: ph.focal };
  return mediaFor(p, pathKey);
}

function mediaFor(p: CatalogProgram, pathKey?: string | null) {
  const byPath = pathKey ? p.media.find((m) => m.url.toLowerCase().includes(pathKey.toLowerCase())) : undefined;
  const m = byPath ?? p.media.find((x) => x.role === "card") ?? p.media.find((x) => x.role === "hero") ?? p.media[0];
  return m ? { src: m.url, alt: m.alt || p.name } : null;
}

function verbOf(percent: number, complete: boolean): Verb {
  if (complete) return { label: "Review", icon: "repeat" };
  if (percent === 0) return { label: "Start", icon: "play" };
  return { label: "Resume", icon: "play" };
}

function nextLabelOf(e: Enrollment): string | null {
  if (!e.current_lesson_title) return null;
  const { day, name } = splitDayTitle(e.current_lesson_title);
  if (day) return `Day ${day} · ${name}`;
  return e.current_section_title && e.current_section_title !== name ? `${e.current_section_title} · ${name}` : name;
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

function dateSpan(a: string, b: string | null) {
  const s = a.slice(0, 10);
  const year = s.slice(0, 4);
  if (!b) return `${shortDate(s)} ${year}`;
  const e = b.slice(0, 10);
  return s.slice(0, 7) === e.slice(0, 7) ? `${fmt(s, { month: "short" })} ${Number(s.slice(8))}–${Number(e.slice(8))}, ${year}` : `${shortDate(s)} – ${shortDate(e)} ${e.slice(0, 4)}`;
}

export function buildHome(raw: HomeRaw, v: TodayView) {
  const enrolledBy = new Map<string, Enrollment>();
  for (const e of raw.enrollments) enrolledBy.set(`${e.program_id}:${e.path_id ?? ""}`, e);
  const outlineBy = new Map(raw.outline.map((o) => [`${o.program_id}:${o.path_id ?? ""}`, o]));

  /* ------------------------------------------------------------ items */
  const items: HomeItem[] = [];
  for (const p of raw.catalog) {
    if (!TRAINING_TYPES.has(p.type) || p.catalogGroup === "hidden") continue;
    const levels = p.paths.filter((x) => x.kind === "level" && outlineBy.has(`${p.id}:${x.id}`));
    const targets: { pathId: string | null; pathKey: string | null; label: string | null }[] = levels.length
      ? levels.map((x) => ({ pathId: x.id, pathKey: x.key, label: x.shortName ?? x.name }))
      : [{ pathId: null, pathKey: null, label: null }];
    for (const t of targets) {
      const e = enrolledBy.get(`${p.id}:${t.pathId ?? ""}`) ?? (t.pathId ? undefined : raw.enrollments.find((x) => x.program_id === p.id));
      const o = outlineBy.get(`${p.id}:${t.pathId ?? ""}`) ?? raw.outline.find((x) => x.program_id === p.id);
      const isDays = p.type === "day_program";
      const total = e?.lessons_total ?? o?.lessons ?? p.lessonCount;
      const done = e?.lessons_done ?? 0;
      const percent = total ? Math.round((done / total) * 100) : 0;
      const complete = Boolean(e && (e.completed_at || (total > 0 && done >= total)));
      const unit = isDays ? "day" : "lesson";
      const access = p.access === "org" ? "included" : (p.access as HomeItem["access"]);
      const startHref = o?.first_lesson_id ? lessonHref(p.slug, o.first_lesson_id, { type: p.type, mode: e?.mode }) : programHref(p.slug, p.type);
      items.push({
        key: `${p.id}:${t.pathId ?? ""}`,
        programId: p.id,
        pathId: t.pathId,
        pathKey: t.pathKey,
        slug: p.slug,
        type: p.type,
        mode: e?.mode ?? null,
        name: t.label ? `${p.name} · ${t.label}` : p.name,
        kicker: [t.label ? (levels.length > 1 ? `${levels.length} levels` : null) : null, isDays ? "Day-by-day program" : p.type === "tool" ? "Free resource" : p.formatLabel ?? "Video course"]
          .filter(Boolean)
          .join(" · ") || null,
        summary: p.tagline ?? p.summary,
        image: photoFor(p, t.pathKey),
        glyph: GLYPH[p.type] ?? "swing",
        access,
        draft: Boolean(p.draftNote && DRAFTY.test(p.draftNote)),
        priceCents: raw.prices[p.id] ?? null,
        priceLabel: p.priceLabel,
        enrolled: Boolean(e),
        percent,
        complete,
        progressLabel: `${done} of ${plural(total, unit)}`,
        sizeLabel: isDays ? `${total} training days` : plural(total, "lesson"),
        nextLabel: e && !complete ? nextLabelOf(e) : null,
        sectionTitle: e && !complete ? e.current_section_title ?? null : null,
        nextTitle: e && !complete ? e.current_lesson_title ?? null : null,
        lastActivityAt: e?.last_active_at ?? null,
        verb: verbOf(percent, complete),
        resumeHref: e?.current_lesson_id ? lessonHref(p.slug, e.current_lesson_id, { type: p.type, mode: e.mode }) : complete ? programHref(p.slug, p.type) : startHref,
        startHref,
        pageHref: programHref(p.slug, p.type),
      });
    }
  }

  const enrolled = items.filter((i) => i.enrolled).sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
  const open = (i: HomeItem) => i.access === "included" || i.access === "owned" || i.access === "free";
  const joinable = items.filter((i) => !i.enrolled && open(i));
  const lockedPrograms = items.filter((i) => !i.enrolled && !open(i));

  /* Experiences without a run on the retreat rail (coaching, challenges, concepts) sit in Explore next too. */
  const experiences: HomeItem[] = raw.catalog
    .filter((p) => !TRAINING_TYPES.has(p.type) && p.type !== "retreat" && p.catalogGroup !== "hidden")
    .map((p) => ({
      key: p.id,
      programId: p.id,
      pathId: null,
      pathKey: null,
      slug: p.slug,
      type: p.type,
      mode: null,
      name: p.name,
      kicker: p.type === "coaching" ? "Coaching" : p.type === "challenge" ? "Group challenge" : "Live program",
      summary: p.tagline ?? p.summary,
      image: photoFor(p),
      glyph: GLYPH[p.type] ?? "breathing",
      access: p.access === "org" ? "included" : (p.access as HomeItem["access"]),
      draft: Boolean(p.draftNote && DRAFTY.test(p.draftNote)),
      priceCents: raw.prices[p.id] ?? null,
      priceLabel: p.priceLabel,
      enrolled: false,
      percent: 0,
      complete: false,
      progressLabel: "",
      sizeLabel: p.type === "coaching" ? "1:1 with Mike" : p.durationLabel ?? p.formatLabel ?? "Experience",
      nextLabel: null,
      sectionTitle: null,
      nextTitle: null,
      lastActivityAt: null,
      verb: { label: "Start", icon: "play" },
      resumeHref: programHref(p.slug, p.type),
      startHref: programHref(p.slug, p.type),
      pageHref: programHref(p.slug, p.type),
    }));
  const locked = [...lockedPrograms.filter((i) => !i.draft), ...experiences.filter((i) => !i.draft), ...lockedPrograms.filter((i) => i.draft), ...experiences.filter((i) => i.draft)];

  /* ------------------------------------------------------------ hero */
  // The same pick as Today's next action: the main training program, never a tool or an intro lesson.
  const order = continueOrder(raw.enrollments, raw.introLessonIds);
  const continuing =
    order.map((e) => enrolled.find((i) => i.programId === e.program_id && (i.pathId === e.path_id || !i.pathId) && !i.complete)).find(Boolean) ??
    enrolled.find((i) => !i.complete && i.type !== "tool") ??
    enrolled.find((i) => i.type !== "tool") ??
    null;
  const featured =
    joinable.find((i) => i.slug === raw.settings.featuredSlug) ??
    joinable.find((i) => raw.catalog.find((p) => p.id === i.programId)?.featured) ??
    joinable.find((i) => i.slug === "kettlebell-lifestyle") ??
    joinable[0] ??
    null;
  // The hero's action follows Today's smart next action when it is about the same program.
  const sameProgram = continuing && v.next && v.primary?.program_slug === continuing.slug && v.next.href.includes(`/programs/${continuing.slug}`);
  const heroAction = continuing
    ? sameProgram
      ? { label: v.next!.cta, href: v.next!.href, hint: v.next!.hint }
      : { label: continuing.complete ? "Review" : continuing.percent === 0 ? "Start" : `Resume`, href: continuing.resumeHref, hint: null }
    : null;
  // Today's own next action when it is something else (live coaching, a plan session in another program).
  const alsoToday = v.next && !sameProgram && continuing ? { eyebrow: v.next.eyebrow, title: v.next.title, href: v.next.href, cta: v.next.cta } : null;

  /* ------------------------------------------------------------ upcoming activity (3-up) */
  const tiles: ActivityTile[] = [];
  for (const e of v.upcoming) {
    tiles.push({
      id: e.id,
      eyebrow: e.kind === "coaching" ? "Coaching" : e.kind === "run" ? "Retreat" : "Session",
      title: e.title,
      line: [/^\d{4}-\d{2}-\d{2}/.test(e.when) ? relDay(e.when.slice(0, 10), v.today) : e.when, e.subtitle].filter(Boolean).join(" · "),
      href: e.href,
      icon: e.kind === "coaching" ? "people" : e.kind === "run" ? "mountain" : "calendar",
      now: e.when === "Now",
      date: /^\d{4}-\d{2}-\d{2}/.test(e.when) ? e.when.slice(0, 10) : null,
    });
  }
  if (v.goal?.next) {
    const n = v.goal.next;
    tiles.push({
      id: `plan-${n.plan_item_id ?? n.on_date}`,
      eyebrow: "Next in your plan",
      title: splitDayTitle(n.title).name,
      line: [relDay(n.on_date, v.today), v.goal.planName].filter(Boolean).join(" · "),
      href: n.lesson_id && n.program_slug ? lessonHref(n.program_slug, n.lesson_id, { type: raw.catalog.find((p) => p.slug === n.program_slug)?.type }) : `/plan?d=${n.on_date}`,
      icon: n.item_kind === "recovery" ? "leaf" : "kettlebell",
      now: n.on_date === v.today,
      date: n.on_date,
    });
  }
  const openRun = raw.runs.find((r) => r.status === "open" || r.status === "waitlist");
  if (openRun && !tiles.some((t) => t.id === openRun.id)) {
    const days = daysBetween(v.today, openRun.starts_at.slice(0, 10) as IsoDate);
    tiles.push({
      id: openRun.id,
      eyebrow: "Retreat · Applications open",
      title: openRun.name,
      line: [dateSpan(openRun.starts_at, openRun.ends_at), openRun.place].filter(Boolean).join(" · ") + (days > 0 ? ` · in ${days} days` : ""),
      href: `/experiences/${openRun.id}`,
      icon: "mountain",
      date: openRun.starts_at.slice(0, 10),
    });
  }
  const coaching = raw.catalog.find((p) => p.type === "coaching" && p.slug === "coaching");
  if (coaching && tiles.length < 3) {
    tiles.push({ id: "coaching", eyebrow: "Coaching", title: "Book a session with Mike", line: "Technique review, programming, accountability", href: "/coaching", icon: "people" });
  }
  if (tiles.length < 3) {
    tiles.push({ id: "plan", eyebrow: "Plan", title: v.goal ? "Open your week" : "Build your training schedule", line: v.goal ? `${v.weekSummary.done} of ${plural(v.weekSummary.planned, "session")} this week` : "Pick days, get a plan with dates", href: v.goal ? "/plan" : "/plan/new", icon: "calendar" });
  }

  /* ------------------------------------------------------------ retreats */
  const retreats: RetreatCardModel[] = raw.runs.map((r: HomeRun) => {
    const status = (["open", "waitlist", "full", "past"].includes(r.status) ? r.status : "other") as RetreatCardModel["status"];
    return {
      id: r.id,
      name: r.name,
      line: [dateSpan(r.starts_at, r.ends_at), r.place].filter(Boolean).join(" · "),
      status,
      statusLabel: status === "open" ? "Applications open" : status === "waitlist" ? "Waitlist" : status === "full" ? "Full" : status === "past" ? "Past retreat" : r.price_note ?? "",
      image: r.image ? { src: r.image.url, alt: r.image.alt } : null,
      // Each card opens its own run (D13), not the retreats concept page.
      href: `/experiences/${r.id}`,
    };
  });

  /* ------------------------------------------------------------ getting started (P2) */
  const anyDone = raw.enrollments.some((e) => e.lessons_done > 0 || e.steps_done > 0);
  const anyDay = raw.enrollments.some((e) => e.program_type === "day_program" && e.lessons_done > 0);
  const named = Boolean(v.firstName && v.firstName !== "Member");
  const checklist: ChecklistItem[] = [
    { id: "goal", label: "Set your goal and get your plan", doneLabel: "Your goal is set", done: Boolean(v.goal), href: "/onboarding" },
    { id: "intake", label: "Complete the intake questionnaire", doneLabel: "Intake done", done: raw.checklist.intake, href: "/programs/kettlebell-lifestyle" },
    { id: "name", label: "Add your name", doneLabel: "Your name is on the wall", done: named, href: "/you/settings" },
    { id: "lesson", label: "Complete your first lesson", doneLabel: "You started", done: anyDone, href: featured?.startHref ?? continuing?.resumeHref ?? "/programs" },
    { id: "day", label: "Finish a full training day", doneLabel: "A complete training day", done: anyDay, href: continuing?.resumeHref ?? "/programs/kettlebell-lifestyle" },
    { id: "plan", label: "Build your training schedule", doneLabel: "Your plan has dates", done: v.weekSummary.planned > 0 || Boolean(v.goal?.planId), href: "/plan/new" },
    { id: "reminders", label: "Set your reminders", doneLabel: "Reminders on", done: raw.checklist.reminders, href: "/you/settings" },
  ];

  /* ------------------------------------------------------------ readiness chip */
  const rr = raw.readiness;
  const readiness = rr.length
    ? {
        score: rr[0]!.score,
        band: rr[0]!.band,
        name: rr[0]!.band_name,
        when: relDay(rr[0]!.created_at.slice(0, 10) as IsoDate, v.today),
        trend: [...rr].reverse().map((r) => r.score),
      }
    : null;

  /* ------------------------------------------------------------ journey (hero signature) */
  const journey =
    continuing && raw.journey && v.primary && raw.journey.enrollmentId === v.primary.enrollment_id && v.primary.program_slug === continuing.slug ? raw.journey.sections : null;

  return {
    settings: raw.settings,
    continuing,
    featured,
    heroAction,
    alsoToday,
    enrolled,
    joinable,
    locked,
    tiles: tiles.slice(0, 3),
    retreats,
    retreatsHref: "/experiences",
    checklist,
    checklistDone: checklist.filter((c) => c.done).length,
    readiness,
    journey,
  };
}

export type HomeView = ReturnType<typeof buildHome>;
