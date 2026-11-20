"use client";

import { ScreenError } from "@/components/today/ScreenError";

export default function TodayError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Today didn't load" reset={reset} />;
}
