import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass, Icon } from "@/components/ui";
import { PlanWizard } from "@/components/selfguided/PlanWizard";
import { loadProgramPage } from "@/lib/loaders/training";
import { loadBoard } from "@/lib/loaders/selfguided";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Plan your weeks", description: "Turn the program's day-by-day plan into your own schedule." };

/** Self-Guided planning wizard as a page (entry from Today and the Self-Guided home); the program page opens it in a sheet. */
export default async function WizardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = (await searchParams).path;
  const data = await loadProgramPage(slug, typeof path === "string" ? path : null);
  if (!data || data.program.access === "locked" || data.locked) notFound();
  const board = await loadBoard(slug, data.path?.key ?? null, data.program.id, data.path?.id ?? null).catch(() => null);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 18, paddingBottom: 40 }}>
      <Link href={`/programs/${slug}?mode=self-guided`} className="lq-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
        <Icon name="back" size="xs" /> {data.program.name}
      </Link>
      <header style={{ display: "grid", gap: 8 }}>
        <p className="lq-eyebrow" data-tone="accent">
          Self-Guided · Plan your weeks
        </p>
        <h1 className="lq-d-xl">Your weeks, laid out.</h1>
        <p className="lq-lede lq-c2" style={{ margin: 0 }}>
          {data.program.name} already has a day-by-day plan. Pick a level, your days and a start date — we turn it into a schedule on your Plan.
        </p>
      </header>
      <Glass radius="card" style={{ padding: "22px 24px 16px" }}>
        <PlanWizard data={data} board={board} />
      </Glass>
    </div>
  );
}
