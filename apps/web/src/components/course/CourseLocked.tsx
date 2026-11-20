import Image from "next/image";
import Link from "next/link";
import { Button, Glass } from "@/components/ui";
import type { CoursePageData } from "@/lib/loaders/course";
import { MomPanel } from "./CoursePlayer";
import { Back, Check, Clipboard, Lock } from "./glyphs";
import "./course.css";

/** No access yet: the same frame with the overview, the outline and a way to choose access (legacy locked course). */
export function CourseLocked({ data }: { data: CoursePageData }) {
  const groups = data.groups;
  const multi = groups.length > 1;
  const lessons = groups.reduce((n, g) => n + g.sections.reduce((m, s) => m + s.lessons.length, 0), 0);
  return (
    <div className="crs" data-focus="">
      <Glass as="header" level="thick" className="crs-bar">
        <div className="crs-bar-row">
          <Link href="/programs" className="crs-ghost" aria-label="Back to Programs"><Back /><span className="crs-sm">Programs</span></Link>
          <p className="crs-bar-title crs-ellipsis">{data.program.name}</p>
          <span className="crs-ghost" aria-hidden><Lock /></span>
        </div>
      </Glass>
      <div className="crs-body">
        <aside className="crs-side" aria-hidden />
        <main className="crs-main" id="main">
          <div className="crs-stage">
            <section className="crs-over" aria-labelledby="crs-over-h">
              {data.program.image && (
                <figure className="crs-over-art">
                  <Image src={data.program.image} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" priority />
                  {data.program.tagline && <figcaption>{data.program.tagline}</figcaption>}
                </figure>
              )}
              <p className="crs-eyebrow">With {data.program.instructor}</p>
              <h1 id="crs-over-h">{data.program.name}</h1>
              {data.program.summary && <p className="crs-over-sum">{data.program.summary}</p>}
              <div className="crs-stats">
                <span><b>{multi ? groups.length : groups.reduce((n, g) => n + g.sections.length, 0)}</b> {multi ? "chapters" : "sections"}</span>
                <span><b>{lessons}</b> sessions</span>
                {data.intake && <Link href={`/intake/${data.program.slug}`}><Clipboard />{data.intake.done ? "Review intake" : "Take program intake"}</Link>}
              </div>
              {data.program.highlights.length > 0 && <ul className="crs-ticks">{data.program.highlights.map((h) => <li key={h}><Check />{h}</li>)}</ul>}
            </section>

            {data.program.slug === "men-of-movement" && <MomPanel />}

            <Glass className="crs-locked">
              <span className="crs-lockic"><Lock /></span>
              <h2>Preview the program, then choose access</h2>
              <p>{data.intake ? "Your intake is available now. " : ""}Lessons open once this program is included in your membership or added to your account.</p>
              <div className="crs-locked-acts">
                <Button href={`/explore/${data.program.slug}`} icon="lock">See access options</Button>
                {data.intake && <Button href={`/intake/${data.program.slug}`} variant="glass">{data.intake.done ? "Review intake" : "Take program intake"}</Button>}
              </div>
            </Glass>

            <div className="crs-outline" aria-label="What's inside">
              {groups.map((g, i) =>
                (multi ? [{ key: g.name, title: g.name, n: g.sections.reduce((m, s) => m + s.lessons.length, 0), i }] : g.sections.map((s, j) => ({ key: s.id, title: s.title, n: s.lessons.length, i: j }))).map((row) => (
                  <div key={row.key} className="crs-outline-g">
                    <span className="crs-grow-n">{String(row.i + 1).padStart(2, "0")}</span>
                    <b>{row.title}</b>
                    <span className="crs-count">{row.n} lessons</span>
                  </div>
                )),
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
