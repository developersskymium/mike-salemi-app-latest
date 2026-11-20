import type { Metadata } from "next";
import { Button, Glass, Icon } from "@/components/ui";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import "@/components/commerce/commerce.css";

export const metadata: Metadata = { title: "Checkout cancelled" };

/** Stripe's cancel_url lands here (route handler uses /checkout/cancelled; /checkout/cancel renders the same). */
export default async function CheckoutCancelled(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const shop = (await props.searchParams).from === "shop";
  return (
    <div className="com-result">
      <div className="com-stack" style={{ width: "min(100%, 460px)" }}>
        <Glass radius="card" className="com-result-card">
          <span className="com-cancel-mark" aria-hidden>
            <Icon name="close" size="lg" />
          </span>
          <h1 className="lq-t28">No charge was made</h1>
          <p className="lq-t15 lq-c2">
            {shop
              ? "You left checkout before paying. Your cart is still saved on this device, ready when you are."
              : "You left checkout before paying. Nothing changed on your account, and you can pick up where you left off any time."}
          </p>
          {shop ? (
            <Button block href="/shop" icon="shop">Back to your cart</Button>
          ) : (
            <Button block variant="glass" href="/programs" icon="back">Back to programs</Button>
          )}
          <Button variant="plain" size="md" href="/today">Go to Today</Button>
        </Glass>
        <OfferSlot placement="checkout" />
      </div>
    </div>
  );
}
