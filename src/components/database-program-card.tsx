import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ClipboardCheck, Layers3, LockKeyhole, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatabaseProgramCardData = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  image: string | null;
  instructor: string | null;
  highlights: string[];
  sectionCount: number;
  lessonCount: number;
  included: boolean;
  owned?: boolean;
  access?: "included" | "owned" | "locked";
  priceCents?: number | null;
  badge?: string | null;
  offer?: string | null;
  ctaLabel?: string | null;
};

export function DatabaseProgramCard({ course, compact = false }: { course: DatabaseProgramCardData; compact?: boolean }) {
  const locked = course.access === "locked";
  const accessLabel = course.access === "owned" ? "Owned" : course.access === "locked" ? "Locked" : "Included";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-foreground/25">
      <Link to="/courses/$courseSlug" params={{ courseSlug: course.slug }} className="relative block overflow-hidden">
        {course.image ? (
          <img src={course.image} alt={course.name} loading="lazy" className={cn("w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]", compact ? "aspect-[21/9]" : "aspect-[16/10]")} />
        ) : (
          <span className={cn("grid w-full place-items-center bg-secondary text-primary", compact ? "aspect-[21/9]" : "aspect-[16/10]")}><PlayCircle className="h-8 w-8" /></span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground backdrop-blur">
          {accessLabel}
        </span>
        {course.badge && <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-semibold text-primary-foreground">{course.badge}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-muted-foreground">Course{course.instructor ? ` · ${course.instructor}` : ""}</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{course.name}</h3>
        {course.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{course.summary}</p>}
        {course.offer && <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">{course.offer}</p>}
        {!compact && course.highlights.length > 0 && (
          <ul className="mt-4 space-y-2">
            {course.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} /> {highlight}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" />{course.sectionCount} sections</span>
          <span className="inline-flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5" />{course.lessonCount} lessons</span>
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-hairline pt-4">
          <Link to="/courses/$courseSlug" params={{ courseSlug: course.slug }} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            {locked ? <LockKeyhole className="h-4 w-4" /> : null}{course.ctaLabel ?? (locked ? "View program" : "Open program")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/programs/$programSlug/intake" params={{ programSlug: course.slug }} aria-label={`Open ${course.name} intake`} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
            <ClipboardCheck className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}