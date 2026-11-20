import type { Metadata } from "next";
import { Button, EmptyState, Glass, Icon } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { PlansGrid } from "@/components/discover/public/Plans";
import { loadPricing } from "@/lib/loaders/discover";
import { createClient, getUser } from "@/lib/supabase/server";
import type { PricingPlan } from "@ms/api";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One membership for Mike Salemi's kettlebell programs. Start free, upgrade when you're ready.",
};

export default async function PricingPage() {
  const [{ user }, sb] = await Promise.all([getUser(), createClient()]);
  let plans: PricingPlan[];
  try {
    plans = await loadPricing(sb);
  } catch {
    return (
      <EmptyState title="Pricing didn't load" body="Check your connection and try again." illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/pricing">Try again</Button>} />
    );
  }
  const programs = new Map<string, string>();
  for (const p of plans) for (const b of p.benefits) if (b.scope === "content") programs.set(b.programSlug, b.programName);
  return (
    <div className="dsc-pricing">
      <header className="dsc-page-head">
        <p className="lq-t15 lq-c2 dsc-eyebrow">Membership</p>
        <h1 className="dsc-display">Start free. Go further when you’re ready.</h1>
        <p className="lq-t17 lq-c2">Every plan includes the free tools and starter series. Cancel anytime.</p>
      </header>
      <PlansGrid plans={plans} signedIn={Boolean(user)} />

      <section aria-labelledby="compare" className="dsc-compare-wrap">
        <h2 id="compare" className="lq-t28">Compare plans</h2>
        <Glass radius="card" className="dsc-compare">
          <table>
            <thead>
              <tr>
                <th scope="col" className="lq-t13 lq-c2">Program</th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className="lq-t15">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...programs].map(([slug, name]) => (
                <tr key={slug}>
                  <th scope="row" className="lq-t15">{name}</th>
                  {plans.map((p) => {
                    const b = p.benefits.find((x) => x.programSlug === slug && x.scope === "content");
                    return (
                      <td key={p.id} className="lq-t13">
                        {b?.benefit === "included" ? (
                          <Icon name="check" size="sm" label="Included" />
                        ) : b?.benefit === "discount" ? (
                          <span className="lq-num">{b.discountPercent}% off</span>
                        ) : (
                          <span className="lq-c3" aria-label="Not included">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      </section>
    </div>
  );
}
