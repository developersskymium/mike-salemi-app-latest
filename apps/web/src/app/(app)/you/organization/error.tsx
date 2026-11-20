"use client";

import { ErrorPanel } from "@/components/commerce/ErrorPanel";

export default function OrgError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorPanel title="Your organization didn’t load" body="Try again in a moment." onRetry={reset} />;
}
