"use client";

import { TrainingError } from "@/components/training/States";

export default function ProgramError({ reset }: { error: Error; reset: () => void }) {
  return <TrainingError title="This program didn't load" body="Check your connection, then try again." onRetry={reset} back="/programs" />;
}
