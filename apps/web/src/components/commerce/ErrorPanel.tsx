"use client";

import { Button, EmptyState, Glass } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import "./commerce.css";

/** Error state for route error boundaries: what happened and the one way out. */
export function ErrorPanel({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  return (
    <div className="com-result">
      <Glass radius="card" className="com-result-card">
        <EmptyState illustration={<EmptyScene scene="offline" size={160} />} title={title} body={body} action={<Button variant="glass" size="md" icon="repeat" onClick={onRetry}>Try again</Button>} />
      </Glass>
    </div>
  );
}
