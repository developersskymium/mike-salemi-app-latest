import { notFound } from "next/navigation";
import { TableGrid } from "@/components/studio/readiness";
import { PageHead, Panel } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadTable } from "@/lib/studio/loaders";

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  await studioAdmin();
  const { id } = await params;
  const t = await loadTable(id);
  if (!t) notFound();
  return (
    <>
      <PageHead eyebrow={[{ label: "Readiness", href: "/studio/readiness" }, { label: t.title }]} title={t.title} sub={`Workout table ${t.id}. Rows appear in the Workout step for members on a matching band.`} />
      <Panel><TableGrid key={t.updated_at} id={t.id} title={t.title} notes={t.notes ?? ""} rows={Array.isArray(t.rows) ? t.rows : []} /></Panel>
    </>
  );
}
