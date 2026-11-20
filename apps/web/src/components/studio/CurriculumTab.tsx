import Link from "next/link";
import { Chip } from "@/components/ui";
import { loadCurriculum } from "@/lib/studio/loaders";
import type { Row } from "@/lib/studio/db";
import { RecordForm, RowTools } from "./forms";
import { AddClip, QuickAdd, StepVideo } from "./pieces";
import { Note, Panel } from "./ui";

type Sp = { lesson?: string; step?: string; section?: string };

/** Tree (paths → sections → lessons → steps) on the left, the selected item's editor on the right. */
export async function CurriculumTab({ program, sp }: { program: Row; sp: Sp }) {
  const d = await loadCurriculum(program.id, sp.lesson ?? null, sp.step ?? null);
  const base = `/studio/programs/${program.id}?tab=curriculum`;
  const section = d.sections.find((s) => s.id === (sp.section ?? d.lesson?.section_id));
  const lessonsOf = (sid: string) => d.lessons.filter((l) => l.section_id === sid);
  const groups: { path: Row | null; sections: Row[] }[] = d.paths.length ? d.paths.map((p) => ({ path: p, sections: d.sections.filter((s) => s.path_id === p.id) })) : [{ path: null, sections: d.sections.filter((s) => !s.path_id) }];
  const orphan = d.paths.length ? d.sections.filter((s) => !s.path_id) : [];
  if (orphan.length) groups.push({ path: { id: null, name: "No path" }, sections: orphan });
  const sl = program.section_label ?? "Section", ll = program.lesson_label ?? "Lesson";

  return (
    <div className="st-split">
      <nav className="st-tree lq-glass" aria-label="Curriculum tree">
        {groups.map((g, gi) => (
          <div key={g.path?.id ?? gi}>
            {g.path && <div className="st-path">{g.path.name}</div>}
            {g.sections.map((s, si) => (
              <div key={s.id}>
                <h4>
                  <Link href={`${base}&section=${s.id}`} className="t" style={{ color: "inherit", textDecoration: "none" }} aria-current={section?.id === s.id && !d.lesson ? "true" : undefined}>{s.title}</Link>
                  <RowTools table="sections" pk={{ id: s.id }} first={si === 0} last={si === g.sections.length - 1} label={s.title} deletable={lessonsOf(s.id).length === 0} />
                </h4>
                {lessonsOf(s.id).map((l, li, arr) => (
                  <div key={l.id}>
                    <div className="st-leaf" aria-current={sp.lesson === l.id ? "true" : undefined}>
                      <span className="n">{l.day_number ?? li + 1}</span>
                      <Link href={`${base}&lesson=${l.id}`} className="t" style={{ color: "inherit", textDecoration: "none" }}>{l.title}</Link>
                      <RowTools table="lessons" pk={{ id: l.id }} first={li === 0} last={li === arr.length - 1} label={l.title} deletable={sp.lesson !== l.id} />
                    </div>
                    {sp.lesson === l.id && d.steps.map((st, i) => (
                      <div key={st.id} className="st-leaf step" aria-current={sp.step === st.id ? "true" : undefined}>
                        <Link href={`${base}&lesson=${l.id}&step=${st.id}`} className="t" style={{ color: "inherit", textDecoration: "none" }}>{st.title}</Link>
                        <RowTools table="steps" pk={{ id: st.id }} first={i === 0} last={i === d.steps.length - 1} label={st.title} />
                      </div>
                    ))}
                    {sp.lesson === l.id && <div style={{ paddingLeft: 24 }}><QuickAdd table="steps" fixed={{ lesson_id: l.id, program_id: program.id }} placeholder="New step title" extra={{ special: "none" }} /></div>}
                  </div>
                ))}
                <QuickAdd table="lessons" fixed={{ section_id: s.id, program_id: program.id, path_id: s.path_id ?? null }} placeholder={`New ${ll.toLowerCase()}`} />
              </div>
            ))}
            <QuickAdd table="sections" fixed={{ program_id: program.id, path_id: g.path?.id ?? null }} placeholder={`New ${sl.toLowerCase()}`} />
          </div>
        ))}
        {!d.sections.length && <div className="st-empty">No {sl.toLowerCase()}s yet. Add the first one above.</div>}
      </nav>

      <div>
        {d.step ? (
          <>
            <Panel title={`Step · ${d.step.title}`} meta={`in ${d.lesson?.title}`}>
              <RecordForm key={d.step.id} table="steps" row={d.step} only={["title", "kind", "special", "duration_label", "is_required", "description", "body", "attachments"]} />
            </Panel>
            <Panel title="Video" meta="Vimeo">
              <StepVideo key={d.step.id + (d.step.video_id ?? "")} stepId={d.step.id} current={(d.videos.find((v) => v.id === d.step!.video_id) as never) ?? null} />
            </Panel>
            <Panel title="Clips" meta="playlist, plays in order">
              {d.clips.map((c, i) => (
                <div key={c.id} className="st-row" style={{ justifyContent: "space-between", padding: "6px 0", borderTop: i ? "1px solid var(--sep)" : 0 }}>
                  <span>{c.title || d.videos.find((v) => v.id === c.video_id)?.title || "Clip"}</span>
                  <RowTools table="step_videos" pk={{ id: c.id }} first={i === 0} last={i === d.clips.length - 1} label={c.title || "clip"} />
                </div>
              ))}
              {!d.clips.length && <div className="st-faint" style={{ marginBottom: 10 }}>No clips. A step can play one main video or a playlist.</div>}
              <AddClip stepId={d.step.id} />
            </Panel>
          </>
        ) : d.lesson ? (
          <>
            <Panel title={`${ll} · ${d.lesson.title}`} meta="settings">
              <RecordForm key={d.lesson.id} table="lessons" row={d.lesson} only={["title", "day_type", "day_number", "focus", "estimated_minutes", "form_id", "starter_table_id", "intro"]}
                choices={{ form_id: d.forms.map((f) => ({ value: f.id, label: `${f.title} (${f.id})` })), starter_table_id: d.tables.map((t) => ({ value: t.id, label: `${t.title} (${t.id})` })) }} />
            </Panel>
            <Panel title="Steps" meta={`${d.steps.length}`}>
              {d.steps.map((s) => (
                <div key={s.id} className="st-row" style={{ padding: "6px 0", borderTop: "1px solid var(--sep)" }}>
                  <Link href={`${base}&lesson=${d.lesson!.id}&step=${s.id}`} className="st-link" style={{ flex: 1 }}>{s.title}</Link>
                  {s.special !== "none" && <Chip variant="tint">{s.special}</Chip>}{s.kind && <Chip variant="outline">{s.kind}</Chip>}{s.video_id && <Chip variant="fill" icon="play">video</Chip>}
                </div>
              ))}
              {!d.steps.length && <div className="st-faint">No steps yet. Add one from the tree.</div>}
            </Panel>
          </>
        ) : section ? (
          <Panel title={`${sl} · ${section.title}`} meta="settings">
            <RecordForm key={section.id} table="sections" row={section} only={["title", "label", "subtitle", "description", "release_rule"]} />
          </Panel>
        ) : (
          <Note>Pick a {sl.toLowerCase()}, {ll.toLowerCase()} or step on the left to edit it. Use the arrows to reorder and the cross to delete.</Note>
        )}
      </div>
    </div>
  );
}
