"use client";

import { ScreenError } from "@/components/today/ScreenError";

export default function OnboardingError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Goal setting didn't load" reset={reset} />;
}
