import Image from "next/image";
import Link from "next/link";
import type { CatalogProgram } from "@ms/api";
import { Button, EmptyState, Glass, ProgressBar, Skeleton } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { loadProgramsTab, type Enrollment } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import { programPhoto } from "./access";
import { ExploreTabs, type ExploreTab } from "./ExploreTabs";
import { ProgramCard, ToolRow } from "./ProgramCard";
import "./discover.css";

export async function ProgramsContent({ initial }: { initial: ExploreTab }) {
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
  const { catalog, enrollments, tools } = data;
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const active = enrollments.filter((e) => !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""));
  const group = (g: string) => catalog.filter((p) => p.catalogGroup === g);

  const grid = (list: CatalogProgram[], first = false) =>
    list.length ? (
      <div className="dsc-grid">
        {list.map((p, i) => (
          <ProgramCard key={p.id} program={p} href={`/programs/${p.slug}`} priority={first && i < 2} />
        ))}
      </div>
    ) : (
      <EmptyState title="Nothing here yet" body="New programs land here first." illustration={<EmptyScene scene="no-programs" size={150} />} />
    );

  return (
    <div className="dsc-stack">
      <section aria-labelledby="mine">
        <div className="dsc-sech">
          <h2 id="mine" className="lq-t22">My programs</h2>
          {active.length > 0 && <span className="lq-t13 lq-c2 lq-num">{active.length} active</span>}
        </div>
        {active.length ? (
          <div className="dsc-mine">
            {active.map((e, i) => (
              <Continue key={e.enrollment_id} e={e} program={bySlug.get(e.program_slug)} primary={i === 0} />
            ))}
          </div>
        ) : (
          <Glass radius="card" className="dsc-mine-empty">
            <EmptyScene scene="no-programs" size={120} />
            <div>
              <div className="lq-t17">Start your first program</div>
              <p className="lq-t13 lq-c2">Pick one below. Your progress shows up here.</p>
            </div>
          </Glass>
        )}
      </section>

      <section aria-labelledby="explore">
        <div className="dsc-sech">
          <h2 id="explore" className="lq-t22">Explore</h2>
        </div>
        <ExploreTabs
          initial={initial}
          panels={{
            training: grid(group("training"), true),
            experiences: grid(group("experiences")),
            free: (
              <div className="dsc-stack-sm">
                {grid(group("free"))}
                <h3 className="lq-t17 dsc-subh">Tools</h3>
                <div className="dsc-tools">
                  {tools.map((t) => (
                    <ToolRow key={t.id} {...t} href={`/tools/${t.id}`} />
                  ))}
                </div>
              </div>
            ),
          }}
        />
      </section>
    </div>
  );
}

function Continue({ e, program, primary }: { e: Enrollment; program?: CatalogProgram; primary: boolean }) {
  const photo = program ? programPhoto(program) : null;
  const pct = e.lessons_total ? e.lessons_done / e.lessons_total : 0;
  const day = e.current_lesson_title?.replace(/\s*-\s*/, " · ");
  return (
    <Glass radius="card" interactive className="dsc-cont">
      <Link href={`/programs/${e.program_slug}`} className="dsc-cont-main" aria-label={`${e.program_name}, ${e.path_name}`}>
        {photo && (
          <span className="dsc-cont-img">
            <Image src={photo.src} alt="" fill sizes="96px" />
          </span>
        )}
        <span className="dsc-cont-text">
          <span className="lq-t13 lq-c2">{[e.path_name, e.mode === "immersion" ? "Immersion" : "Self-Guided"].filter(Boolean).join(" · ")}</span>
          <span className="lq-t20 dsc-clamp1">{e.program_name}</span>
          <span className="lq-t13 lq-c2 dsc-clamp1">{[e.current_section_title, day].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
      <div className="dsc-cont-bar">
        <ProgressBar value={pct} tone={primary ? "accent" : "label"} label={`${e.lessons_done} of ${e.lessons_total} done`} />
        <span className="lq-t12 lq-c2 lq-num">
          {e.lessons_done}/{e.lessons_total}
        </span>
      </div>
      <Button href={`/programs/${e.program_slug}`} variant={primary ? "filled" : "glass"} size="md" block icon="play">
        Continue
      </Button>
    </Glass>
  );
}

export function ProgramsSkeleton() {
  return (
    <div className="dsc-stack" aria-busy="true" aria-label="Loading programs">
      <section>
        <Skeleton shape="title" width={160} />
        <Skeleton glass shape="card" height={196} style={{ marginTop: 14 }} />
      </section>
      <section>
        <Skeleton shape="title" width={110} />
        <Skeleton glass height={40} style={{ marginTop: 14, borderRadius: 999 }} />
        <div className="dsc-grid" style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} glass shape="card" height={340} />
          ))}
        </div>
      </section>
    </div>
  );
}
