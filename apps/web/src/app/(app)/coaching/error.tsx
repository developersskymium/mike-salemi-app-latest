"use client";

import { ErrorPanel } from "@/components/commerce/ErrorPanel";

export default function CoachingError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorPanel title="Coaching didn’t load" body="Your sessions are safe. Try again in a moment." onRetry={reset} />;
}
