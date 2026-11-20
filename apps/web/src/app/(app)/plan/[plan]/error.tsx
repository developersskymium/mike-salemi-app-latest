"use client";

import { ScreenError } from "@/components/today/ScreenError";

export default function PlanError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Your plan didn't load" reset={reset} />;
}
