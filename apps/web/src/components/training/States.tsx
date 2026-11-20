"use client";

import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import "./training.css";

/** Error state for training screens: says what happened and offers the fix. */
export function TrainingError({ title, body, onRetry, back }: { title: string; body: string; onRetry?: () => void; back?: string }) {
  return (
    <div className="trn-state" role="alert">
      <EmptyState
        title={title}
        body={body}
        illustration={<EmptyScene scene="offline" size={200} />}
        action={
          <div className="trn-state-actions">
            {onRetry && (
              <Button icon="repeat" onClick={onRetry}>
                Try again
              </Button>
            )}
            {back && (
              <Button variant="glass" href={back}>
                Go back
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}

export function TrainingNotFound() {
  return (
    <div className="trn-state">
      <EmptyState
        title="We couldn't find that"
        body="It may have moved, or the link is out of date."
        illustration={<EmptyScene scene="no-programs" size={200} />}
        action={<Button href="/programs">Browse programs</Button>}
      />
    </div>
  );
}
