"use client";

import { EmptyScene } from "@/components/graphics";
import { Button, EmptyState, Glass } from "@/components/ui";
import "./tpy.css";

/** Shared error state for Today, Plan and You routes: says what happened and offers a retry. */
export function ScreenError({ title, reset }: { title: string; reset: () => void }) {
  return (
    <Glass radius="card" style={{ marginTop: 24 }}>
      <EmptyState
        title={title}
        body="We couldn't reach your training data. Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={200} />}
        action={<Button icon="repeat" onClick={reset}>Try again</Button>}
      />
    </Glass>
  );
}
