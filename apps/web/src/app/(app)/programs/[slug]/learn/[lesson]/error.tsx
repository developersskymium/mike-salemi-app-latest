"use client";

import { TrainingError } from "@/components/training/States";

export default function DayError({ reset }: { error: Error; reset: () => void }) {
  return <TrainingError title="This day didn't load" body="Your progress is safe. Check your connection, then try again." onRetry={reset} back="/programs" />;
}
