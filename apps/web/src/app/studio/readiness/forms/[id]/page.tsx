import { notFound } from "next/navigation";
import { Disclosure, RecordForm } from "@/components/studio/forms";
import { BandsEditor, QuestionEditor } from "@/components/studio/readiness";
import { PageHead, Panel } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadForm } from "@/lib/studio/loaders";

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const d = await loadForm(id);
  if (!d) notFound();
  const maxPossible = d.questions.reduce((n, q) => n + Math.max(0, ...(Array.isArray(q.options) ? q.options : []).map((o: { weight?: number }) => Number(o.weight) || 0)), 0);
  return (
    <>
      <PageHead eyebrow={[{ label: "Readiness", href: "/studio/readiness" }, { label: d.form.title }]} title={d.form.title} sub={`Questions can add up to ${maxPossible} points; the form's max score is ${d.form.max_score}.`} />
      <Panel title="Form"><RecordForm key={d.form.updated_at} table="forms" row={d.form} cols={3} only={["title", "max_score", "default_table_id"]} choices={{ default_table_id: d.tables.map((t) => ({ value: t.id, label: t.title })) }} /></Panel>
      <Panel title="Bands" meta="score ranges → what the member does today"><BandsEditor key={d.bands.map((b) => b.id + b.min_score + b.max_score).join()} formId={id} maxScore={d.form.max_score} bands={d.bands as never} tables={d.tables as never} /></Panel>
      <Panel title="Questions" meta={`${d.questions.length}`}>
        {d.questions.map((q, i) => <QuestionEditor key={q.key} q={q as never} first={i === 0} last={i === d.questions.length - 1} />)}
        {!d.questions.length && <div className="st-empty">No questions yet.</div>}
        <Disclosure label="Add question"><RecordForm table="form_questions" fixed={{ form_id: id }} only={["key", "prompt"]} defaults={{ options: "[]" }} cols={1} /></Disclosure>
      </Panel>
    </>
  );
}
