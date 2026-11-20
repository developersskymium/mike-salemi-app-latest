import Link from "next/link";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { Icon } from "@/components/ui";
import { getPlanSavings } from "@/lib/access";
import "./access.css";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * You › Plan & savings (spec 12 You #4): what your plan includes vs what you bought à la carte,
 * and the plan math for the next plan up ("would include these + N more"), with purchases from the last
 * 30 days credited toward it. All amounts come from the server (my_plan_savings).
 */
export async function PlanSavings() {
  const s = await getPlanSavings();
  if (!s) return null;
  const current = s.plans.find((p) => p.current) ?? null;
  const next = s.plans.find((p) => p.rank > (s.plan?.rank ?? 0)) ?? null;
  const includedValue = (current?.includes ?? []).reduce((t, p) => t + (p.listCents ?? 0), 0);
  const ownedCovered = next ? next.includes.filter((p) => p.owned) : [];
  const more = next ? next.includes.filter((p) => !p.owned) : [];
  const spent = s.owned.reduce((t, o) => t + (o.paidCents ?? 0), 0);
  return (
    <section className="ac-savings" aria-label="Plan & savings">
      <header className="ac-sec-head">
        <h2 className="lq-d-sm">Plan &amp; savings</h2>
        <p className="lq-t13 lq-c2">Your plan: <b>{s.plan?.name ?? "Free"}</b></p>
      </header>
      <div className="ac-savings-grid">
        <div className="ac-savings-card">
          <span className="lq-eyebrow">Your plan includes</span>
          {current && current.includes.length ? (
            <>
              <ul className="ac-ticks">
                {current.includes.map((p) => (
                  <li key={p.slug} className="lq-t15"><Icon name="check" size="xs" /> {p.name}</li>
                ))}
              </ul>
              {includedValue > 0 && <p className="lq-t13 lq-c2">Worth <b className="lq-num">{money(includedValue)}</b> bought one by one.</p>}
            </>
          ) : (
            <p className="lq-t15 lq-c2">The free series, the Roadmap and the tools.</p>
          )}
        </div>
        <div className="ac-savings-card">
          <span className="lq-eyebrow">Bought à la carte</span>
          {s.owned.length ? (
            <>
              <ul className="ac-ticks">
                {s.owned.map((o) => (
                  <li key={o.slug} className="lq-t15"><Icon name="check" size="xs" /> {o.name}{o.paidCents != null && <span className="lq-c2 lq-num"> · {money(o.paidCents)}</span>}</li>
                ))}
              </ul>
              {spent > 0 && <p className="lq-t13 lq-c2">Yours for life. Total <b className="lq-num">{money(spent)}</b>.</p>}
            </>
          ) : (
            <p className="lq-t15 lq-c2">Nothing yet.</p>
          )}
        </div>
        {next && (
          <div className="ac-savings-card ac-savings-next">
            <span className="lq-eyebrow" data-tone="accent">{next.name}{next.monthCents ? ` · ${money(next.monthCents)}/mo` : ""}</span>
            <p className="lq-d-xs">
              {ownedCovered.length
                ? `${next.name} would include ${ownedCovered.map((p) => p.name).join(" and ")} + ${more.length} more`
                : `${next.name} includes ${next.includes.length} programs`}
            </p>
            <ul className="ac-ticks">
              {more.slice(0, 4).map((p) => (
                <li key={p.slug} className="lq-t13"><Icon name="plus" size="xs" /> {p.name}</li>
              ))}
            </ul>
            {next.creditCents > 0 && (
              <p className="lq-t13"><b className="lq-num">{money(next.creditCents)}</b> of your recent purchases counts toward {next.name} (bought in the last 30 days).</p>
            )}
            <div className="ac-sheet-actions">
              <CheckoutButton kind="plan" refId={next.id} interval="month" label={`Upgrade to ${next.name}`} size="sm" />
              <Link href="/pricing" className="lq-t13 ac-back">Compare plans</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
