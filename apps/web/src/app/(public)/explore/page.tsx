import type { Metadata } from "next";
import Link from "next/link";
import type { CatalogProgram, PricingPlan } from "@ms/api";
import { Button, Chip, Tag } from "@/components/ui";
import { includedIn } from "@/components/discover/access";
import { Photo, SectionHead } from "@/components/discover/public/Pieces";
import { ProgramTile } from "@/components/discover/public/ProgramTile";
import { photoFor } from "@/components/discover/public/photos";
import { loadExplore } from "@/lib/loaders/discover";
import { publicPrices, publicViewer } from "@/lib/loaders/public";

export const metadata: Metadata = {
  title: "Programs",
  description: "Kettlebell Lifestyle, Mastering the Kettlebell, retreats, coaching and free series from Mike Salemi.",
};

const GROUPS: { key: string; title: string; line: string; eyebrow: string }[] = [
  { key: "training", eyebrow: "Train", title: "Programs and courses", line: "Day-by-day plans and technique courses you can follow from home." },
  { key: "experiences", eyebrow: "With Mike", title: "Retreats and coaching", line: "In person on Mount Shasta, or one to one by video." },
  { key: "free", eyebrow: "Free", title: "Start here, free", line: "Short series and tools. No card needed." },
];

const FILTERS = [{ key: "all", label: "All programs" }, ...GROUPS.map((g) => ({ key: g.key, label: g.key === "training" ? "Training" : g.key === "experiences" ? "Retreats & coaching" : "Free" }))];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter = FILTERS.some((f) => f.key === show) ? show! : "all";
  const { supabase } = await publicViewer();
  let catalog: CatalogProgram[], plans: PricingPlan[];
  const prices = await publicPrices(supabase);
  try {
    ({ catalog, plans } = await loadExplore(supabase));
  } catch {
    return (
      <div className="pub-wrap pub-empty">
        <h1 className="lq-d-md">Programs didn&rsquo;t load</h1>
        <p className="lq-t15 lq-c2">Check your connection and try again.</p>
        <Button variant="secondary" size="md" href="/explore">Try again</Button>
      </div>
    );
  }
  const listFor = (id: string) => prices.programs.find((x) => x.programId === id);
  const kbl = catalog.find((p) => p.slug === "kettlebell-lifestyle");
  const count = (k: string) => (k === "all" ? catalog.length : catalog.filter((p) => p.catalogGroup === k).length);
  const groups = GROUPS.filter((g) => filter === "all" || g.key === filter);

  return (
    <div className="pub-wrap" style={{ paddingBottom: 112 }}>
      <header className="pub-pagehead">
        <p className="lq-eyebrow" data-tone="accent">Programs</p>
        <h1 className="lq-d-xl">Find the work that fits you.</h1>
        <p className="lq-lede">Every program, retreat and coaching option in one place. Not sure? The <Link href="/#finder" className="pub-link">three-tap finder</Link> picks one for you.</p>
        <nav className="pub-filter" aria-label="Filter programs">
          {FILTERS.map((f) => (
            <Link key={f.key} href={f.key === "all" ? "/explore" : `/explore?show=${f.key}`} aria-current={filter === f.key ? "true" : undefined} scroll={false}>
              {f.label} <small className="lq-num">{count(f.key)}</small>
            </Link>
          ))}
        </nav>
      </header>

      {kbl && (filter === "all" || filter === "training") && (
        <section className="pub-flag" aria-labelledby="flag-title">
          <Photo p={photoFor("kettlebell-lifestyle")} sizes="(min-width: 1240px) 1160px, 100vw" priority />
          <div className="pub-flag-copy">
            <Tag tone="light">Mike Salemi · Flagship</Tag>
            <h2 id="flag-title" className="lq-d-xl">{kbl.name}</h2>
            <p>{kbl.summary}</p>
            <div className="pub-flag-chips">
              {["2 levels", "4 phases", "61 days per level", "Immersion or Self-Guided"].map((c) => (
                <Chip key={c} variant="clear">{c}</Chip>
              ))}
            </div>
            <div className="pub-flag-cta">
              <Button href={`/explore/${kbl.slug}`} size="lg" iconAfter="arrowRight">See the program</Button>
              {includedIn(kbl.id, plans) && <span>Included with {includedIn(kbl.id, plans)!.name}</span>}
            </div>
          </div>
        </section>
      )}

      {groups.map((g, gi) => {
        const list = catalog.filter((p) => p.catalogGroup === g.key && !(p.slug === "kettlebell-lifestyle" && filter !== "free"));
        if (!list.length) return null;
        return (
          <section key={g.key} className="pub-group" aria-labelledby={`g-${g.key}`}>
            <SectionHead eyebrow={g.eyebrow} tone={g.key === "experiences" ? "warm" : "accent"} id={`g-${g.key}`} title={g.title} lede={g.line} />
            <div className="pub-cards">
              {list.map((p, i) => (
                <ProgramTile key={p.id} p={p} plans={plans} list={listFor(p.id)} priority={gi === 0 && i < 3 && !kbl} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
