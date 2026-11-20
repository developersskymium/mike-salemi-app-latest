"use client";

import { ScreenError } from "@/components/today/ScreenError";

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="Reminder history didn't load" reset={reset} />;
}
