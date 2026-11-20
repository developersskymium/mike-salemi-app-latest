"use client";

import { useState } from "react";
import { Button, Glass, Icon, type ButtonVariant } from "@/components/ui";
import "./commerce.css";

type Kind = "plan" | "program" | "bundle" | "run" | "coaching";

type Props = {
  kind: Kind;
  /** Plan id, program slug/uuid, bundle, run uuid or coaching package uuid. The server prices it. */
  refId: string;
  interval?: "one_time" | "month" | "year";
  coupon?: string | null;
  offerId?: string | null;
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  className?: string;
};

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "off" } | { kind: "error"; message: string };

const REASONS: Record<string, string> = {
  not_signed_in: "Sign in to continue.",
  invalid_request: "Something about this purchase isn't right. Refresh and try again.",
  already_owned: "You already have this.",
  included: "This is already included in your membership.",
  application_required: "Apply first — Mike reviews every application.",
  run_not_open: "Bookings for this date aren't open.",
  invalid_coupon: "That code isn't valid.",
  coupon_not_applicable: "That code can't be used on this.",
  no_price: "This isn't for sale yet.",
  checkout_failed: "Stripe didn't respond. Try again in a moment.",
  order_failed: "We couldn't start your order. Try again in a moment.",
};

/**
 * Starts Stripe Checkout: POST /api/stripe/checkout, then redirect. The browser only says what it wants;
 * the server computes the price. A 503 means payments aren't switched on yet.
 */
export function CheckoutButton({ kind, refId, interval, coupon, offerId, label, variant = "filled", size = "lg", block, className }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function go() {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, ref: refId, interval, coupon: coupon ?? null, offer_id: offerId ?? null }),
      });
      if (res.status === 503) return setStatus({ kind: "off" });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
      if (res.status === 401) {
        window.location.href = `/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      if (!res.ok || !body.url) return setStatus({ kind: "error", message: REASONS[body.error ?? ""] ?? body.message ?? "Checkout didn't start. Try again." });
      window.location.assign(body.url);
    } catch {
      setStatus({ kind: "error", message: "You seem to be offline. Check your connection and try again." });
    }
  }

  return (
    <div className={className}>
      <Button variant={variant} size={size} block={block} icon={status.kind === "loading" ? undefined : "lock"} onClick={go} disabled={status.kind === "loading"} aria-busy={status.kind === "loading"}>
        {status.kind === "loading" ? "Opening secure checkout…" : label}
      </Button>
      <div aria-live="polite">
        {status.kind === "off" && (
          <Glass radius="panel" className="com-payoff" role="status">
            <Icon name="clock" size="sm" />
            <div>
              <div className="lq-t15" style={{ fontWeight: 600 }}>Payments aren&rsquo;t switched on yet</div>
              <div className="lq-t13 lq-c2">Nothing was charged. Checkout opens here as soon as Mike turns payments on.</div>
            </div>
          </Glass>
        )}
        {status.kind === "error" && (
          <p className="com-error com-checkout-note" role="alert">
            <Icon name="close" size="xs" /> {status.message}
          </p>
        )}
      </div>
    </div>
  );
}

/** Opens the Stripe customer portal (card, invoices, cancel or change plan). */
export function ManageBillingButton({ label = "Manage billing", variant = "glass", size = "md", block }: { label?: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; block?: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  async function go() {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.status === 503) return setStatus({ kind: "off" });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 404) return setStatus({ kind: "error", message: "Your membership isn't billed through a card, so there's nothing to manage here." });
      if (!res.ok || !body.url) return setStatus({ kind: "error", message: "The billing portal didn't open. Try again." });
      window.location.assign(body.url);
    } catch {
      setStatus({ kind: "error", message: "You seem to be offline." });
    }
  }
  return (
    <div>
      <Button variant={variant} size={size} block={block} icon="settings" onClick={go} disabled={status.kind === "loading"} aria-busy={status.kind === "loading"}>
        {status.kind === "loading" ? "Opening…" : label}
      </Button>
      <div aria-live="polite">
        {status.kind === "off" && (
          <Glass radius="panel" className="com-payoff" role="status">
            <Icon name="clock" size="sm" />
            <div>
              <div className="lq-t15" style={{ fontWeight: 600 }}>Payments aren&rsquo;t switched on yet</div>
              <div className="lq-t13 lq-c2">Card and invoice management opens here once payments are live.</div>
            </div>
          </Glass>
        )}
        {status.kind === "error" && <p className="com-error lq-c2" style={{ marginTop: 8 }} role="alert">{status.message}</p>}
      </div>
    </div>
  );
}
