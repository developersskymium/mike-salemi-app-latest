import type { Metadata } from "next";
import { Button, Chip, EmptyState, Glass, Icon, IconButton, LargeTitle } from "@/components/ui";
import { Medal } from "@/components/graphics";
import { EmptyScene } from "@/components/graphics";
import { ManageBillingButton, ResumePlanButton } from "@/components/commerce/CheckoutButton";
import { DraftChip } from "@/components/commerce/DraftChip";
import { OrderList } from "@/components/commerce/OrderList";
import { dateShort, money } from "@/components/commerce/format";
import { loadBilling } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";

export const metadata: Metadata = { title: "Billing" };

const STATUS: Record<string, { label: string; tone: "tint" | "fill" | "outline" }> = {
  active: { label: "Active", tone: "fill" },
  trialing: { label: "Trial", tone: "fill" },
  past_due: { label: "Payment due", tone: "outline" },
  cancelled: { label: "Ending", tone: "outline" },
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const [{ subscription: sub, planPrice, planDraftNote, orders, provider, paused }, { changed }] = await Promise.all([loadBilling(), searchParams]);
  if (paused && (!sub || sub.planRank <= paused.planRank)) return <PausedBilling paused={paused} orders={orders} />;
  const tier = !sub ? null : sub.planRank >= 2 ? "platinum" : sub.planRank === 1 ? "silver" : "bronze";
  const ending = sub && (sub.cancelAtPeriodEnd || sub.status === "cancelled");
  const status = sub ? STATUS[sub.status] ?? { label: sub.status, tone: "fill" as const } : null;

  return (
    <div className="com-page">
      <LargeTitle title="Billing" eyebrow="You" leading={<IconButton icon="back" label="Back to You" href="/you" size="sm" />} />

      {changed && (
        <p className="com-billing-note lq-t15" role="status">
          <Icon name="check" size="xs" /> Your plan is changed. The difference for the rest of this period is charged now, and you renew at the new price.
        </p>
      )}

      <Glass as="section" radius="card" className="com-plan-hero com-billing-hero" aria-labelledby="plan-h">
        <div className="com-plan-medal-wrap">
          {tier ? <Medal tier={tier} size={84} animated title={`${sub!.planName} membership`} /> : <Medal tier="silver" size={84} locked title="Free" />}
        </div>
        <div className="com-renew">
          <div className="com-row" style={{ gap: 8 }}>
            <span className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Your plan</span>
            {status && <Chip variant={status.tone} dot={sub!.status === "active" ? undefined : undefined}>{status.label}</Chip>}
            <DraftChip note={planDraftNote ?? planPrice?.draftNote} />
          </div>
          <h2 id="plan-h" className="lq-t34">{sub ? sub.planName : "Free"}</h2>
          {sub ? (
            <>
              <p className="lq-t15">
                {planPrice ? (
                  <>
                    <span className="lq-num">{money(planPrice.amountCents, planPrice.currency)}</span> a {sub.interval}
                  </>
                ) : (
                  <>Billed {sub.interval === "year" ? "yearly" : "monthly"}</>
                )}
              </p>
              <p className="lq-t13 lq-c2">
                {ending ? "Ends" : "Renews"} <span className="lq-num">{dateShort(sub.currentPeriodEnd)}</span>
                {provider && provider !== "stripe" ? " · Granted by Mike’s team, no card on file" : ""}
              </p>
            </>
          ) : (
            <p className="lq-t15 lq-c2">Free programs and tools. Upgrade any time for the full library.</p>
          )}
        </div>
        <div className="com-plan-actions">
          {sub ? (
            <>
              {provider === "stripe" && <ManageBillingButton />}
              <Button variant={provider === "stripe" ? "plain" : "glass"} size="md" href="/pricing" iconAfter="chevron">
                {sub.planRank >= 2 ? "Compare plans" : "Change plan"}
              </Button>
            </>
          ) : (
            <Button variant="filled" size="md" href="/pricing" icon="sparkle">See plans</Button>
          )}
        </div>
      </Glass>

      <OrdersSection orders={orders} />
      <BillingFoot />
    </div>
  );
}

type Billing = Awaited<ReturnType<typeof loadBilling>>;

/** Paused in Stripe: no charges, plan programs stay open to the end of the paid period, then lock until resumed. */
function PausedBilling({ paused, orders }: { paused: NonNullable<Billing["paused"]>; orders: Billing["orders"] }) {
  const tier = paused.planRank >= 2 ? "platinum" : paused.planRank === 1 ? "silver" : "bronze";
  const openUntil = paused.stillOpen ? paused.accessUntil : null;
  return (
    <div className="com-page">
      <LargeTitle title="Billing" eyebrow="You" leading={<IconButton icon="back" label="Back to You" href="/you" size="sm" />} />

      <Glass as="section" radius="card" className="com-plan-hero com-billing-hero" aria-labelledby="plan-h">
        <div className="com-plan-medal-wrap">
          <Medal tier={tier} size={84} locked title={`${paused.planName} membership, paused`} />
        </div>
        <div className="com-renew">
          <div className="com-row" style={{ gap: 8 }}>
            <span className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Your plan</span>
            <Chip variant="outline">Paused</Chip>
          </div>
          <h2 id="plan-h" className="lq-t34">{paused.planName}</h2>
          <p className="lq-t15">
            {paused.resumesAt ? (
              <>Paused, resumes <span className="lq-num">{dateShort(paused.resumesAt)}</span></>
            ) : (
              <>Paused until you resume</>
            )}
          </p>
          <p className="lq-t13 lq-c2">
            {openUntil ? (
              <>No charges while paused. Your {paused.planName} programs stay open until <span className="lq-num">{dateShort(openUntil)}</span>.</>
            ) : (
              <>No charges while paused. {paused.planName} programs are locked until you resume. Your progress is kept.</>
            )}
          </p>
        </div>
        <div className="com-plan-actions">
          <ResumePlanButton />
          <ManageBillingButton variant="plain" />
        </div>
      </Glass>

      <OrdersSection orders={orders} />
      <BillingFoot />
    </div>
  );
}

function OrdersSection({ orders }: { orders: Billing["orders"] }) {
  return (
    <section className="com-section" aria-labelledby="orders-h">
      <div className="com-between" style={{ margin: "0 4px 12px" }}>
        <h2 id="orders-h" className="lq-t22">Orders</h2>
        {orders.length > 0 && <span className="lq-t13 lq-c2 lq-num">{orders.length}</span>}
      </div>
      {orders.length ? (
        <Glass radius="card" className="com-panel">
          <OrderList orders={orders} />
        </Glass>
      ) : (
        <Glass radius="card">
          <EmptyState
            illustration={<EmptyScene scene="nothing-saved" size={168} />}
            title="No purchases yet"
            body="Programs, retreats and coaching you buy show up here with their receipts."
            action={<Button variant="glass" size="md" href="/programs">Explore programs</Button>}
          />
        </Glass>
      )}
    </section>
  );
}

function BillingFoot() {
  return (
    <p className="lq-t13 lq-c3 com-billing-foot">
      <Icon name="lock" size="xs" /> Payments are processed by Stripe. Card details never touch our servers.
    </p>
  );
}
