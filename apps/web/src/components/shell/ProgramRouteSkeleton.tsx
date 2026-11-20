import { Skeleton } from "@/components/ui";
import { ProgramSkeleton } from "@/components/training/Skeletons";
import { PlayerSkeleton } from "@/components/training/PlayerSkeleton";
import { RouteSkeleton } from "./RouteSkeleton";
import "@/components/journey/journey.css";
import "@/components/course/course.css";
import "@/components/selfguided/selfguided.css";

/** Journey home (`/programs/<slug>/course`): hero, signature view and the side rail in their final boxes. */
export function CourseHomeSkeleton() {
  return (
    <div className="jy" aria-busy="true" aria-label="Loading program">
      <Skeleton shape="card" height={440} style={{ borderRadius: 28 }} />
      <div className="jy-cols">
        <div className="jy-main">
          <Skeleton shape="title" width={280} />
          <Skeleton shape="card" height={520} />
        </div>
        <div className="jy-side">
          <Skeleton shape="card" height={300} />
          <Skeleton shape="card" height={180} />
        </div>
      </div>
    </div>
  );
}

/** Course frame while a lesson loads: bar, curriculum column and a stage. Full-screen like the player
   (`data-shell-focus` hides the rail), so the page does not jump sideways when it arrives. */
export function CourseLessonSkeleton() {
  return (
    <div className="crs" data-shell-focus="" aria-busy="true" aria-label="Loading lesson">
      <div className="crs-bar lq-glass" data-level="thick"><div className="crs-bar-row" /></div>
      <div className="crs-body">
        <aside className="crs-side"><div className="crs-nav-head">{[0, 1, 2].map((i) => <span key={i} className="lq-skel" style={{ height: i === 2 ? 38 : 10, borderRadius: 8 }} />)}</div></aside>
        <main className="crs-main">
          <div className="crs-stage">
            <span className="lq-skel" style={{ display: "block", height: 12, width: "40%", borderRadius: 6 }} />
            <span className="lq-skel" style={{ display: "block", height: 34, width: "70%", borderRadius: 10, marginTop: 14 }} />
            <span className="lq-skel" style={{ display: "block", aspectRatio: "16 / 9", borderRadius: 20, marginTop: 28 }} />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Self-Guided session pages. */
export function SessionSkeleton() {
  return (
    <div className="sg-page sg-stack" aria-busy="true" aria-label="Loading session">
      <Skeleton height={64} glass />
      <Skeleton height={360} glass />
      <Skeleton height={120} glass />
    </div>
  );
}

/**
 * The loading UI for the outer program boundaries (`programs/`, `programs/[slug]/`): whatever page is
 * coming (program, day, course, lesson, session) draws its own skeleton from the first frame.
 */
export function ProgramRouteSkeleton({ catalog }: { catalog?: React.ReactNode }) {
  return (
    <RouteSkeleton
      catalog={catalog}
      program={<ProgramSkeleton />}
      day={<PlayerSkeleton />}
      course={<CourseHomeSkeleton />}
      lesson={<CourseLessonSkeleton />}
      session={<SessionSkeleton />}
    />
  );
}
