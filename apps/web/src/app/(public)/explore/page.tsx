import type { Metadata } from "next";
import type { CatalogProgram } from "@ms/api";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ProgramCard } from "@/components/discover/ProgramCard";
import { publicChip } from "@/components/discover/access";
import { loadExplore } from "@/lib/loaders/discover";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Programs",
  description: "Kettlebell Lifestyle, Mastering the Kettlebell, retreats, coaching and free tools from Mike Salemi.",
};

const GROUPS: { key: string; title: string; line: string }[] = [
  { key: "training", title: "Training", line: "Day-by-day programs and technique courses." },
  { key: "experiences", title: "Experiences", line: "Retreats, coaching and group challenges with Mike." },
  { key: "free", title: "Free", line: "Start here. No card needed." },
];

export default async function ExplorePage() {
  const sb = await createClient();
  let catalog: CatalogProgram[], plans: Awaited<ReturnType<typeof loadExplore>>["plans"];
  try {
    ({ catalog, plans } = await loadExplore(sb));
  } catch {
    return (
      <EmptyState title="Programs didn't load" body="Check your connection and try again." illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/explore">Try again</Button>} />
    );
  }
  return (
    <div className="dsc-explore">
      <header className="dsc-page-head">
        <p className="lq-t15 lq-c2 dsc-eyebrow">Programs</p>
        <h1 className="dsc-display">Find the work that fits you.</h1>
      </header>
      {GROUPS.map((g, gi) => {
        const list = catalog.filter((p) => p.catalogGroup === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} aria-labelledby={`g-${g.key}`} className="dsc-explore-group">
            <div className="dsc-sech">
              <h2 id={`g-${g.key}`} className="lq-t28">{g.title}</h2>
              <span className="lq-t15 lq-c2 dsc-explore-line">{g.line}</span>
            </div>
            <div className="dsc-grid">
              {list.map((p, i) => (
                <ProgramCard key={p.id} program={p} href={`/explore/${p.slug}`} action={p.access === "free" ? "Start free" : "Learn more"} priority={gi === 0 && i < 3} height={380} chip={publicChip(p, plans)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
