"use client";

import { useState } from "react";
import { Button, Chip, Icon, Segmented, Sheet } from "@/components/ui";
import { ChipChoice, ChoiceRows } from "@/components/ui/form";
import { billingIntent } from "@/lib/settings/actions";
import type { SettingsHub } from "@/lib/settings/model";
import { dateLong, Group, money, Row } from "./parts";

type Flow = null | "change" | "pause" | "cancel";

const REASONS = ["Too expensive", "Not using it enough", "Injury or a break", "Found something else", "Something else"];

/** Billing in plain words + Change / Pause / Cancel (pause offered before cancel) + invoices with PDF. */
export function BillingGroup({ b }: { b: SettingsHub["billing"] }) {
  const [flow, setFlow] = useState<Flow>(null);
  const [step, setStep] = useState(0);
  const [interval, setInterval] = useState<"month" | "year">(b.interval ?? "year");
  const [plan, setPlan] = useState<string | null>(null);
  const [months, setMonths] = useState("1");
  const [reason, setReason] = useState<string | null>(null);
  const [done, setDone] = useState<null | "change" | "pause" | "cancel">(null);
  const [pending, setPending] = useState(false);

  const start = (f: Flow) => {
    setFlow(f);
    setStep(0);
    setDone(null);
    setPlan(null);
    setReason(null);
  };
  const submit = async (kind: "change" | "pause" | "cancel") => {
    setPending(true);
    await billingIntent(kind, { plan: plan ?? undefined, interval, months: Number(months), reason: reason ?? undefined });
    setPending(false);
    setDone(kind);
  };

  const free = !b.plan || b.plan.id === "free";
  const every = b.interval === "year" ? "a year" : "a month";
  const granted = b.provider && b.provider !== "stripe";

  const sentence = free ? (
    <>You&apos;re on the <b>Free</b> plan: free series, tools and any programs you&apos;ve bought.</>
  ) : (
    <>
      You&apos;re on <b>{b.plan!.name}</b>
      {b.amountCents != null && <>, <span className="lq-num">{money(b.amountCents, b.currency)}</span> {every}</>}.{" "}
      {b.ending ? <>It ends on <b className="lq-num">{dateLong(b.renewsOn)}</b> and won&apos;t renew.</> : granted ? <>Mike&apos;s team set this up for you, so there&apos;s no card on file. It runs until <b className="lq-num">{dateLong(b.renewsOn)}</b>.</> : <>Next payment on <b className="lq-num">{dateLong(b.renewsOn)}</b>.</>}
    </>
  );

  return (
    <Group id="billing" title="Billing">
      <div className="st-billing">
        <p className="st-billing-line">{sentence}</p>
        <div className="st-billing-actions">
          <Button size="md" variant="secondary" onClick={() => start("change")}>{free ? "See plans" : "Change plan"}</Button>
          {!free && !b.ending && <Button size="md" variant="secondary" onClick={() => start("pause")}>Pause</Button>}
          {!free && !b.ending && <Button size="md" variant="plain" onClick={() => start("cancel")}>Cancel</Button>}
        </div>
      </div>
      <div className="st-sub-h">Invoices</div>
      {b.invoices.length ? (
        b.invoices.map((i) => (
          <Row key={i.id} label={i.label} detail={<span className="lq-num">{dateLong(i.date)} · {i.reference}</span>}>
            <span className="st-inv">
              <span className="lq-num st-value">{money(i.totalCents, i.currency)}</span>
              {i.status === "refunded" && <Chip size="sm" variant="outline">Refunded</Chip>}
              <a className="st-pdf lq-press" href={`/you/settings/invoices/${i.id}`} download aria-label={`Download invoice ${i.reference} as PDF`}>
                <Icon name="download" size="xs" /> PDF
              </a>
            </span>
          </Row>
        ))
      ) : (
        <Row label="No invoices yet" detail="Receipts for plans and programs appear here." />
      )}

      <Sheet open={flow !== null} onClose={() => setFlow(null)} title={flow === "change" ? "Change plan" : flow === "pause" ? "Pause your plan" : "Cancel your plan"} detents={["large"]}
        footer={done ? <Button block size="lg" onClick={() => setFlow(null)}>Done</Button> : footer()}>
        <div className="st-sheet">
          {done ? <Pending kind={done} live={b.paymentsLive} /> : body()}
        </div>
      </Sheet>
    </Group>
  );

  function body() {
    if (flow === "change")
      return (
        <>
          <Segmented<"month" | "year"> label="Billing period" variant="fill" value={interval} onChange={setInterval} options={[{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly · 2 months free" }]} />
          <ChoiceRows
            label="Plans"
            options={b.plans.map((p) => {
              const c = interval === "year" ? p.yearCents : p.monthCents;
              return { value: p.id, label: p.id === b.plan?.id ? `${p.name} · current` : p.name, description: c == null ? "Free series, tools, programs you buy" : `${money(c, "usd")} ${interval === "year" ? "a year" : "a month"}` };
            })}
            value={plan ?? b.plan?.id ?? "free"}
            onChange={(v) => setPlan(v as string)}
          />
          <p className="st-note">Moving up starts today; moving down starts at your next renewal. Programs you bought stay yours.</p>
        </>
      );
    if (flow === "pause")
      return (
        <>
          <p className="st-lede">Take a break without losing anything. Your progress, plan and badges wait for you.</p>
          <span className="fm-label" id="st-pm">Pause for</span>
          <ChipChoice<string> labelledBy="st-pm" options={[{ value: "1", label: "1 month" }, { value: "2", label: "2 months" }, { value: "3", label: "3 months" }]} value={months} onChange={(v) => setMonths(v as string)} />
          <p className="st-note">No charges while paused. It restarts on its own, and we&apos;ll email you a week before.</p>
        </>
      );
    // cancel: step 0 offers a pause first, step 1 asks why, step 2 confirms
    if (step === 0)
      return (
        <>
          <p className="st-lede">Before you go: would a pause help? Keep everything, pay nothing for up to 3 months.</p>
          <div className="st-offer">
            <Icon name="pause" size="sm" />
            <span><b>Pause instead</b><br /><span className="st-row-detail">Progress, plan and badges stay put.</span></span>
          </div>
        </>
      );
    if (step === 1)
      return (
        <>
          <span className="fm-label" id="st-why">What&apos;s the main reason? <span className="fm-opt">(optional)</span></span>
          <ChoiceRows labelledBy="st-why" options={REASONS.map((r) => ({ value: r, label: r }))} value={reason} onChange={(v) => setReason(v as string)} />
        </>
      );
    return (
      <>
        <p className="st-lede">Your plan stays active until <b className="lq-num">{dateLong(b.renewsOn)}</b>, then you move to Free.</p>
        <ul className="st-list">
          <li>Programs you bought stay yours.</li>
          <li>Your progress, badges and certificates stay.</li>
          <li>You can come back any time.</li>
        </ul>
      </>
    );
  }

  function footer() {
    if (flow === "change") return <Button block size="lg" disabled={pending || !plan || plan === b.plan?.id} onClick={() => submit("change")}>Switch plan</Button>;
    if (flow === "pause") return <Button block size="lg" disabled={pending} onClick={() => submit("pause")}>Pause for {months} month{months === "1" ? "" : "s"}</Button>;
    if (step === 0)
      return (
        <div className="st-foot2">
          <Button block size="lg" onClick={() => { setFlow("pause"); }}>Pause instead</Button>
          <Button block size="md" variant="plain" onClick={() => setStep(1)}>Continue to cancel</Button>
        </div>
      );
    if (step === 1) return <Button block size="lg" variant="secondary" onClick={() => setStep(2)}>Continue</Button>;
    return <Button block size="lg" variant="secondary" disabled={pending} onClick={() => submit("cancel")}>Cancel my plan</Button>;
  }
}

function Pending({ kind, live }: { kind: "change" | "pause" | "cancel"; live: boolean }) {
  const what = { change: "Plan changes", pause: "Pausing", cancel: "Cancelling" }[kind];
  return (
    <div className="st-done" role="status">
      <span className="st-done-icon"><Icon name={live ? "check" : "clock"} size="md" /></span>
      <h3 className="lq-d-sm">{live ? "Done" : `${what} will be available once payments switch on`}</h3>
      <p className="st-lede">
        {live
          ? "We've emailed you a confirmation."
          : "We've noted your request and Mike's team will take care of it by hand this week. Nothing has been charged or changed yet."}
      </p>
    </div>
  );
}
