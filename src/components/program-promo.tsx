import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { externalPrograms, programsFor, type ExternalProgram } from "@/content/programs";
import { cn } from "@/lib/utils";

export function ProgramCard({ program, compact }: { program: ExternalProgram; compact?: boolean }) {
  return (
    <Link
      to="/programs/$programSlug"
      params={{ programSlug: program.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-foreground/25"
    >

      <div className="relative">
        <img src={program.image} alt={program.name} loading="lazy" decoding="async" className={cn("w-full object-cover", compact ? "aspect-[21/9]" : "aspect-[16/10]")} />
        {program.status && <span className="absolute right-3 top-3 rounded-full border border-background/20 bg-foreground/80 px-2.5 py-1 text-[0.625rem] font-semibold text-background backdrop-blur">{program.status}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-muted-foreground">{program.kind}</p>
        <h3 className="mt-2 text-base text-foreground">{program.name}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{program.tagline}</p>
        {!compact && (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{program.description}</p>
            <ul className="mt-4 space-y-1.5">
              {program.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {program.status ? "View concept" : "Explore"}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>

  );
}

/** Inline promo strip used across the app, contextual to the surface. */
export function ProgramPromo({
  slot,
  title = "More from Mike Salemi",
  limit = 2,
}: {
  slot: Parameters<typeof programsFor>[0];
  title?: string;
  limit?: number;
}) {
  const items = programsFor(slot, limit);
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="title-section text-foreground">{title}</h2>
        <Link to="/programs" className="shrink-0 text-xs font-semibold text-primary">
          See all
        </Link>

      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <ProgramCard key={p.id} program={p} compact />
        ))}
      </div>
    </section>
  );
}

export { externalPrograms };
