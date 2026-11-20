import Link from "next/link";
import { Icon } from "@/components/ui";
import { loadContinue } from "@/lib/loaders/selfguided";
import { ContinueCard } from "./parts";
import "./selfguided.css";

/**
 * Server component: every program's resume point (exact lesson, step and video position, or an
 * unfinished quick session), newest first. For Today, Programs and Library.
 */
export async function ContinueRail({ title = "Continue", limit = 6, className }: { title?: string; limit?: number; className?: string }) {
  const points = await loadContinue(limit).catch(() => []);
  if (!points.length) return null;
  return (
    <section className={className ? `sg-stack ${className}` : "sg-stack"} aria-labelledby="sg-rail-h">
      <div className="sg-sec-h">
        <h2 id="sg-rail-h" className="lq-t22">
          {title}
        </h2>
        <Link href="/programs" className="sg-link lq-t13">
          All programs <Icon name="chevron" size="xs" />
        </Link>
      </div>
      <div className="sg-rail">
        {points.map((c) => (
          <ContinueCard key={c.programId} c={c} eyebrow={c.programName} />
        ))}
      </div>
    </section>
  );
}
