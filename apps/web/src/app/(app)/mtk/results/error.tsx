"use client";

import { Button, EmptyState } from "@/components/ui";

export default function MtkError({ reset }: { error: Error; reset: () => void }) {
  return <EmptyState icon="steps" title="Your plan didn’t load" body="Check your connection and try again. Your progress is safe." action={<Button onClick={reset} variant="glass">Try again</Button>} />;
}
