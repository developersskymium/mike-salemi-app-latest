import Link from "next/link";
import { Button, EmptyState, Glass, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { loadProgramsTab } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import { Catalog } from "./catalog/Catalog";
import "./discover.css";

/** Programs tab: the legacy catalog (search, flagship, verticals) with a slim Continue strip on top. */
export async function ProgramsContent() {
  const { supabase } = await getUser();
  let data;
  try {
    data = await loadProgramsTab(supabase);
  } catch {
    return (
      <EmptyState
        title="Programs didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/programs">Try again</Button>}
      />
    );
  }
  const active = data.enrollments.filter((e) => !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""));
  return (
    <>
      {active.length > 0 && (
        <nav aria-label="Continue" className="w1-cat-strip">
          {active.slice(0, 4).map((e, i) => {
            const pct = e.lessons_total ? Math.round((e.lessons_done / e.lessons_total) * 100) : 0;
            return (
              <Link key={e.enrollment_id} href={e.current_lesson_id ? `/programs/${e.program_slug}/learn/${e.current_lesson_id}` : `/programs/${e.program_slug}`} className="w1-cardlink">
                <Glass radius="pill" interactive className="w1-cat-pill" data-first={i === 0 ? "" : undefined}>
                  <span className="w1-cat-pillbar" aria-hidden><span style={{ width: `${pct}%` }} /></span>
                  <span className="lq-t13">
                    <span className="lq-c2">Continue · </span>
                    {e.program_name}
                    {e.path_name ? ` · ${e.path_name.split("·")[0]!.trim()}` : ""}
                  </span>
                  <span className="lq-t12 lq-c2 lq-num">{pct}%</span>
                </Glass>
              </Link>
            );
          })}
        </nav>
      )}
      <Catalog catalog={data.catalog} enrollments={data.enrollments} copy={data.copy} />
    </>
  );
}

export function ProgramsSkeleton() {
  return (
    <div className="w1-cat" aria-busy="true" aria-label="Loading programs">
      <Skeleton glass height={50} style={{ borderRadius: 999, maxWidth: 576 }} />
      <Skeleton glass shape="card" height={440} />
      <Skeleton shape="title" width={260} />
      <div className="w1-cat-grid">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} glass shape="card" height={460} />
        ))}
      </div>
    </div>
  );
}
