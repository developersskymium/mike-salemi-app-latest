import { Button, EmptyState, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { loadProgramsTab } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import { Catalog } from "./catalog/Catalog";
import "./discover.css";

/** Programs tab: the legacy catalog (search + filters, your path, flagship, verticals). */
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
  return (
    <>
      <Catalog catalog={data.catalog} enrollments={data.enrollments} copy={data.copy} />
    </>
  );
}

export function ProgramsSkeleton() {
  return (
    <div className="pc" aria-busy="true" aria-label="Loading programs">
      <div className="pc-head">
        <div>
          <Skeleton shape="title" width={420} />
          <Skeleton height={50} style={{ borderRadius: 999, maxWidth: 560, marginTop: 24 }} />
        </div>
        <Skeleton shape="card" height={190} />
      </div>
      <Skeleton shape="card" height={420} style={{ borderRadius: 28 }} />
      <Skeleton shape="title" width={260} />
      <div className="pc-grid">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} glass shape="card" height={460} />
        ))}
      </div>
    </div>
  );
}
