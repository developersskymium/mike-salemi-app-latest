"use client";

import { ErrorPanel } from "@/components/commerce/ErrorPanel";

export default function RunError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorPanel title="This retreat didn’t load" body="Check your connection and try again." onRetry={reset} />;
}
