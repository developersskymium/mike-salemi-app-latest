"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "./Button";
import { haptic } from "./motion";

type Props = Omit<ButtonProps, "href" | "state" | "onClick"> & {
  /** Runs on press; the check draws itself once it resolves. */
  onComplete?: () => void | Promise<void>;
  /** Label shown after completion. */
  doneLabel?: string;
  done?: boolean;
};

/** Primary "Complete" action: spring press, then a self-drawing check and a soft pulse. */
export function CompleteButton({ onComplete, doneLabel = "Done", done: doneProp, children, icon = "check", ...rest }: Props) {
  const [done, setDone] = useState(Boolean(doneProp));
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...(rest as object)}
      icon={icon}
      state={done ? "success" : "idle"}
      aria-busy={busy || undefined}
      aria-live="polite"
      onClick={async () => {
        if (done || busy) return;
        setBusy(true);
        try {
          await onComplete?.();
          haptic(12);
          setDone(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      {done ? doneLabel : children}
    </Button>
  );
}
