"use client";

import { ErrorPanel } from "@/components/commerce/ErrorPanel";

export default function BillingError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorPanel title="Billing didn’t load" body="Your plan and orders are safe. Try again in a moment." onRetry={reset} />;
}
