import type { Metadata } from "next";
import type { CatalogProgram, PricingPlan } from "@ms/api";
import { Button, Icon } from "@/components/ui";
import { money } from "@/components/discover/access";
import { PricingExplorer } from "@/components/discover/public/Plans";
import { Draft, SectionHead } from "@/components/discover/public/Pieces";
import { freeProgramIds, isDraftPlan, planValue, yearly, type PlanValue } from "@/components/discover/public/value";
import { loadExplore } from "@/lib/loaders/discover";
import { publicPrices, publicViewer } from "@/lib/loaders/public";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One membership for Mike Salemi's kettlebell programs. Start free, upgrade when you're ready, or buy a course on its own.",
};

export default async function PricingPage() {
  const { supabase, signedIn } = await publicViewer();
  let plans: PricingPlan[], catalog: CatalogProgram[];
  const prices = await publicPrices(supabase);
  try {
    ({ plans, catalog } = await loadExplore(supabase));
  } catch {
    return (
      <div className="pub-wrap pub-empty">
        <h1 className="lq-d-md">Pricing didn&rsquo;t load</h1>
        <p className="lq-t15 lq-c2">Check your connection and try again.</p>
        <Button variant="secondary" size="md" href="/pricing">Try again</Button>
      </div>
    );
  }
  const freeIds = freeProgramIds(plans);
  const values: Record<string, PlanValue> = Object.fromEntries(plans.map((p) => [p.id, planValue(p, prices.programs, freeIds)]));
  const slugOf = new Map(catalog.map((c) => [c.id, c.slug]));
  // Programs a paid plan covers (included or discounted), in catalog order, minus free ones.
  const paidIds = new Set(plans.filter((p) => p.prices.length).flatMap((p) => p.benefits.filter((b) => b.scope === "content").map((b) => b.programId)));
  const pickable = catalog
    .filter((c) => paidIds.has(c.id) && !freeIds.has(c.id))
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, listCents: prices.programs.find((x) => x.programId === c.id)?.amountCents ?? null }));
  const rows = new Map<string, string>();
  for (const p of plans) for (const b of p.benefits) if (b.scope === "content") rows.set(b.programId, b.programName);
  const draft = plans.map(isDraftPlan).find(Boolean) ?? null;

  return (
    <div className="pub-wrap" style={{ paddingBottom: 112 }}>
      <header className="pub-pagehead" data-center>
        <p className="lq-eyebrow" data-tone="accent">Membership</p>
        <h1 className="lq-d-xl">Start free. Go further when you&rsquo;re ready.</h1>
        <p className="lq-lede">Every plan includes the free tools and starter series. Buy a single course on its own, or let a plan carry the whole path.</p>
        {draft && (
          <p className="lq-t13 lq-c2" style={{ margin: 0, display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Draft note={draft} /> Prices shown are previews and may change before launch.
          </p>
        )}
      </header>

      <div style={{ marginTop: 40 }}>
        <PricingExplorer plans={plans} values={values} pickable={pickable} signedIn={signedIn} />
      </div>

      {rows.size > 0 && (
        <section className="pub-band" data-tight aria-labelledby="compare">
          <SectionHead eyebrow="Side by side" id="compare" title="Compare plans" lede="What each plan includes, and what the programs cost on their own." />
          <div className="pub-compare">
            <table>
              <thead>
                <tr>
                  <th scope="col">Program</th>
                  <th scope="col">On its own</th>
                  {plans.map((p) => (
                    <th key={p.id} scope="col">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].map(([id, name]) => {
                  const lp = prices.programs.find((x) => x.programId === id);
                  return (
                    <tr key={id}>
                      <th scope="row">{slugOf.get(id) ? <a className="pub-link" href={`/explore/${slugOf.get(id)}`}>{name}</a> : name}</th>
                      <td data-none={!lp && !freeIds.has(id) ? "" : undefined}>{freeIds.has(id) ? "Free" : lp ? money(lp.amountCents, lp.currency) : "Plan only"}</td>
                      {plans.map((p) => {
                        const b = p.benefits.find((x) => x.programId === id && x.scope === "content");
                        return b?.benefit === "included" ? (
                          <td key={p.id}><Icon name="check" size="sm" label="Included" /></td>
                        ) : b?.benefit === "discount" ? (
                          <td key={p.id} data-discount="">{b.discountPercent}% off</td>
                        ) : (
                          <td key={p.id} data-none=""><span aria-label="Not included">–</span></td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">A year</th>
                  <td>—</td>
                  {plans.map((p) => {
                    const y = yearly(p);
                    return <td key={p.id}>{y ? money(y.amountCents, y.currency) : money(0)}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <section className="pub-band" data-tight aria-labelledby="pq">
        <SectionHead eyebrow="Questions" id="pq" title="Before you choose" />
        <div className="pub-faq">
          {[
            ["Can I start without paying?", "Yes. The free plan includes the starter series and tools, with no card needed."],
            ["Can I buy one course instead of a plan?", "Yes. Courses like Mastering the Kettlebell are sold on their own as a one-time purchase you keep."],
            ["Can I switch or cancel?", "Yes. Change or cancel your plan from your account at any time."],
            ["Are retreats and coaching included?", "They're booked separately: retreats by application, coaching by session."],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}<Icon name="plus" size="sm" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
