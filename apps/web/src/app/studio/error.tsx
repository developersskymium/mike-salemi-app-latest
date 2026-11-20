"use client";

import { Button, EmptyState } from "@/components/ui";

export default function StudioError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Something went wrong" body={error.message || "The studio could not load this page."} action={<Button variant="filled" size="md" onClick={reset}>Try again</Button>} />
  );
}
