import "server-only";
import { myEnrollments, myRewards, type DB } from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { programPhoto, type ProgramPhoto } from "@/lib/program-photos";

/* The member shell's data: the resume card and the "Your access" list from ONE cheap RPC
   (my_enrollments), plus the shop flag. The streak loads separately inside a Suspense boundary. */

type Enrollment = Awaited<ReturnType<typeof myEnrollments>>[number];

export interface ShellResume {
  href: string;
  /** "Up next · Level I" */
  eyebrow: string;
  /** "Recovery Day" */
  title: string;
  /** "Phase 2 · Kettlebell Lifestyle" */
  meta: string;
  /** "Day 24" (day programs) or null. */
  day: string | null;
  /** 0–1 through the path. */
  progress: number;
  photo: ProgramPhoto;
}

export interface ShellAccess {
  href: string;
  title: string;
  sub: string;
  photo: ProgramPhoto;
  slug: string;
}

export interface ShellData {
  resume: ShellResume | null;
  access: ShellAccess[];
  shop: boolean;
}

const lessonHref = (e: Enrollment) =>
  e.current_lesson_id ? `/programs/${e.program_slug}/${e.mode === "self_guided" ? "guide" : "learn"}/${e.current_lesson_id}` : `/programs/${e.program_slug}`;

/** "Day 24 - Recovery Day" → { day: "Day 24", title: "Recovery Day" } */
function splitLesson(t: string | null): { day: string | null; title: string } {
  const s = (t ?? "").trim();
  const m = s.match(/^(Day\s*\d+)\s*[-–—:·]\s*(.+)$/i);
  return m ? { day: m[1]!.replace(/\s+/, " "), title: m[2]!.trim() } : { day: null, title: s || "Continue" };
}

/** "Level I · Beginner" → "Level I" */
const levelOf = (path: string | null) => (path ?? "").split("·")[0]!.trim() || null;

const KIND: Record<string, string> = { day_program: "Program", course: "Course", series: "Video series", experience: "Experience", retreat: "Retreat" };

export function shapeShell(rows: Enrollment[], shop: boolean): ShellData {
  const live = rows.filter((e) => !e.completed_at);
  const sorted = [...live].sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""));
  const top = sorted[0];
  let resume: ShellResume | null = null;
  if (top) {
    const { day, title } = splitLesson(top.current_lesson_title);
    const level = levelOf(top.path_name);
    resume = {
      href: lessonHref(top),
      eyebrow: level ? `Up next · ${level}` : "Up next",
      title,
      meta: [top.current_section_title, top.program_name].filter(Boolean).join(" · "),
      day,
      progress: top.lessons_total ? top.lessons_done / top.lessons_total : 0,
      photo: programPhoto(top.program_slug),
    };
  }
  // One row per program (several paths of one program collapse to the most recent).
  const seen = new Set<string>();
  const access: ShellAccess[] = [];
  for (const e of [...sorted, ...rows.filter((r) => r.completed_at)]) {
    if (seen.has(e.program_slug)) continue;
    seen.add(e.program_slug);
    const level = levelOf(e.path_name);
    const sub = e.completed_at ? "Completed" : [level, e.mode === "self_guided" ? "Self-guided" : level ? "Immersion" : KIND[e.program_type] ?? "Program"].filter(Boolean).join(" · ");
    access.push({ href: `/programs/${e.program_slug}`, title: e.program_name, sub, photo: programPhoto(e.program_slug), slug: e.program_slug });
  }
  return { resume, access: access.slice(0, 4), shop };
}

export async function loadShell(sb: DB): Promise<ShellData> {
  if (MOCK) {
    const raw = await fixture<{ enrollments: Enrollment[] }>("today-home").catch(() => ({ enrollments: [] as Enrollment[] }));
    return shapeShell(raw.enrollments, true);
  }
  const [rows, shop] = await Promise.all([
    myEnrollments(sb).catch(() => [] as Enrollment[]),
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle().then((r) => Boolean((r.data?.value as { enabled?: boolean } | null)?.enabled), () => false),
  ]);
  return shapeShell(rows, shop);
}

/** The current streak (days), for the streak chip. Streams in after the shell. */
export async function loadStreak(sb: DB): Promise<number> {
  if (MOCK) return 12;
  try {
    return (await myRewards(sb)).streak_current ?? 0;
  } catch {
    return 0;
  }
}
